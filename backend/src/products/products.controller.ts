import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { diskStorage } from 'multer';
import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ProductsService } from './products.service';

class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsString()
  price!: string; // decimal string

  @IsOptional()
  @IsString()
  taxRate?: string; // decimal string

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  productTypeId?: string;

  @IsOptional()
  @IsString()
  productTypeName?: string;

  @IsOptional()
  @IsString()
  initialSectionId?: string;

  @IsOptional()
  @IsString()
  initialQty?: string;
}

class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  taxRate?: string;

  @IsOptional()
  @IsString()
  productTypeId?: string | null;

  @IsOptional()
  @IsString()
  productTypeName?: string | null;
}

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_product')
  async list(@Query('branchId') branchId?: string, @Query('includeArchived') includeArchived?: string) {
    const inc = includeArchived === 'true' || includeArchived === '1';
    return this.products.list(branchId, inc);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_product')
  async create(@Body() dto: CreateProductDto, @Req() req: any) {
    const effective = { ...dto } as any;
    if (!effective.branchId && req?.user?.branchId) {
      effective.branchId = String(req.user.branchId);
    }
    return this.products.create(effective, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_product')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.products.update(id, dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/image')
  @Permissions('edit_product')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const root = resolve(process.cwd(), 'uploads');
          const dir = join(root, 'products');
          try {
            if (!existsSync(root)) mkdirSync(root);
            if (!existsSync(dir)) mkdirSync(dir);
          } catch {}
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const name = (file.originalname || 'image').replace(/[^a-zA-Z0-9_.-]/g, '_');
          const ts = Date.now();
          const finalName = `${ts}_${name}`;
          cb(null, finalName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/products/${file.filename}`;
    await this.products['prisma'].product.update({ where: { id }, data: { imageUrl: url } } as any);
    return { url } as any;
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_product')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.products.remove(id, req.user?.role);
  }
}
