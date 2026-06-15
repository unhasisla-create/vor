const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// Semua tipe kendaraan: gabungan dari yang ada di DB vehicle + dari konstanta VEHICLE_TYPES
// Urutan sesuai konstanta VEHICLE_TYPES + tambahan dari DB jika ada yang beda
const ALL_TYPES = [
  'BOX VAN',
  'BOX VAN (COLDBOX)',
  'CDE BOX',
  'CDD STANDAR',
  'CDD LONG',
  'CDD JUMBO',
  'CDD JUMBO REFEER',
  'TBONTON',
  'WINGBOX',
  'FUSO',
  'TRONTON',
]

async function seedVehicleTypes() {
  console.log('Seeding VehicleType table...\n')

  for (const name of ALL_TYPES) {
    // Generate code: VT-0001, VT-0002, etc.
    const index = ALL_TYPES.indexOf(name) + 1
    const code = `VT-${String(index).padStart(4, '0')}`

    try {
      // Use upsert to avoid duplicates
      const result = await p.vehicleType.upsert({
        where: { code },
        create: { code, name, isActive: true },
        update: { name }, // update name in case it changed
      })
      console.log(`✔ ${result.code} — ${result.name}`)
    } catch (err) {
      // If code already taken (edge case), try by name using findFirst + create
      console.error(`  ✗ Failed for ${name}:`, err.message)
    }
  }

  console.log('\nDone! Verifying final state:')
  const all = await p.vehicleType.findMany({ orderBy: { code: 'asc' } })
  console.log(all.map(vt => `  ${vt.code} | ${vt.name} | active=${vt.isActive}`).join('\n'))
}

seedVehicleTypes()
  .catch(console.error)
  .finally(() => p.$disconnect())
