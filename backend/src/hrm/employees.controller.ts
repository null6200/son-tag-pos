import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { EmployeesService } from './employees.service';

@UseGuards(JwtAuthGuard)
@Controller('hrm/employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_employee')
  async list(@Query('branchId') branchId: string, @Query('q') q?: string) {
    return this.employees.list(branchId, q);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_employee')
  async create(@Body() body: { userId: string; branchId: string; jobTitle?: string; hourlyRate?: number; hireDate?: string }) {
    const hireDate = body.hireDate ? new Date(body.hireDate) : undefined;
    return this.employees.create({ ...body, hireDate });
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_employee')
  async update(@Param('id') id: string, @Body() body: { status?: string; jobTitle?: string; hourlyRate?: number; terminationDate?: string | null }) {
    const terminationDate = body.terminationDate === undefined ? undefined : (body.terminationDate ? new Date(body.terminationDate) : null);
    return this.employees.update(id, { ...body, terminationDate });
  }

  @UseGuards(PermissionsGuard)
  @Put(':id/pin')
  @Permissions('update_override_pin')
  async setPin(@Param('id') id: string, @Body() body: { pin?: string }, @Req() req: any) {
    return this.employees.setPin(id, body.pin, req.user?.role);
  }
}
