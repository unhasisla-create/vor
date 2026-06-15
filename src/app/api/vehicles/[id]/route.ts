import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const data: any = {}
  for (const key of ['nopol', 'type', 'isActive', 'inactiveReason', 'chassisNumber']) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (body.revenueTarget !== undefined) data.revenueTarget = Number(body.revenueTarget)
  if (body.customerId !== undefined) {
    const customer = body.customerId ? await prisma.customer.findUnique({ where: { id: body.customerId } }) : null
    data.customerId = customer?.id ?? null
  }
  if (body.driverId !== undefined) {
    const driver = body.driverId ? await prisma.driver.findUnique({ where: { id: body.driverId } }) : null
    data.driverId = driver?.id ?? null
  }
  if (body.tonase !== undefined) data.tonase = Number(body.tonase)
  if (body.kubikasi !== undefined) data.kubikasi = Number(body.kubikasi)
  if (body.branchId !== undefined) {
    const branch = await prisma.branch.findUnique({ where: { code: body.branchId } })
    if (!branch) return NextResponse.json({ error: 'Cabang tidak ditemukan.' }, { status: 400 })
    data.branchId = branch.id
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: Number(params.id) },
      data,
      include: { branch: true, customerMaster: true, driverMaster: true },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Edit Master Data', detail: `${vehicle.nopol} diperbarui` } })
    return NextResponse.json({ vehicle: { ...vehicle, customer: vehicle.customerMaster?.name ?? '-', driver: vehicle.driverMaster?.name ?? '-', branchId: vehicle.branch.code, inactiveReason: vehicle.inactiveReason ?? '' } })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memperbarui kendaraan.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
