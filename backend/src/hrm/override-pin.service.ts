import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OverridePinService {
  constructor(private prisma: PrismaService) {}

  async get(branchId: string) {
    if (!branchId) throw new BadRequestException('branchId required');
    const branch = await (this.prisma as any).branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    return {
      hasPin: !!branch.overridePinHash,
      graceSeconds: branch.overridePinGraceSeconds ?? 5,
    };
  }

  async set(branchId: string, pin: string, graceSeconds?: number) {
    if (!branchId) throw new BadRequestException('branchId required');
    const hash = pin ? await bcrypt.hash(pin, 10) : null;
    const updated = await (this.prisma as any).branch.update({
      where: { id: branchId },
      data: {
        overridePinHash: hash,
        ...(typeof graceSeconds === 'number' ? { overridePinGraceSeconds: graceSeconds } : {}),
      },
    });
    return { ok: true, hasPin: !!updated.overridePinHash, graceSeconds: updated.overridePinGraceSeconds };
  }

  async verify(branchId: string | undefined, pin: string) {
    if (!branchId) {
      const first = await (this.prisma as any).branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId required');
    const branch = await (this.prisma as any).branch.findUnique({ where: { id: branchId } });
    if (!branch?.overridePinHash) return { ok: false };
    const ok = await bcrypt.compare(pin || '', branch.overridePinHash);
    return { ok, graceSeconds: branch.overridePinGraceSeconds ?? 5 };
  }

  // Per-user override PINs -------------------------------------------------

  async setUserPin(userId: string, branchId: string | undefined, pin: string) {
    if (!userId) throw new BadRequestException('userId required');
    // If branchId omitted, store a global override PIN for the user (branchId null)
    const hash = pin ? await bcrypt.hash(pin, 10) : null;
    if (!hash) {
      // Clearing PIN: delete any existing record
      await (this.prisma as any).userOverridePin.deleteMany({ where: { userId, branchId: branchId || null } });
      return { ok: true, hasPin: false };
    }
    const upserted = await (this.prisma as any).userOverridePin.upsert({
      where: {
        userId_branchId: {
          userId,
          branchId: branchId || null,
        },
      },
      update: { pinHash: hash },
      create: {
        userId,
        branchId: branchId || null,
        pinHash: hash,
      },
    });
    return { ok: true, hasPin: !!upserted.pinHash };
  }

  async verifyUserPin(userId: string, branchId: string | undefined, pin: string) {
    if (!userId) throw new BadRequestException('userId required');
    // For now, treat override PIN as per-user (global) regardless of branch.
    // This avoids branchId mismatches causing a correct PIN to fail.
    const rec = await (this.prisma as any).userOverridePin.findFirst({ where: { userId } });
    if (!rec?.pinHash) return { ok: false };
    const ok = await bcrypt.compare(pin || '', rec.pinHash);
    return { ok };
  }
}
