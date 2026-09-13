import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { BranchesService } from './branches.service';
import { Header } from '@nestjs/common';

class CreateBranchDto {
  name!: string;
  location!: string;
}

// Public, unauthenticated read-only endpoint for login page branch dropdown
@Controller('public/branches')
export class PublicBranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async listPublic() {
    const rows = await this.branchesService.findPublic();
    return rows.map((b: any) => ({ id: b.id, name: b.name }));
  }
}

class UpdateBranchDto {
  name?: string;
  location?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_branch_section')
  async list() {
    return this.branchesService.findAll();
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_branch_section')
  async create(@Body() dto: CreateBranchDto, @Req() req: any) {
    return this.branchesService.create(dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_branch_section')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @Req() req: any,
  ) {
    return this.branchesService.update(id, dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_branch_section')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.branchesService.remove(id, req.user?.role);
  }
}
