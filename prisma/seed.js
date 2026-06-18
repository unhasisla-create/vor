const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const BRANCHES = [
  { name: 'Logistik Makassar', code: 'LMKS' },
  { name: 'Vehicle Makassar', code: 'VLIM' },
  { name: 'Logistik Surabaya', code: 'LSBY' },
  { name: 'Logistik Jakarta', code: 'LJKT' },
  { name: 'Logistik Balikpapan', code: 'LBPP' },
]

const STATUS_MASTER = [
  { code: 'UTI',   desc: 'Utilisasi',                  group: 'UTILISASI',       color: '#16a34a', isForecast: true,  details: 'Armada aktif dan sedang melakukan pengiriman atau tugas operasional.' },
  { code: 'C',     desc: 'Carry Over',                 group: 'UTILISASI',       color: '#15803d', isForecast: true,  details: 'Tugas yang dilanjutkan dari periode sebelumnya dan masih berjalan.' },
  { code: 'MB',    desc: 'Muatan Balik',               group: 'UTILISASI',       color: '#059669', isForecast: true,  details: 'Armada membawa muatan kembali setelah menyelesaikan tugas angkut utama.' },
  { code: 'RFU',   desc: 'Ready For Use',              group: 'READY FOR USE',   color: '#ca8a04', isForecast: true,  details: 'Armada siap digunakan dan menunggu instruksi tugas selanjutnya.' },
  { code: 'RB',    desc: 'Ready Bengkel',              group: 'READY FOR USE',   color: '#d97706', isForecast: true,  details: 'Armada berada di bengkel tetapi sudah siap digunakan kembali setelah servis ringan.' },
  { code: 'BD',    desc: 'Breakdown',                  group: 'BREAKDOWN',       color: '#dc2626', isForecast: true,  details: 'Armada mengalami kerusakan yang menghentikan operasional dan memerlukan perbaikan.' },
  { code: 'BDJ+1', desc: 'Breakdown Dijalan > 1 Hari', group: 'BREAKDOWN',      color: '#b91c1c', isForecast: true,  details: 'Kerusakan parah yang menyebabkan armada tidak bisa beroperasi lebih dari satu hari.' },
  { code: 'AM',    desc: 'Antri Muat',                 group: 'DELAY',           color: '#ea580c', isForecast: true,  details: 'Armada menunggu antrean untuk proses pemuatan barang.' },
  { code: 'BT',    desc: 'BOP Terlambat',              group: 'DELAY',           color: '#c2410c', isForecast: true,  details: 'Operasi tertunda karena proses BOP atau administrasi yang belum selesai.' },
  { code: 'AS',    desc: 'Antri Solar',                group: 'DELAY',           color: '#9a3412', isForecast: true,  details: 'Armada sedang menunggu pengisian bahan bakar sebelum melanjutkan perjalanan.' },
  { code: 'BDJ-1', desc: 'Breakdown Dijalan < 1 Hari', group: 'DELAY',          color: '#b45309', isForecast: true,  details: 'Kerusakan ringan yang memperlambat operasi selama kurang dari satu hari.' },
  { code: 'FM',    desc: 'Force Maujure',              group: 'DELAY',           color: '#7c3aed', isForecast: true,  details: 'Keterlambatan karena kejadian di luar kendali, seperti cuaca buruk atau bencana.' },
  { code: 'BTJ',   desc: 'Buka Tutup Jalur',           group: 'DELAY',           color: '#6d28d9', isForecast: true,  details: 'Perjalanan tertunda karena penutupan atau pembukaan ruas jalan.' },
  { code: 'AB',    desc: 'Antri Bongkar',              group: 'DELAY',           color: '#5b21b6', isForecast: true,  details: 'Armada menunggu giliran bongkar muat di lokasi tujuan.' },
  { code: 'TAD',   desc: 'Tidak Ada Driver',           group: 'DNA (DS HO)',     color: '#db2777', isForecast: true,  details: 'Armada tidak dapat beroperasi karena tidak tersedia driver.' },
  { code: 'TK',    desc: 'Tanpa Keterangan',           group: 'DNA (HC CABANG)', color: '#be185d', isForecast: true,  details: 'Status tidak jelas atau belum diidentifikasi oleh cabang.' },
  { code: 'L',     desc: 'Libur',                      group: 'NWD',             color: '#2563eb', isForecast: true,  details: 'Armada tidak beroperasi karena periode libur atau istirahat.' },
  { code: 'AT',    desc: 'Asset Tertahan',             group: 'UNR',             color: '#6b7280', isForecast: true,  details: 'Aset terhambat oleh masalah administratif atau dokumen.' },
  { code: 'LNR',   desc: 'Lisensi Belum Aktif',        group: 'UNR',             color: '#4b5563', isForecast: true,  details: 'Armada tidak bisa beroperasi karena lisensi atau izin belum aktif.' },
  { code: 'KR',    desc: 'Karoseri',                   group: 'UNR',             color: '#374151', isForecast: true,  details: 'Armada sedang menjalani perbaikan bodi atau karoseri.' },
  { code: 'MT-IN', desc: 'Mutasi Masuk',               group: 'UNR',             color: '#9ca3af', isForecast: false, details: 'Unit masuk dari mutasi cabang lain dan sedang dalam proses penerimaan.' },
  { code: 'MT-OUT',desc: 'Mutasi Keluar',              group: 'UNR',             color: '#d1d5db', isForecast: false, details: 'Unit sedang dipindahkan ke cabang lain untuk operasional.' },
]

