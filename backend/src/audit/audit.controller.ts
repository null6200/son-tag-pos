import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Post('log')
  async log(@Body() body: { action: string; userId?: string; branchId?: string; meta?: any }) {
    return this.audit.log(body);
  }
}
