// Usage:
//   node tools/clear-transactional.js            # dry run: prints what WOULD be deleted
//   node tools/clear-transactional.js --yes      # actually delete
//
// Clears order + stock-movement history. Keeps users, branches, catalog,
// config, shifts and audit log. Resets branch order/receipt counters to 0.
const { PrismaClient } = require('@prisma/client');

const APPLY = process.argv.includes('--yes');

(async () => {
  const prisma = new PrismaClient();
  try {
    const counts = {
      saleEvent: await prisma.saleEvent.count(),
      payment: await prisma.payment.count(),
      salesReturn: await prisma.salesReturn.count(),
      orderItem: await prisma.orderItem.count(),
      order: await prisma.order.count(),
      stockMovement: await prisma.stockMovement.count(),
      draftsLinkedToOrders: await prisma.draft.count({ where: { orderId: { not: null } } }),
    };
    console.log(`Mode: ${APPLY ? 'APPLY (deleting)' : 'DRY RUN (no changes)'}`);
    console.log('Rows in scope:');
    for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(24)} ${v}`);

    if (!APPLY) {
      console.log('\nRe-run with --yes to delete.');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Detach any drafts that point at orders we're about to remove
      await tx.draft.updateMany({ where: { orderId: { not: null } }, data: { orderId: null } });

      // Children first, then orders, then independent history
      await tx.saleEvent.deleteMany({});
      await tx.payment.deleteMany({});
      await tx.salesReturn.deleteMany({});
      await tx.orderItem.deleteMany({});
      await tx.order.deleteMany({});
      await tx.stockMovement.deleteMany({});

      // Restart per-branch numbering
      await tx.branch.updateMany({ data: { nextOrderSeq: 0, nextReceiptSeq: 0 } });
    });

    console.log('\nDone. Post-delete counts:');
    for (const m of ['saleEvent', 'payment', 'salesReturn', 'orderItem', 'order', 'stockMovement']) {
      console.log(`  ${m.padEnd(24)} ${await prisma[m].count()}`);
    }
    const branches = await prisma.branch.findMany({ select: { name: true, nextOrderSeq: true, nextReceiptSeq: true } });
    for (const b of branches) console.log(`  branch ${b.name}: nextOrderSeq=${b.nextOrderSeq} nextReceiptSeq=${b.nextReceiptSeq}`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