const VEHICLE_TYPES = ['BOX VAN', 'CDE BOX', 'CDD STANDAR', 'WINGBOX', 'FUSO']

const CUSTOMERS = ['DEPO', 'CIOMAS', 'SHOPEE', 'INDOMARET', 'ALFAMART']

const DRIVERS = ['MUH RUSLI', 'MARWANSYAH', 'HARIS LEWA', 'ADRIANSYA', 'SULTAN', 'AGUS', 'BAMBANG', 'HENDRA', 'FIRMAN', 'DODI']

// 15 unit: 3 per branch
const VEHICLES_PER_BRANCH = {
  LMKS: [
    { nopol: 'DD 1001 XX', type: 'BOX VAN', tonase: 2, kubikasi: 8, customer: 'DEPO', driver: 'MUH RUSLI', target: 2500000 },
    { nopol: 'DD 1002 XX', type: 'CDE BOX', tonase: 3, kubikasi: 10, customer: 'CIOMAS', driver: 'MARWANSYAH', target: 3000000 },
    { nopol: 'DD 1003 XX', type: 'WINGBOX', tonase: 5, kubikasi: 15, customer: 'SHOPEE', driver: 'HARIS LEWA', target: 4500000 },
  ],
  VLIM: [
    { nopol: 'DD 2001 XX', type: 'CDD STANDAR', tonase: 4, kubikasi: 12, customer: 'INDOMARET', driver: 'ADRIANSYA', target: 3500000 },
    { nopol: 'DD 2002 XX', type: 'FUSO', tonase: 8, kubikasi: 20, customer: 'ALFAMART', driver: 'SULTAN', target: 6000000 },
    { nopol: 'DD 2003 XX', type: 'BOX VAN', tonase: 2, kubikasi: 8, customer: 'DEPO', driver: 'FIRMAN', target: 2500000 },
  ],
  LSBY: [
    { nopol: 'L 3001 XX', type: 'BOX VAN', tonase: 2, kubikasi: 8, customer: 'SHOPEE', driver: 'AGUS', target: 2800000 },
    { nopol: 'L 3002 XX', type: 'CDE BOX', tonase: 3, kubikasi: 10, customer: 'CIOMAS', driver: 'BAMBANG', target: 3200000 },
    { nopol: 'L 3003 XX', type: 'WINGBOX', tonase: 5, kubikasi: 15, customer: 'DEPO', driver: 'HENDRA', target: 4200000 },
  ],
  LJKT: [
    { nopol: 'B 4001 XX', type: 'CDD STANDAR', tonase: 4, kubikasi: 12, customer: 'INDOMARET', driver: 'DODI', target: 3500000 },
    { nopol: 'B 4002 XX', type: 'FUSO', tonase: 8, kubikasi: 20, customer: 'SHOPEE', driver: 'SULTAN', target: 5500000 },
    { nopol: 'B 4003 XX', type: 'BOX VAN', tonase: 2, kubikasi: 8, customer: 'ALFAMART', driver: 'AGUS', target: 2500000 },
  ],
  LBPP: [
    { nopol: 'KT 5001 XX', type: 'CDE BOX', tonase: 3, kubikasi: 10, customer: 'CIOMAS', driver: 'BAMBANG', target: 3000000 },
    { nopol: 'KT 5002 XX', type: 'WINGBOX', tonase: 5, kubikasi: 15, customer: 'DEPO', driver: 'HENDRA', target: 4500000 },
    { nopol: 'KT 5003 XX', type: 'FUSO', tonase: 8, kubikasi: 20, customer: 'SHOPEE', driver: 'FIRMAN', target: 6000000 },
  ],
}

