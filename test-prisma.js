const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        branch: { select: { code: true, name: true } },
        _count: { select: { vehicles: true } },
      },
      orderBy: [{ code: 'asc' }],
    });
    console.log("DRIVERS:", drivers);
  } catch (e) {
    console.error("ERROR FETCHING DRIVERS:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
