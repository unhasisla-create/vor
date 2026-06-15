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
    const previous = await prisma.actualOperation.findUnique({ where: { vehicleId_date: { vehicleId: vehicle.id, date: yesterdayKey } } })
    if (!previous) continue
    await prisma.actualOperation.upsert({
      where: { vehicleId_date: { vehicleId: vehicle.id, date: todayKey } },
      update: { status: previous.status, note: previous.note },
      create: { vehicleId: vehicle.id, date: todayKey, status: previous.status, note: previous.note },
    })
    copied++
  }
  await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Copy Actual Yesterday', detail: `Branch ${branchId} - ${copied} unit disalin` } })

  return NextResponse.json({ copied })
}
