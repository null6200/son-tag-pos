import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { TaxRatesService } from './taxrates.service';

@UseGuards(JwtAuthGuard)
@Controller('tax-rates')
export class TaxRatesController {
  constructor(private readonly svc: TaxRatesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_tax_rate')
  list() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_tax_rate')
  create(@Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_tax_rate')
  update(@Param('id') _id: string, @Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_tax_rate')
  remove(@Param('id') _id: string) { return this.svc.notImplemented(); }
}
