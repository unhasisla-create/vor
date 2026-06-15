import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'
import { formatDateKey } from '@/lib/constants'

function parseDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function getDateKeys(start: Date, end: Date) {
  const keys: string[] = []
  const current = new Date(start)
  while (current <= end) {
    keys.push(formatDateKey(current.getFullYear(), current.getMonth() + 1, current.getDate()))
    current.setDate(current.getDate() + 1)
  }
  return keys
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { branchId, sourceDate, targetStartDate, targetEndDate } = await req.json()
  if (!branchId || !sourceDate || !targetStartDate || !targetEndDate) {
    return NextResponse.json({ error: 'Semua field diperlukan.' }, { status: 400 })
  }
  if (session.branch !== 'ALL' && session.branch !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const source = parseDateString(sourceDate)
  const start = parseDateString(targetStartDate)
  const end = parseDateString(targetEndDate)
  if (!source || !start || !end) {
    return NextResponse.json({ error: 'Format tanggal tidak valid.' }, { status: 400 })
  }
  if (start > end) {
    return NextResponse.json({ error: 'Rentang target tidak valid.' }, { status: 400 })
  }

  const today = new Date()
  if (source > today || end > today) {
    return NextResponse.json({ error: 'Tanggal tidak boleh di masa depan.' }, { status: 400 })
  }

  const vehicles = await prisma.vehicle.findMany({ where: { isActive: true, ...(branchId !== 'ALL' ? { branch: { code: branchId } } : {}) } })
  const keySource = formatDateKey(source.getFullYear(), source.getMonth() + 1, source.getDate())
  const targetKeys = getDateKeys(start, end)
  let copied = 0

  for (const vehicle of vehicles) {
    const sourceActual = await prisma.actualOperation.findUnique({
      where: { vehicleId_date: { vehicleId: vehicle.id, date: keySource } },
    })
    if (!sourceActual) continue

    for (const targetKey of targetKeys) {
      await prisma.actualOperation.upsert({
        where: { vehicleId_date: { vehicleId: vehicle.id, date: targetKey } },
        update: { status: sourceActual.status, note: sourceActual.note },
        create: { vehicleId: vehicle.id, date: targetKey, status: sourceActual.status, note: sourceActual.note },
      })
      copied++
    }
  }

  await prisma.auditLog.create({
    data: {
      user: `${session.username} (${session.role})`,
      action: 'Copy Actual Range',
      detail: `Branch ${branchId} ${sourceDate} -> ${targetStartDate}..${targetEndDate} - ${copied} sel disalin`,
    },
  })

  return NextResponse.json({ copied })
}
