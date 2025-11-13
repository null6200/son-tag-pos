import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesController, PublicCategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController, PublicCategoriesController],
  providers: [CategoriesService, PrismaService],
})
export class CategoriesModule {}