function pad(n) { return String(n).padStart(2, '0') }

// Deterministic status: menghasilkan pola realistis seperti data real
function randomStatus(day, vehicleId) {
  const r = (vehicleId * 7 + day * 13 + 3) % 100
  if (r < 50) return 'UTI'
  if (r < 72) return 'RFU'
  if (r < 84) return 'AM'
  if (r < 91) return 'C'
  if (r < 96) return 'MB'
  return 'BD'
}

function randomRevenue(vehicleId, day) {
  const base = 2500000 + (vehicleId % 5) * 500000
  const variasi = (vehicleId * 30000 + day * 25000) % 250000
  return base + variasi
}

function randomBop(revenue) {
  return Math.round(revenue * (0.05 + ((revenue * 7) % 100) / 400))
}

async function main() {
  console.log('🌱 Seeding database...\n')
  const start = Date.now()

  // Hapus cabang lama yang tidak dipakai lagi
  const oldCodes = ['LBDG', 'LMDN']
  for (const code of oldCodes) {
    const old = await prisma.branch.findUnique({ where: { code } })
    if (old) {
      // Pindahkan user/vehicle/customer/driver ke LMKS sebelum hapus
const lmks = await prisma.branch.findUnique({ where: { code: 'LMKS' } })
const ljk = await prisma.branch.findUnique({ where: { code: 'LJK' } })
      await prisma.user.updateMany({ where: { branchId: old.id }, data: { branchId: lmks.id } })
      await prisma.vehicle.updateMany({ where: { branchId: old.code }, data: { branchId: lmks.code } })
      await prisma.customer.updateMany({ where: { branchId: old.id }, data: { branchId: lmks.id } })
      await prisma.driver.updateMany({ where: { branchId: old.id }, data: { branchId: lmks.id } })
      await prisma.branch.delete({ where: { code } })
      console.log(`  🗑  Cabang ${code} dihapus`)
    }
  }

  // 1. Branches
  for (const b of BRANCHES) {
    await prisma.branch.upsert({ where: { code: b.code }, update: {}, create: { name: b.name, code: b.code } })
  }
  console.log('✅ Branches seeded (LMKS, VLIM, LSBY, LJK, LBP)')

  const lmks = await prisma.branch.findUnique({ where: { code: 'LMKS' } })

  // 2. Users
  const adminHash = await bcrypt.hash('admin123', 10)
  const userHash = await bcrypt.hash('vor2024', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { branchId: null, role: 'ADMIN', name: 'Administrator' },
    create: { username: 'admin', name: 'Administrator', passwordHash: adminHash, role: 'ADMIN', branchId: null }
  })

  for (const b of BRANCHES) {
    const branch = await prisma.branch.findUnique({ where: { code: b.code } })
    await prisma.user.upsert({
      where: { username: `planner.${b.code.toLowerCase()}` },
      update: {},
      create: { username: `planner.${b.code.toLowerCase()}`, name: `Planner ${b.name}`, passwordHash: userHash, role: 'PLANNER', branchId: branch.id }
    })
    await prisma.user.upsert({
      where: { username: `supervisor.${b.code.toLowerCase()}` },
      update: {},
      create: { username: `supervisor.${b.code.toLowerCase()}`, name: `Supervisor ${b.name}`, passwordHash: userHash, role: 'SUPERVISOR', branchId: branch.id }
    })
  }

  await prisma.user.upsert({
    where: { username: 'management' },
    update: { branchId: null, role: 'MANAGEMENT', name: 'Manajemen' },
    create: { username: 'management', name: 'Manajemen', passwordHash: userHash, role: 'MANAGEMENT', branchId: null }
  })
  console.log('✅ Users seeded (admin/admin123, planner.*/vor2024, management/vor2024)')

  // 3. Status Configs
  for (const s of STATUS_MASTER) {
    await prisma.statusConfig.upsert({
      where: { code: s.code },
      update: { desc: s.desc, group: s.group, color: s.color, details: s.details, isForecast: s.isForecast },
      create: s
    })
  }
  console.log('✅ Status Configs seeded')

  // 4. Vehicle Types
  for (const vt of VEHICLE_TYPES) {
    await prisma.vehicleType.upsert({ where: { code: vt }, update: {}, create: { code: vt, name: vt } })
  }
  console.log('✅ Vehicle Types seeded')

  // 5. Customers
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({ where: { code: c }, update: {}, create: { code: c, name: c, branchId: lmks.id } })
  }
  console.log('✅ Customers seeded')

  // 6. Drivers
  for (const d of DRIVERS) {
    await prisma.driver.upsert({ where: { code: d }, update: {}, create: { code: d, name: d, branchId: lmks.id } })
  }
  console.log('✅ Drivers seeded')

  // 7. Vehicles + Actuals + Forecasts + Revenue
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = now.getDate()

  let totalVehicles = 0
  let totalActuals = 0
  let totalForecasts = 0
  let totalRevenues = 0

  for (const branch of BRANCHES) {
    const branchRecord = await prisma.branch.findUnique({ where: { code: branch.code } })
    const vehicleDefs = VEHICLES_PER_BRANCH[branch.code] || []

    for (const v of vehicleDefs) {
      const custRecord = await prisma.customer.findUnique({ where: { code: v.customer } })
      const driverRecord = await prisma.driver.findUnique({ where: { code: v.driver } })

      const vehicle = await prisma.vehicle.upsert({
        where: { nopol: v.nopol },
        update: {},
        create: {
          nopol: v.nopol,
          type: v.type,
          tonase: v.tonase,
          kubikasi: v.kubikasi,
          revenueTarget: v.target,
          customerId: custRecord?.id,
          driverId: driverRecord?.id,
          branchId: branchRecord.id,
        }
      })
      totalVehicles++

      // Actuals: dari tgl 1 bulan ini hingga hari ini
      for (let d = 1; d <= today; d++) {
        const dateStr = `${year}-${pad(month)}-${pad(d)}`
        const status = randomStatus(d, vehicle.id)
        await prisma.actualOperation.upsert({
          where: { vehicleId_date: { vehicleId: vehicle.id, date: dateStr } },
          update: { status },
          create: { vehicleId: vehicle.id, date: dateStr, status },
        })
        totalActuals++
      }

      // Forecast: besok sampai 3 hari ke depan
      for (let d = today + 1; d <= Math.min(today + 3, daysInMonth); d++) {
        const dateStr = `${year}-${pad(month)}-${pad(d)}`
        const status = randomStatus(d + 5, vehicle.id)
        const confidence = (d + vehicle.id) % 2 === 0 ? 'MANUAL' : 'SYSTEM'
        await prisma.forecastOperation.upsert({
          where: { vehicleId_date: { vehicleId: vehicle.id, date: dateStr } },
          update: { status, confidence },
          create: { vehicleId: vehicle.id, date: dateStr, status, confidence },
        })
        totalForecasts++
      }

      // Revenue: dari tgl 1 hingga hari ini
      for (let d = 1; d <= today; d++) {
        const dateStr = `${year}-${pad(month)}-${pad(d)}`
        const achRev = randomRevenue(vehicle.id, d)
        const bop = randomBop(achRev)
        await prisma.revenueRecord.upsert({
          where: { date_branchId_nopol: { date: dateStr, branchId: branch.code, nopol: v.nopol } },
          update: {},
          create: {
            date: dateStr,
            branchId: branch.code,
            nopol: v.nopol,
            typeUnit: v.type,
            targetPerUnit: v.target,
            achRevenue: achRev,
            bop,
          },
        })
        totalRevenues++
      }
    }
  }

  console.log(`✅ ${totalVehicles} Vehicles seeded`)
  console.log(`✅ ${totalActuals} Actual operations seeded (day 1 → ${today})`)
  console.log(`✅ ${totalForecasts} Forecasts seeded`)
  console.log(`✅ ${totalRevenues} Revenue records seeded`)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n🎉 Seeding completed in ${elapsed}s!`)
  console.log(`\n💡 Login:`)
  console.log(`   admin / admin123 (Admin — all branches)`)
  console.log(`   management / vor2024 (Management — all branches)`)
  for (const b of BRANCHES) {
    console.log(`   planner.${b.code.toLowerCase()} / vor2024 (Planner ${b.name})`)
    console.log(`   supervisor.${b.code.toLowerCase()} / vor2024 (Supervisor ${b.name})`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
