import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DefaultRolesSeeder implements OnModuleInit {
  private readonly logger = new Logger(DefaultRolesSeeder.name);
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const branches = await this.prisma.branch.findMany({ select: { id: true, name: true } });
      for (const b of branches) {
        // Core Admin role: full permissions via wildcard
        const admin = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Admin' } });
        if (!admin) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Admin',
              permissions: ['all', 'manage_override_pin'],
            },
          });
          this.logger.log(`Created default Admin role for branch ${b.name}`);
        } else if (!Array.isArray(admin.permissions) || admin.permissions.length === 0) {
          await this.prisma.appRole.update({
            where: { id: admin.id },
            data: { permissions: ['all', 'manage_override_pin'] },
          });
          this.logger.log(`Updated existing Admin role permissions for branch ${b.name}`);
        }

        // Waiter: can access POS, create/update own orders, but cannot handle payments or destructive cart ops
        const waiter = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Waiter' } });
        if (!waiter) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Waiter',
              permissions: [
                'view_pos_sell',
                'add_pos_sell',
              ],
            },
          });
          this.logger.log(`Created default Waiter role for branch ${b.name}`);
        }

        // Cashier: POS access + can load drafts, print/collect payments
        const cashier = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Cashier' } });
        if (!cashier) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Cashier',
              permissions: [
                'view_pos_sell',
                'add_pos_sell',
                'edit_pos_sell',
                'view_drafts_all',
                'add_payment',
                'print_bill',
                'open_shift_register',
              ],
            },
          });
          this.logger.log(`Created default Cashier role for branch ${b.name}`);
        }

        // Supervisor: can manage any draft/cart, including decreases and clears
        const supervisor = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Supervisor' } });
        if (!supervisor) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Supervisor',
              permissions: [
                'view_pos_sell',
                'add_pos_sell',
                'edit_pos_sell',
                'delete_pos_sell',
                'view_drafts_all',
                'add_payment',
                'open_shift_register',
              ],
            },
          });
          this.logger.log(`Created default Supervisor role for branch ${b.name}`);
        }

        // Inventory: manage stock and products
        const inventory = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Inventory' } });
        if (!inventory) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Inventory',
              permissions: [
                'inventory',
                'product_management',
              ],
            },
          });
          this.logger.log(`Created default Inventory role for branch ${b.name}`);
        }

        // Accountant: can see all sales and do all POS operations
        const accountant = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Accountant' } });
        if (!accountant) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Accountant',
              permissions: [
                'view_pos_sell',
                'add_pos_sell',
                'edit_pos_sell',
                'delete_pos_sell',
                'view_drafts_all',
                'add_payment',
                'view_sales_all',
              ],
            },
          });
          this.logger.log(`Created default Accountant role for branch ${b.name}`);
        }

        // Manager: everything Accountant + Inventory + settings / user/table management
        const manager = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Manager' } });
        if (!manager) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Manager',
              permissions: [
                // POS core
                'view_pos_sell',
                'add_pos_sell',
                'edit_pos_sell',
                'delete_pos_sell',
                'view_drafts_all',
                'add_payment',
                'view_sales_all',
                'open_shift_register',
                // Inventory / products
                'inventory',
                'product_management',
                // Settings / configuration / staff
                'settings',
                'edit_settings',
                'view_user',
                'edit_tables',
              ],
            },
          });
          this.logger.log(`Created default Manager role for branch ${b.name}`);
        }
      }
    } catch (e) {
      this.logger.warn(`DefaultRolesSeeder skipped: ${e?.message || e}`);
    }
  }
}
