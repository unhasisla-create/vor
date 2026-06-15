import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { vehicleId, date, status, note } = await req.json()
  if (!vehicleId || !date || !status) return NextResponse.json({ error: 'Data actual tidak lengkap.' }, { status: 400 })

  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) }, include: { branch: true } })
  if (!vehicle) return NextResponse.json({ error: 'Kendaraan tidak ditemukan.' }, { status: 404 })
  if (session.branch !== 'ALL' && vehicle.branch.code !== session.branch) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const actual = await prisma.actualOperation.upsert({
    where: { vehicleId_date: { vehicleId: Number(vehicleId), date } },
    update: { status, note: note || null },
    create: { vehicleId: Number(vehicleId), date, status, note: note || null },
  })
  await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Update Status', detail: `${vehicle.nopol} - ${date}: ${status}${note ? ` (${note})` : ''}` } })

  return NextResponse.json({ actual })
}
