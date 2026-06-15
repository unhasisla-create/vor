const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function run() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RevenueRecord";')
  console.log('Truncated RevenueRecord')
}
run().catch(console.error).finally(() => prisma.$disconnect())
