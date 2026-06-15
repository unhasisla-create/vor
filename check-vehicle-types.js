const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Get distinct vehicle types from vehicle table
  const vehicles = await p.vehicle.findMany({ select: { type: true }, distinct: ['type'], orderBy: { type: 'asc' } })
  const distinctTypes = vehicles.map(v => v.type)
  console.log('DISTINCT TYPES IN VEHICLE TABLE:', JSON.stringify(distinctTypes, null, 2))

  // Get existing vehicle types in VehicleType table
  const existing = await p.vehicleType.findMany({ select: { name: true, code: true, isActive: true }, orderBy: { code: 'asc' } })
  console.log('EXISTING VEHICLE TYPES:', JSON.stringify(existing, null, 2))

  const missingTypes = distinctTypes.filter(t => !existing.some(e => e.name === t))
  console.log('MISSING (need to seed):', JSON.stringify(missingTypes, null, 2))
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect())
