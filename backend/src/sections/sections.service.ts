import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async listByBranch(branchId: string) {
    const rows = await this.prisma.section.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });
    if (rows.length === 0) {
      const created = await this.prisma.section.create({
        data: { branchId, name: 'Main' },
      });
      return [created];
    }
    return rows;
  }

  async create(dto: { branchId: string; name: string; description?: string; function?: string; sectionFunctionId?: string }, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    let sectionFunctionId: string | undefined = dto.sectionFunctionId;
    if (sectionFunctionId) {
      const fn = await this.prisma.sectionFunction.findUnique({ where: { id: sectionFunctionId } });
      if (!fn) throw new NotFoundException('Section function not found');
      if (fn.branchId !== dto.branchId) throw new ForbiddenException('Section function belongs to a different branch');
    }
    return this.prisma.section.create({ data: {
      branchId: dto.branchId,
      name: dto.name,
      description: dto.description ?? null,
      sectionFunctionId: sectionFunctionId ?? null,
      // legacy compatibility
      function: dto.function ?? null,
    }});
  }

  async update(id: string, dto: { name?: string; description?: string; function?: string; sectionFunctionId?: string }, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const existing = await this.prisma.section.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');
    let sectionFunctionId: string | null | undefined = undefined;
    if (dto.sectionFunctionId !== undefined) {
      if (dto.sectionFunctionId === null || dto.sectionFunctionId === '') {
        sectionFunctionId = null;
      } else {
        const fn = await this.prisma.sectionFunction.findUnique({ where: { id: dto.sectionFunctionId } });
        if (!fn) throw new NotFoundException('Section function not found');
        if (fn.branchId !== existing.branchId) throw new ForbiddenException('Section function belongs to a different branch');
        sectionFunctionId = fn.id;
      }
    }
    return this.prisma.section.update({ where: { id }, data: {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.function !== undefined ? { function: dto.function } : {}),
      ...(sectionFunctionId !== undefined ? { sectionFunctionId } : {}),
    }});
  }

  async remove(id: string, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const existing = await this.prisma.section.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');
    return this.prisma.section.delete({ where: { id } });
  }

  async allowedForProductType(branchId: string, productTypeId?: string) {
    // If no productType specified, return all sections for branch
    if (!productTypeId) {
      return this.prisma.section.findMany({ where: { branchId }, orderBy: { name: 'asc' } });
    }
    // Load allowed section function ids for this product type
    const links = await this.prisma.productTypeAllowedFunction.findMany({
      where: { productTypeId },
      select: { sectionFunctionId: true },
    });
    const allowed = links.map(l => l.sectionFunctionId).filter(Boolean) as string[];
    // If no restrictions configured, return all sections for branch
    if (allowed.length === 0) {
      return this.prisma.section.findMany({ where: { branchId }, orderBy: { name: 'asc' } });
    }
    // Backward-compatibility: also allow sections whose legacy `function` string matches
    // the names of allowed SectionFunction entries (in case sectionFunctionId not set yet)
    const funcs = await this.prisma.sectionFunction.findMany({
      where: { id: { in: allowed }, branchId },
      select: { id: true, name: true },
    });
    const allowedNames = funcs.map(f => (f.name || '').trim()).filter(Boolean) as string[];
    const orConds: any[] = [];
    if (allowed.length > 0) orConds.push({ sectionFunctionId: { in: allowed } });
    const nameVariants = new Set<string>();
    for (const nm of allowedNames) {
      const base = nm.replace(/\s*production\s*$/i, '').trim();
      const baseLc = base.toLowerCase();
      const prodForm = `${base} production`;
      const revProdForm = `production ${base}`;
      const underscore = (s: string) => s.replace(/\s+/g, '_');
      const hyphen = (s: string) => s.replace(/\s+/g, '-');

      // canonical forms
      [nm, base, prodForm, revProdForm].forEach(v => { if (v) nameVariants.add(v); });
      // lowercase simple
      [nm.toLowerCase(), baseLc, prodForm.toLowerCase(), revProdForm.toLowerCase()].forEach(v => { if (v) nameVariants.add(v); });
      // underscore variants
      [underscore(baseLc), underscore(prodForm.toLowerCase()), underscore(revProdForm.toLowerCase())].forEach(v => { if (v) nameVariants.add(v); });
      // hyphen variants
      [hyphen(baseLc), hyphen(prodForm.toLowerCase()), hyphen(revProdForm.toLowerCase())].forEach(v => { if (v) nameVariants.add(v); });
    }
    for (const v of nameVariants) {
      if (v) {
        orConds.push({ function: { equals: v, mode: 'insensitive' as const } });
        orConds.push({ function: { contains: v, mode: 'insensitive' as const } });
        // as a final compatibility layer, try section name contains as well
        orConds.push({ name: { contains: v, mode: 'insensitive' as const } });
      }
    }
    const rows = await this.prisma.section.findMany({
      where: {
        branchId,
        OR: orConds.length > 0 ? orConds : undefined,
      },
      orderBy: { name: 'asc' },
    });
    // debug: log filtering inputs and outputs (safe: IDs and names only)
    try {
      console.log('[sections.allowedForProductType]', {
        branchId,
        productTypeId,
        allowedFunctionIds: allowed,
        allowedFunctionNames: Array.from(nameVariants),
        resultCount: rows.length,
        sectionIds: rows.map(r => r.id),
      });
    } catch {}
    return rows;
  }
}
