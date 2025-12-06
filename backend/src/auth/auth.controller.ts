import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';

class RegisterDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  // at least one upper, one lower, one digit
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: 'Password too weak' })
  password?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  branchLocation?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  password?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const username = dto.username || (dto.email ? dto.email.split('@')[0] : undefined) || (dto.fullName ? String(dto.fullName).replace(/\s+/g, '').toLowerCase() : undefined);
    const email = dto.email as string;
    const password = dto.password as string;
    const branchName = dto.branchName;
    const branchLocation = dto.branchLocation;
    const { token, refreshToken, user } = await this.auth.register({ username: String(username), email, password, branchName, branchLocation } as any);
    setAuthCookies(res, token, refreshToken);
    return { token, user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const usernameOrEmail = dto.username || dto.email;
    const password = dto.password as string;
    const ua = req.headers['user-agent'] as string | undefined;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined;
    const { token, refreshToken, user } = await this.auth.login({ username: String(usernameOrEmail), password } as any, ip);
    setAuthCookies(res, token, refreshToken);
    return { token, user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    // best-effort revoke current refresh if present
    const rt = getCookie(req, 'refresh_token');
    if (rt) { try { await this.auth.revokeRefreshToken(rt); } catch {} }

    // Attempt to resolve user from access token for logging
    const at = getCookie(req, 'access_token');
    if (at) {
      try {
        const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'devsecret';
        const decoded: any = await this.jwt.verifyAsync(at, { secret });
        const userId = decoded?.sub ? String(decoded.sub) : undefined;
        if (userId) {
          await this.audit.log({
            action: 'Logout',
            userId,
            meta: {
              subjectType: 'User',
              note: 'User logged out',
            },
          });
        }
      } catch {
        // ignore failures; logout should still succeed
      }
    }
    clearAuthCookies(res);
    return { ok: true };
  }

  @Post('refresh')
  async refresh(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const current = getCookie(req, 'refresh_token');
    if (!current) return { ok: false, error: 'No refresh token' };
    const ua = req.headers['user-agent'] as string | undefined;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined;
    const next = await this.auth.rotateRefreshToken(current, ua, ip);
    setAuthCookies(res, next.accessToken, next.refreshToken);
    return { ok: true } as any;
  }

  // Lightweight activity ping: used by frontend to keep idle timeout from expiring
  // while the user is actively using the app. Does not rotate tokens; only bumps
  // lastUsedAt on the matching refresh token if present.
  @UseGuards(JwtAuthGuard)
  @Post('ping')
  async ping(@Req() req: Request) {
    const current = getCookie(req, 'refresh_token');
    if (current) {
      try { await this.auth.touchRefreshToken(current); } catch {} // best-effort only
    }
    return { ok: true } as any;
  }
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const common = { httpOnly: true, secure: isProd, sameSite: (isProd ? 'none' : 'lax'), path: '/' } as any;
  // Access: 2 hours (matches ACCESS_TTL_SECONDS default)
  res.cookie('access_token', accessToken, { ...common, maxAge: 2 * 60 * 60 * 1000 });
  // Refresh: 1 day (strict)
  res.cookie('refresh_token', refreshToken, { ...common, maxAge: 1 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

function getCookie(req: Request, key: string): string | undefined {
  const cookie = req.headers['cookie'];
  if (!cookie) return undefined;
  const re = new RegExp(`${key}=([^;]+)`);
  const m = cookie.match(re);
  return m ? decodeURIComponent(m[1]) : undefined;
}
