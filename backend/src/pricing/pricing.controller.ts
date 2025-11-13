import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PricingService } from './pricing.service';

@UseGuards(JwtAuthGuard)
@Controller('prices')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  // Allow any authenticated user (e.g., POS cashiers) to fetch effective prices
  @Get()
  async effective(
    @Query('branchId') branchId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.pricing.getEffectivePrices(branchId, sectionId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly pricing: PricingService) {}

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('section_pricing')
  async create(@Body() body: { name: string; branchId: string; sectionId?: string; active?: boolean }, @Req() req: any) {
    return this.pricing.createPriceList(body, req.user?.role);
  }

  // Upsert multiple entries, creating an active list for branch/section if priceListId absent
  @UseGuards(PermissionsGuard)
  @Post('entries')
  @Permissions('section_pricing')
  async upsertEntries(
    @Body()
    body: {
      priceListId?: string;
      branchId: string;
      sectionId?: string;
      entries: Array<{ productId: string; price: string }>;
    },
    @Req() req: any,
  ) {
    let priceListId = body.priceListId;
    if (!priceListId) {
      const pl = await this.pricing.ensureActivePriceList(body.branchId, body.sectionId, req.user?.role);
      priceListId = pl.id;
    }

    const results = [] as any[];
    for (const e of (body.entries || [])) {
      results.push(
        await this.pricing.upsertPriceEntry({ priceListId, productId: e.productId, price: e.price }, req.user?.role),
      );
    }
    return { priceListId, entries: results };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { ok: true, id };
  }
}
