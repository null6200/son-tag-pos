const { PrismaClient } = require('../node_modules/@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error listing users:', e?.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
