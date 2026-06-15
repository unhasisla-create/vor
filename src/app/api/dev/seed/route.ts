import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import type { Role } from '@prisma/client'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Route ini hanya tersedia di development.' }, { status: 403 })
  }

  const branchData = [
    { code: 'LMKS', name: 'Logistik Makassar' },
    { code: 'VLIM', name: 'Vehicle Makassar' },
    { code: 'LSBY', name: 'Logistik Surabaya' },
    { code: 'LBDG', name: 'Logistik Bandung' },
    { code: 'LMDN', name: 'Logistik Medan' },
  ]

  const users: { username: string; name: string; role: Role; branchCode: string | null }[] = [
    { username: 'admin', name: 'Admin', role: 'ADMIN', branchCode: null },
    { username: 'planner.lmks', name: 'Planner LMKS', role: 'PLANNER', branchCode: 'LMKS' },
    { username: 'supervisor.lmks', name: 'Supervisor LMKS', role: 'SUPERVISOR', branchCode: 'LMKS' },
    { username: 'management', name: 'Management', role: 'MANAGEMENT', branchCode: null },
  ]

  const passwordHash = await hashPassword('vor2024')

  const branchById: Record<string, string> = {}
  for (const branch of branchData) {
    const b = await prisma.branch.upsert({
      where: { code: branch.code },
      update: { name: branch.name },
      create: { code: branch.code, name: branch.name },
    })
    branchById[b.id] = b.code
  }

  await prisma.user.deleteMany({
    where: {
      username: { in: ['superadmin', 'admin.lmks', 'admin.vlim', 'supervisor'] },
    },
  })

  for (const user of users) {
    const branch = user.branchCode ? await prisma.branch.findUnique({ where: { code: user.branchCode } }) : null
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        role: user.role,
        branchId: branch?.id,
        passwordHash,
      },
      create: {
        username: user.username,
        name: user.name,
        role: user.role,
        branchId: branch?.id,
        passwordHash,
      },
    })
  }

  const vehicleTypes = ['BOX VAN', 'BOX VAN (COLDBOX)', 'CDE BOX', 'CDD STANDAR', 'CDD LONG', 'CDD JUMBO', 'WINGBOX', 'FUSO', 'TRONTON']
  const customers = ['DEPO', 'CIOMAS', 'SHOPEE', 'ALL PROJECT', 'INDOMARET', 'ALFAMART', 'LAZADA', 'J&T', 'SICEPAT']
  const drivers = [
    'MUH RUSLI', 'MARWANSYAH', 'HARIS LEWA', 'ADRIANSYA', 'ISMAIL SAID',
    'IMAM WAHYUDI', 'IMRAN', 'M GASALIS', 'RUSLI TALLI', 'FAKHRUDDIN',
    'SYAMSUL B', 'BAHARUDDIN', 'KAMALUDDIN', 'NURDIN HB', 'ARIFUDDIN',
  ]
  const chassisPool = ['MHFE3CJX3PK0', 'MHFE3CJX4PK1', 'MHFE3CJX5PK2', '', '', '', '', '', '', '']
  const targetPool  = [50000000, 75000000, 100000000, 60000000, 80000000, 0, 0, 0, 0, 0]

  const prefixes: Record<string, string[]> = {
    LMKS: ['DD', 'DW'], VLIM: ['DD', 'DB'],
    LSBY: ['L', 'W'],   LBDG: ['D', 'Z'], LMDN: ['BK', 'BA'],
  }

  let vehicleIndex = 1
  const seededVehicles: { id: number; nopol: string; type: string; branchId: string; revenueTarget: number }[] = []

  for (const branch of branchData) {
    const branchRecord = await prisma.branch.findUnique({ where: { code: branch.code } })
    if (!branchRecord) continue

    for (let i = 0; i < 10; i++) {
      const p = prefixes[branch.code][i % prefixes[branch.code].length]
      const nopol = `${p} ${8000 + vehicleIndex * 7} ${['SA', 'SV', 'SZ', 'SG', 'UL'][i % 5]}`
      const type = vehicleTypes[i % vehicleTypes.length]
      const tonase = [1, 3, 4, 5, 8, 12, 20][i % 7]
      const kubikasi = [7, 12, 20, 33, 49][i % 5]
      const chassis = chassisPool[i % chassisPool.length]
      const target = targetPool[i % targetPool.length]

      const vehicle = await prisma.vehicle.upsert({
        where: { nopol },
        update: { type, tonase, kubikasi, chassisNumber: chassis, revenueTarget: target, branchId: branchRecord.id, isActive: i !== 9, inactiveReason: i === 9 ? 'Unit cadangan / maintenance panjang' : null },
        create: { nopol, type, tonase, kubikasi, chassisNumber: chassis, revenueTarget: target, branchId: branchRecord.id, isActive: i !== 9, inactiveReason: i === 9 ? 'Unit cadangan / maintenance panjang' : null },
      })

      seededVehicles.push({ id: vehicle.id, nopol: vehicle.nopol, type, branchId: branchRecord.id, revenueTarget: target })
      vehicleIndex++
    }
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  for (const v of seededVehicles) {
    if (!v.revenueTarget) continue
    const branchCode = branchById[v.branchId]
    const masterTarget = v.revenueTarget
    let targetPerUnit = masterTarget
    let achRevenue = 0
    let bop = 0

    if (v.id % 3 === 0) {
      targetPerUnit = Math.round(masterTarget * 1.1)
      achRevenue = Math.round(masterTarget * 0.95)
      bop = Math.round(masterTarget * 0.08)
    } else if (v.id % 3 === 1) {
      targetPerUnit = masterTarget
      achRevenue = Math.round(masterTarget * 1.05)
      bop = Math.round(masterTarget * 0.06)
    }

    if (targetPerUnit || achRevenue || bop) {
      await prisma.revenueRecord.upsert({
        where: { month_year_branchId_nopol: { month: currentMonth, year: currentYear, branchId: branchCode, nopol: v.nopol } },
        update: { typeUnit: v.type, targetPerUnit, achRevenue, bop },
        create: { month: currentMonth, year: currentYear, branchId: branchCode, nopol: v.nopol, typeUnit: v.type, targetPerUnit, achRevenue, bop },
      })
    }
  }

  const statusConfigs = [
    { code: 'UTI',   desc: 'Utilisasi',                  group: 'UTILISASI',       color: '#16a34a', isForecast: true,  sortOrder: 1,  details: 'Armada aktif dan sedang melakukan pengiriman atau tugas operasional.' },
    { code: 'C',     desc: 'Carry Over',                 group: 'UTILISASI',       color: '#15803d', isForecast: true,  sortOrder: 2,  details: 'Tugas yang dilanjutkan dari periode sebelumnya dan masih berjalan.' },
    { code: 'MB',    desc: 'Muatan Balik',               group: 'UTILISASI',       color: '#059669', isForecast: true,  sortOrder: 3,  details: 'Armada membawa muatan kembali setelah menyelesaikan tugas angkut utama.' },
    { code: 'RFU',   desc: 'Ready For Use',              group: 'READY FOR USE',   color: '#ca8a04', isForecast: true,  sortOrder: 4,  details: 'Armada siap digunakan dan menunggu instruksi tugas selanjutnya.' },
    { code: 'RB',    desc: 'Ready Bengkel',              group: 'READY FOR USE',   color: '#d97706', isForecast: true,  sortOrder: 5,  details: 'Armada berada di bengkel tetapi sudah siap digunakan kembali setelah servis ringan.' },
    { code: 'BD',    desc: 'Breakdown',                  group: 'BREAKDOWN',       color: '#dc2626', isForecast: true,  sortOrder: 6,  details: 'Armada mengalami kerusakan yang menghentikan operasional dan memerlukan perbaikan.' },
    { code: 'BDJ+1', desc: 'Breakdown Dijalan > 1 Hari', group: 'BREAKDOWN',      color: '#b91c1c', isForecast: true,  sortOrder: 7,  details: 'Kerusakan parah yang menyebabkan armada tidak bisa beroperasi lebih dari satu hari.' },
    { code: 'AM',    desc: 'Antri Muat',                 group: 'DELAY',           color: '#ea580c', isForecast: true,  sortOrder: 8,  details: 'Armada menunggu antrean untuk proses pemuatan barang.' },
    { code: 'BT',    desc: 'BOP Terlambat',              group: 'DELAY',           color: '#c2410c', isForecast: true,  sortOrder: 9,  details: 'Operasi tertunda karena proses BOP atau administrasi yang belum selesai.' },
    { code: 'AS',    desc: 'Antri Solar',                group: 'DELAY',           color: '#9a3412', isForecast: true,  sortOrder: 10, details: 'Armada sedang menunggu pengisian bahan bakar sebelum melanjutkan perjalanan.' },
    { code: 'BDJ-1', desc: 'Breakdown Dijalan < 1 Hari', group: 'DELAY',          color: '#b45309', isForecast: true,  sortOrder: 11, details: 'Kerusakan ringan yang memperlambat operasi selama kurang dari satu hari.' },
    { code: 'FM',    desc: 'Force Maujure',              group: 'DELAY',           color: '#7c3aed', isForecast: true,  sortOrder: 12, details: 'Keterlambatan karena kejadian di luar kendali, seperti cuaca buruk atau bencana.' },
    { code: 'BTJ',   desc: 'Buka Tutup Jalur',           group: 'DELAY',           color: '#6d28d9', isForecast: true,  sortOrder: 13, details: 'Perjalanan tertunda karena penutupan atau pembukaan ruas jalan.' },
    { code: 'AB',    desc: 'Antri Bongkar',              group: 'DELAY',           color: '#5b21b6', isForecast: true,  sortOrder: 14, details: 'Armada menunggu giliran bongkar muat di lokasi tujuan.' },
    { code: 'TAD',   desc: 'Tidak Ada Driver',           group: 'DNA (DS HO)',     color: '#db2777', isForecast: true,  sortOrder: 15, details: 'Armada tidak dapat beroperasi karena tidak tersedia driver.' },
    { code: 'TK',    desc: 'Tanpa Keterangan',           group: 'DNA (HC CABANG)', color: '#be185d', isForecast: true,  sortOrder: 16, details: 'Status tidak jelas atau belum diidentifikasi oleh cabang.' },
    { code: 'L',     desc: 'Libur',                      group: 'NWD',             color: '#2563eb', isForecast: true,  sortOrder: 17, details: 'Armada tidak beroperasi karena periode libur atau istirahat.' },
    { code: 'AT',    desc: 'Asset Tertahan',             group: 'UNR',             color: '#6b7280', isForecast: true,  sortOrder: 18, details: 'Aset terhambat oleh masalah administratif atau dokumen.' },
    { code: 'LNR',   desc: 'Lisensi Belum Aktif',        group: 'UNR',             color: '#4b5563', isForecast: true,  sortOrder: 19, details: 'Armada tidak bisa beroperasi karena lisensi atau izin belum aktif.' },
    { code: 'KR',    desc: 'Karoseri',                   group: 'UNR',             color: '#374151', isForecast: true,  sortOrder: 20, details: 'Armada sedang menjalani perbaikan bodi atau karoseri.' },
    { code: 'MT-IN', desc: 'Mutasi Masuk',               group: 'UNR',             color: '#9ca3af', isForecast: false, sortOrder: 21, details: 'Unit masuk dari mutasi cabang lain dan sedang dalam proses penerimaan.' },
    { code: 'MT-OUT',desc: 'Mutasi Keluar',              group: 'UNR',             color: '#d1d5db', isForecast: false, sortOrder: 22, details: 'Unit sedang dipindahkan ke cabang lain untuk operasional.' },
  ]
  for (const sc of statusConfigs) {
    await prisma.statusConfig.upsert({
      where: { code: sc.code },
      update: sc,
      create: sc,
    })
  }

  return NextResponse.json({
    ok: true,
    message: 'Data seed selesai. Gunakan kredensial demo di login.',
    users: users.length,
    branches: branchData.length,
    vehicles: seededVehicles.length,
    revenueRecords: seededVehicles.filter(v => v.revenueTarget).length,
  })
}
