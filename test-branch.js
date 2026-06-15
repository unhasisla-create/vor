const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const branch = await prisma.branch.findFirst({ where: { code: 'LBDG' } });
    if (!branch) {
      console.log('LBDG not found');
      return;
    }
    console.log('Found branch:', branch);

    const updated = await prisma.branch.update({
      where: { id: branch.id },
      data: { code: 'LJKT', name: 'Logistik Jakarta' }
    });
    console.log('Updated branch:', updated);
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
