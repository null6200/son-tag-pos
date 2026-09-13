import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

function cookieOrAuthExtractor(req: Request): string | null {
  // Authorization header
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  // Cookie
  const cookie = req.headers['cookie'];
  if (cookie) {
    const match = cookie.match(/access_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieOrAuthExtractor]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'devsecret',
    });
  }

  async validate(payload: any) {
    // Enrich with branchId from DB for controllers that default to req.user.branchId
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: String(payload.sub) },
        select: { id: true, username: true, role: true, branchId: true },
      });
      let branchId = user?.branchId || null;
      if (!branchId) {
        const firstBranch = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
        branchId = firstBranch?.id || null;
      }
      return { userId: payload.sub, username: payload.username, role: payload.role, branchId };
    } catch {
      return { userId: payload.sub, username: payload.username, role: payload.role };
    }
  }
}


// JWT strategy removed for Supabase Auth
