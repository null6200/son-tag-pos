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
}
