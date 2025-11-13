import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user?.userId as string;
    if (!userId) throw new UnauthorizedException();
    return this.usersService.findById(userId);
  }

  // Preferences
  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user?.userId as string;
    return this.usersService.getPreferences(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/preferences')
  async updatePreferences(@Req() req: any, @Body() body: any) {
    const userId = req.user?.userId as string;
    return this.usersService.updatePreferences(userId, body || {});
  }

  // Runtime flags
  @UseGuards(JwtAuthGuard)
  @Get('me/runtime')
  async getRuntime(@Req() req: any) {
    const userId = req.user?.userId as string;
    return this.usersService.getRuntime(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/runtime')
  async updateRuntime(@Req() req: any, @Body() body: any) {
    const userId = req.user?.userId as string;
    return this.usersService.updateRuntime(userId, body || {});
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('view_user')
  async list(@Query('branchId') branchId?: string, @Query('includeArchived') includeArchived?: string) {
    const inc = includeArchived === 'true' || includeArchived === '1';
    return this.usersService.list(branchId, inc);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('add_user')
  async create(@Body() dto: any, @Req() req: any) {
    return this.usersService.create(dto, req.user?.role);
  }

  // Verify a service staff PIN for the selected user
  @UseGuards(JwtAuthGuard)
  @Post('verify-pin')
  async verifyPin(@Body() body: { userId: string; pin: string }) {
    const userId = String(body?.userId || '');
    const pin = String(body?.pin || '');
    return this.usersService.verifyServicePin(userId, pin);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions('edit_user')
  async update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.usersService.update(id, dto, req.user?.role);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_user')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req.user?.role);
  }
}
