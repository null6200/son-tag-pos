import { Body, Controller, Get, Put, Query, UseGuards, Post, UploadedFile, UseInterceptors, Res, Param } from '@nestjs/common';
import type { Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  get(@Query('branchId') branchId?: string) {
    return this.svc.get(branchId);
  }

  // Public read-only endpoint for branding before login
  @Get('public')
  getPublic(@Query('branchId') branchId?: string) {
    return this.svc.get(branchId);
  }

  @UseGuards(PermissionsGuard)
  @Put()
  @Permissions('edit_settings')
  set(@Body() dto: any) {
    // Pass-through of extended fields (businessName, currency, taxRate, logoUrl, address, phone, email)
    return this.svc.set(dto || {});
  }

  // Upload logo file and return a URL that this backend can serve
  @UseGuards(PermissionsGuard)
  @Post('logo')
  @Permissions('edit_settings')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = path.resolve(process.cwd(), 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.bin';
        const name = `logo_${Date.now()}${ext}`;
        cb(null, name);
      }
    })
  }))
  uploadLogo(@UploadedFile() file: any) {
    if (!file) return { ok: false, message: 'No file uploaded' } as any;
    const url = `/api/settings/logo/${encodeURIComponent(file.filename)}`;
    return { ok: true, url, filename: file.filename };
  }

  // Serve uploaded logos
  @Get('logo/:name')
  async serveLogo(@Param('name') name: string, @Res() res: Response) {
    const filePath = path.resolve(process.cwd(), 'uploads', name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Not found');
    }
    return res.sendFile(filePath);
  }
}
