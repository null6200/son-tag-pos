// Usage: node tools/delete-branch.js "Branch Name"
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  const branchName = process.argv[2] || 'Laze';
  try {
    const branch = await prisma.branch.findFirst({ where: { name: branchName } });
    if (!branch) {
      console.log(`Branch not found: ${branchName}`);
      process.exit(0);
    }
    const id = branch.id;
    console.log(`Deleting branch ${branchName} (${id}) and related data...`);

    await prisma.$transaction(async (tx) => {
      // Detach settings if present
      if (tx.setting) await tx.setting.updateMany({ where: { branchId: id }, data: { branchId: null } });

      // Delete child records by branchId across common models if they exist
      const tryDeleteMany = async (model, where) => {
        if (tx[model] && typeof tx[model].deleteMany === 'function') {
          await tx[model].deleteMany({ where });
        }
      };

      const modelsWithBranch = [
        // exclude 'user' and 'section' here; handle them in ordered steps
        'appRole', 'product', 'order', 'inventory', 'draft',
        'priceList', 'priceListEntry', 'expense', 'supplier', 'purchase', 'customer',
        'brand', 'category', 'subcategory', 'sectionFunction', 'productType', 'serviceType',
        'cashMovement', 'report', 'shift', 'attendance'
      ];

      // Delete refresh tokens for users in this branch (FK constraint)
      const usersInBranch = tx.user ? await tx.user.findMany({ where: { branchId: id }, select: { id: true } }) : [];
      const userIds = usersInBranch.map(u => u.id);
      if (tx.refreshToken && userIds.length > 0) {
        await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      }

      // Delete branch-scoped data excluding users/sections
      for (const m of modelsWithBranch) {
        await tryDeleteMany(m, { branchId: id });
      }

      // Delete users after their tokens and other dependent records
      if (tx.user && userIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }

      // Some join tables might reference sectionId or branchId indirectly
      // Best-effort cleanup of tables by sectionId for this branch
      const sections = (tx.section && await tx.section.findMany({ where: { branchId: id }, select: { id: true } })) || [];
      const sectionIds = sections.map(s => s.id);
      if (sectionIds.length > 0) {
        const tryBySection = async (model) => {
          if (tx[model] && typeof tx[model].deleteMany === 'function') {
            try { await tx[model].deleteMany({ where: { sectionId: { in: sectionIds } } }); } catch {}
          }
        };
        for (const m of ['table', 'priceList']) { await tryBySection(m); }
        // finally remove sections
        if (tx.section) await tx.section.deleteMany({ where: { id: { in: sectionIds } } });
      }

      // Finally delete the branch
      await tx.branch.delete({ where: { id } });
    });

    console.log('Completed branch deletion.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
