// Backfill per-branch SKUs as 3+ digit zero-padded numeric strings (001, 002, ..., 1000, ...)
// Overwrites ALL existing SKUs as requested. Sets Branch.nextSkuSeq accordingly.
// Usage: node backend/scripts/backfill-skus.js

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
    for (const b of branches) {
      // Deterministic ordering: createdAt then name then id
      const products = await prisma.product.findMany({
        where: { branchId: b.id },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      console.log(`[backfill-skus] branch=${b.name} (${b.id}) products=${products.length}`);
      let seq = 0;
      // Chunk updates to avoid huge single transaction if large dataset
      const chunkSize = 200;
      for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        await prisma.$transaction(async (tx) => {
          for (const p of chunk) {
            seq += 1;
            const sku = String(seq).padStart(3, '0');
            await tx.product.update({ where: { id: p.id }, data: { sku } });
          }
        });
        console.log(`[backfill-skus] updated ${Math.min(i + chunkSize, products.length)}/${products.length} for branch ${b.name}`);
      }
      await prisma.branch.update({ where: { id: b.id }, data: { nextSkuSeq: seq } });
      console.log(`[backfill-skus] branch ${b.name} nextSkuSeq=${seq}`);
    }
    console.log('[backfill-skus] Completed');
  } catch (e) {
    console.error('[backfill-skus] Failed', e);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }
}

main();
