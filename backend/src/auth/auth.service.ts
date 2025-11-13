import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { add } from 'date-fns';

interface RegisterDto {
  username: string;
  email: string;
  password: string;
  branchName?: string;
  branchLocation?: string;
}

interface LoginDto {
  username: string; // or email
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private static failures = new Map<string, { count: number; until?: number }>();
  private maxFailures() { return Number(process.env.LOGIN_MAX_FAILURES || 5); }
  private lockMinutes() { return Number(process.env.LOGIN_LOCK_MINUTES || 15); }
  private key(username: string, ip?: string) { return `${username}|${ip || ''}`; }
  private isLocked(username: string, ip?: string) {
    const k = this.key(username, ip);
    const rec = AuthService.failures.get(k);
    if (!rec) return false;
    if (rec.until && Date.now() < rec.until) return true;
    if (rec.until && Date.now() >= rec.until) { AuthService.failures.delete(k); }
    return false;
  }
  private markFailure(username: string, ip?: string) {
    const k = this.key(username, ip);
    const rec = AuthService.failures.get(k) || { count: 0 };
    rec.count += 1;
    if (rec.count >= this.maxFailures()) {
      rec.until = Date.now() + this.lockMinutes() * 60 * 1000;
    }
    AuthService.failures.set(k, rec);
  }
  private clearFailures(username: string, ip?: string) { AuthService.failures.delete(this.key(username, ip)); }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Username or email already exists');

    // Ensure only one default branch exists
    let branchId: string | undefined = undefined;
    const totalBranches = await this.prisma.branch.count();
    const desiredName = dto.branchName?.trim();
    const desiredLoc = dto.branchLocation || '';
    if (totalBranches === 0) {
      // Fresh instance: create the first and only branch if a name provided, otherwise let bootstrap have created one
      if (desiredName) {
        const b = await this.prisma.branch.create({ data: { name: desiredName, location: desiredLoc } });
        branchId = b.id;
      }
    } else if (totalBranches === 1) {
      // Single existing branch: update its name/location if user provided a name, to avoid creating a second branch
      const existing = await this.prisma.branch.findFirst({});
      if (existing) {
        branchId = existing.id;
        if (desiredName && existing.name !== desiredName) {
          await this.prisma.branch.update({ where: { id: existing.id }, data: { name: desiredName, location: desiredLoc } });
        }
      }
    } else {
      // Multiple branches exist: do not create new; try to attach to a branch with the provided name, else use the first
      if (desiredName) {
        const match = await this.prisma.branch.findFirst({ where: { name: desiredName } });
        if (match) branchId = match.id;
      }
      if (!branchId) {
        const first = await this.prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } as any });
        branchId = first?.id;
      }
    }

    // Seed settings for the chosen branch if missing
    if (branchId && desiredName) {
      try {
        await this.prisma.setting.create({ data: { branchId, businessName: desiredName, currency: (dto as any).currency || 'USD' } as any });
      } catch {}
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: 'ADMIN',
        branchId,
      },
    });

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.username, user.role, undefined, undefined);
    return { token: accessToken, refreshToken, user } as any;
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.username }] },
      select: { id: true, username: true, role: true, passwordHash: true, preferences: true }
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (this.isLocked(dto.username, ip)) throw new UnauthorizedException('Account temporarily locked');
    const prefs = (user.preferences as any) || {};
    if (prefs && prefs.allowLogin === false) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) { this.markFailure(dto.username, ip); throw new UnauthorizedException('Invalid credentials'); }
    this.clearFailures(dto.username, ip);
    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.username, user.role, undefined, undefined);
    return { token: accessToken, refreshToken, user } as any;
  }

  private accessSecret() { return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'devsecret'; }
  private refreshSecret() { return process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}_refresh` : 'devsecret_refresh'); }
  private accessTtlSeconds() { return Number(process.env.ACCESS_TTL_SECONDS || 1800); }
  private refreshTtlDays() { return Number(process.env.REFRESH_TTL_DAYS || '7'); }
  private idleTimeoutMinutes() { return Number(process.env.IDLE_TIMEOUT_MINUTES || '60'); }

  private async issueTokens(userId: string, username: string, role: string, userAgent?: string, ipAddress?: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, username, role }, { secret: this.accessSecret(), expiresIn: this.accessTtlSeconds() });
    // Create rotating refresh token (opaque random string signed as JWT for integrity)
    const refreshPayload = { sub: userId, jti: cryptoRandom(), type: 'refresh' } as any;
    const refreshExpires = add(new Date(), { days: this.refreshTtlDays() });
    const refreshToken = await this.jwt.signAsync(refreshPayload, { secret: this.refreshSecret(), expiresIn: this.refreshTtlDays() * 24 * 60 * 60 });
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash: hash, userAgent: userAgent || null, ipAddress: ipAddress || null, expiresAt: refreshExpires } as any });
    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(currentToken: string, userAgent?: string, ipAddress?: string) {
    // Verify structure and signature first
    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(currentToken, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const userId = String(decoded.sub || '');
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    // Find a matching stored hash (linear scan by user limited to recent, or attempt hash compare over user's active tokens)
    const tokens = await this.prisma.refreshToken.findMany({ where: { userId, revoked: false } });
    const now = new Date();
    const idleCutoff = new Date(now.getTime() - this.idleTimeoutMinutes() * 60 * 1000);
    let match: any = null;
    for (const t of tokens) {
      const ok = await bcrypt.compare(currentToken, t.tokenHash);
      if (ok) { match = t; break; }
    }
    if (!match) throw new UnauthorizedException('Refresh token not recognized');
    if (match.expiresAt <= now) throw new UnauthorizedException('Refresh token expired');
    if (new Date(match.lastUsedAt) < idleCutoff) throw new UnauthorizedException('Session idle timeout');

    // Revoke current and issue new
    await this.prisma.refreshToken.update({ where: { id: match.id }, data: { revoked: true, lastUsedAt: now } });

    // Load user for claims
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, role: true } });
    if (!user) throw new UnauthorizedException('User not found');
    const next = await this.issueTokens(user.id, user.username, user.role as any, userAgent, ipAddress);
    return next;
  }

  async revokeRefreshToken(currentToken: string) {
    try {
      const decoded: any = await this.jwt.verifyAsync(currentToken, { secret: this.refreshSecret() });
      const userId = String(decoded.sub || '');
      if (!userId) return;
      const tokens = await this.prisma.refreshToken.findMany({ where: { userId, revoked: false } });
      for (const t of tokens) {
        const ok = await bcrypt.compare(currentToken, t.tokenHash);
        if (ok) {
          await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
          break;
        }
      }
    } catch {}
  }
}

function cryptoRandom() {
  // lightweight random string
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}


// AuthService will be replaced with Supabase Auth logic in controller
