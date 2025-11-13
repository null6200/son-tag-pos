import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { DefaultRolesSeeder } from './default-roles.seeder';

@Module({
  imports: [PrismaModule],
  providers: [RolesService, DefaultRolesSeeder],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
