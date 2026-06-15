import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'
import { formatDateObjectKey } from '@/lib/constants'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { branchId } = await req.json()
  if (!branchId) return NextResponse.json({ error: 'Cabang diperlukan.' }, { status: 400 })
  if (session.branch !== 'ALL' && session.branch !== branchId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const todayKey = formatDateObjectKey(today)
  const yesterdayKey = formatDateObjectKey(yesterday)

  const vehicles = await prisma.vehicle.findMany({ where: { isActive: true, ...(branchId !== 'ALL' ? { branch: { code: branchId } } : {}) } })
  let copied = 0
  for (const vehicle of vehicles) {
    const previous = await prisma.forecastOperation.findUnique({ where: { vehicleId_date: { vehicleId: vehicle.id, date: todayKey } } })
    if (!previous) continue
    await prisma.actualOperation.upsert({
      where: { vehicleId_date: { vehicleId: vehicle.id, date: todayKey } },
      update: { status: previous.status },
      create: { vehicleId: vehicle.id, date: todayKey, status: previous.status },
    })
    copied++
  }
  await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Copy Forecast Yesterday', detail: `Branch ${branchId} - ${copied} unit dari forecast` } })

  return NextResponse.json({ copied })
}
