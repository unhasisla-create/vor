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
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const todayKey = formatDateObjectKey(today)
  const tomorrowKey = formatDateObjectKey(tomorrow)

  const vehicles = await prisma.vehicle.findMany({ where: { isActive: true, ...(branchId !== 'ALL' ? { branch: { code: branchId } } : {}) } })
  let generated = 0
  for (const vehicle of vehicles) {
    const actual = await prisma.actualOperation.findUnique({ where: { vehicleId_date: { vehicleId: vehicle.id, date: todayKey } } })
    if (!actual) continue
    const existing = await prisma.forecastOperation.findUnique({ where: { vehicleId_date: { vehicleId: vehicle.id, date: tomorrowKey } } })
    if (existing?.confidence === 'MANUAL') continue
    await prisma.forecastOperation.upsert({
      where: { vehicleId_date: { vehicleId: vehicle.id, date: tomorrowKey } },
      update: { status: actual.status, confidence: 'SYSTEM' },
      create: { vehicleId: vehicle.id, date: tomorrowKey, status: actual.status, confidence: 'SYSTEM' },
    })
    generated++
  }
  await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Generate Forecast', detail: `Branch ${branchId} - ${generated} unit draft SYSTEM` } })

  return NextResponse.json({ generated })
}
