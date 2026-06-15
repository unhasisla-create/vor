const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.auditLog.updateMany({
    where: { detail: { contains: 'superadmin', mode: 'insensitive' } },
    data: { detail: 'Database demo PostgreSQL disiapkan dengan role Admin, Planner, Supervisor, dan Management.' },
  })

  const [branches, users, vehicles, actuals, forecasts, audits, superUsers, roles] = await Promise.all([
    prisma.branch.count(),
    prisma.user.count(),
    prisma.vehicle.count(),
    prisma.actualOperation.count(),
    prisma.forecastOperation.count(),
    prisma.auditLog.count(),
    prisma.user.findMany({ where: { username: 'superadmin' } }),
    prisma.$queryRawUnsafe(
      "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'Role' ORDER BY enumsortorder"
    ),
  ])

  console.log(JSON.stringify({
    branches,
    users,
    vehicles,
    actuals,
    forecasts,
    audits,
    superUsers: superUsers.length,
    roles: roles.map(row => row.enumlabel),
  }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
