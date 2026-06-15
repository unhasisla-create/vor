import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || '')
  const year = parseInt(searchParams.get('year') || '')
  const dateFilter = month && year ? {
    gte: `${year}-${String(month).padStart(2, '0')}-01`,
    lte: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
  } : undefined

  const branchWhere = session.branch !== 'ALL' && !['Admin', 'Management'].includes(session.role)
    ? { branch: { code: session.branch } }
    : {}

  const vehicles = await prisma.vehicle.findMany({
    where: branchWhere,
    include: {
      branch: { select: { code: true } },
      customerMaster: { select: { id: true, name: true } },
      driverMaster: { select: { id: true, name: true } },
      actuals: dateFilter ? { where: { date: dateFilter } } : true,
      forecasts: dateFilter ? { where: { date: dateFilter } } : true,
    },
    orderBy: [{ branch: { code: 'asc' } }, { nopol: 'asc' }],
  })

  const statuses: Record<number, Record<string, string>> = {}
  const notes: Record<number, Record<string, string>> = {}
  const forecast: Record<number, Record<string, { status: string; confidence: 'SYSTEM' | 'MANUAL' }>> = {}

  const formattedVehicles = vehicles.map(vehicle => {
    statuses[vehicle.id] = {}
    notes[vehicle.id] = {}
    forecast[vehicle.id] = {}

    vehicle.actuals.forEach(actual => {
      statuses[vehicle.id][actual.date] = actual.status
      if (actual.note) notes[vehicle.id][actual.date] = actual.note
    })

    vehicle.forecasts.forEach(item => {
      forecast[vehicle.id][item.date] = {
        status: item.status,
        confidence: item.confidence === 'MANUAL' ? 'MANUAL' : 'SYSTEM',
      }
    })

    return {
      id: vehicle.id,
      nopol: vehicle.nopol,
      type: vehicle.type,
      tonase: vehicle.tonase,
      kubikasi: vehicle.kubikasi,
      chassisNumber: vehicle.chassisNumber ?? '',
      revenueTarget: vehicle.revenueTarget,
      customer: vehicle.customerMaster?.name ?? '-',
      driver: vehicle.driverMaster?.name ?? '-',
      customerId: vehicle.customerId,
      driverId: vehicle.driverId,
      branchId: vehicle.branch.code,
      isActive: vehicle.isActive,
      inactiveReason: vehicle.inactiveReason ?? '',
    }
  })

  return NextResponse.json({ vehicles: formattedVehicles, statuses, notes, forecast })
}
