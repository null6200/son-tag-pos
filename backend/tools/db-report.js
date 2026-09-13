// Usage: node tools/db-report.js
// Read-only. Prints row counts for every table so you can decide what to clear.
const { PrismaClient } = require('@prisma/client');

const GROUPS = {
  'Accounts & org (KEEP)': [
    'user', 'branch', 'appRole', 'employeeProfile', 'userOverridePin', 'refreshToken',
  ],
  'Catalog & config (KEEP)': [
    'product', 'inventory', 'sectionInventory', 'section', 'sectionFunction', 'productType',
    'productTypeAllowedFunction', 'table', 'priceList', 'priceEntry', 'category', 'subcategory',
    'brand', 'supplier', 'serviceType', 'discount', 'customer', 'setting',
  ],
  'Transactional (candidates to CLEAR)': [
    'order', 'orderItem', 'payment', 'salesReturn', 'saleEvent', 'draft',
    'stockMovement', 'shift', 'expense',
    'purchase', 'purchaseItem', 'purchasePayment', 'purchaseReturn',
    'auditLog',
  ],
  'HRM activity (ask before clearing)': [
    'attendance', 'shiftAssignment', 'leaveRequest',
  ],
};

(async () => {
  const prisma = new PrismaClient();
  try {
    for (const [group, models] of Object.entries(GROUPS)) {
      console.log(`\n=== ${group} ===`);
      for (const m of models) {
        if (!prisma[m] || typeof prisma[m].count !== 'function') {
          console.log(`  ${m.padEnd(28)} (model not found)`);
          continue;
        }
        const n = await prisma[m].count();
        console.log(`  ${m.padEnd(28)} ${n}`);
      }
    }
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, nextOrderSeq: true, nextReceiptSeq: true },
    });
    console.log('\n=== Branch sequence counters ===');
    for (const b of branches) {
      console.log(`  ${b.name.padEnd(24)} nextOrderSeq=${b.nextOrderSeq} nextReceiptSeq=${b.nextReceiptSeq}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
