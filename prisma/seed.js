const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const BRANCHES = [
  { name: 'Logistik Makassar', code: 'LMKS' },
  { name: 'Vehicle Makassar', code: 'VLIM' },
  { name: 'Logistik Surabaya', code: 'LSBY' },
  { name: 'Logistik Bandung', code: 'LBDG' },
  { name: 'Logistik Medan', code: 'LMDN' },
]

const STATUS_MASTER = [
  { code: 'UTI', desc: 'Utilisasi', group: 'UTILISASI', color: '#16a34a', isForecast: true, details: 'Armada aktif' },
  { code: 'RFU', desc: 'Ready For Use', group: 'READY FOR USE', color: '#ca8a04', isForecast: true, details: 'Armada siap digunakan' },
  { code: 'BD', desc: 'Breakdown', group: 'BREAKDOWN', color: '#dc2626', isForecast: true, details: 'Armada rusak' },
  { code: 'AM', desc: 'Antri Muat', group: 'DELAY', color: '#ea580c', isForecast: true, details: 'Antri Muat' },
]

const VEHICLE_TYPES = [
  'BOX VAN', 'CDE BOX', 'CDD STANDAR', 'WINGBOX', 'FUSO'
]

const CUSTOMERS = [
  'DEPO', 'CIOMAS', 'SHOPEE', 'INDOMARET', 'ALFAMART'
]

const DRIVERS = [
  'MUH RUSLI', 'MARWANSYAH', 'HARIS LEWA', 'ADRIANSYA'
]

async function main() {
  console.log('Seeding database...')

  // 1. Branches
  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { code: b.code },
      update: {},
      create: { name: b.name, code: b.code }
    })
  }
  console.log('✅ Branches seeded')

  const lmks = await prisma.branch.findUnique({ where: { code: 'LMKS' } })

  // 2. Admin User
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrator',
      passwordHash,
      role: 'ADMIN',
      branchId: lmks.id
    }
  })
  console.log('✅ Admin user seeded (admin / admin123)')

  // 3. Status Config
  for (const s of STATUS_MASTER) {
    await prisma.statusConfig.upsert({
      where: { code: s.code },
      update: {},
      create: {
        code: s.code,
        desc: s.desc,
        group: s.group,
        color: s.color,
        isForecast: s.isForecast,
        details: s.details
      }
    })
  }
  console.log('✅ Status Configs seeded')

  // 4. Vehicle Types
  for (const vt of VEHICLE_TYPES) {
    await prisma.vehicleType.upsert({
      where: { code: vt },
      update: {},
      create: { code: vt, name: vt }
    })
  }
  console.log('✅ Vehicle Types seeded')

  // 5. Customers
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { code: c },
      update: {},
      create: { code: c, name: c, branchId: lmks.id }
    })
  }
  console.log('✅ Customers seeded')

  // 6. Drivers
  for (const d of DRIVERS) {
    await prisma.driver.upsert({
      where: { code: d },
      update: {},
      create: { code: d, name: d, branchId: lmks.id }
    })
  }
  console.log('✅ Drivers seeded')

  // 7. Vehicles (Dummy)
  const custRecord = await prisma.customer.findUnique({ where: { code: 'DEPO' } })
  const driverRecord = await prisma.driver.findUnique({ where: { code: 'MUH RUSLI' } })

  await prisma.vehicle.upsert({
    where: { nopol: 'DD 1234 XY' },
    update: {},
    create: {
      nopol: 'DD 1234 XY',
      type: 'BOX VAN',
      tonase: 2,
      kubikasi: 8,
      customerId: custRecord?.id,
      driverId: driverRecord?.id,
      branchId: lmks.id
    }
  })
  console.log('✅ Vehicles seeded')

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
