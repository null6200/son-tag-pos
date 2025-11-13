import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { UnitsService } from './units.service';

@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly svc: UnitsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_unit')
  list() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_unit')
  create(@Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_unit')
  update(@Param('id') _id: string, @Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_unit')
  remove(@Param('id') _id: string) { return this.svc.notImplemented(); }
}
