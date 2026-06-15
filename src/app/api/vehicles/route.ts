import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const branch = await prisma.branch.findUnique({ where: { code: body.branchId } })
  if (!branch) return NextResponse.json({ error: 'Cabang tidak ditemukan.' }, { status: 400 })
  const customer = body.customerId ? await prisma.customer.findUnique({ where: { id: body.customerId } }) : null
  const driver = body.driverId ? await prisma.driver.findUnique({ where: { id: body.driverId } }) : null

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        nopol: body.nopol,
        type: body.type,
        tonase: Number(body.tonase),
        kubikasi: Number(body.kubikasi),
        chassisNumber: body.chassisNumber || null,
        revenueTarget: Number(body.revenueTarget) || 0,
        customerId: customer?.id,
        driverId: driver?.id,
        branchId: branch.id,
        isActive: body.isActive ?? true,
        inactiveReason: body.inactiveReason || null,
      },
      include: { branch: true, customerMaster: true, driverMaster: true },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Tambah Kendaraan', detail: `${vehicle.nopol} ditambahkan ke ${vehicle.branch.code}` } })
    return NextResponse.json({ vehicle: { ...vehicle, customer: vehicle.customerMaster?.name ?? '-', driver: vehicle.driverMaster?.name ?? '-', branchId: vehicle.branch.code, inactiveReason: vehicle.inactiveReason ?? '' } })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan kendaraan.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
