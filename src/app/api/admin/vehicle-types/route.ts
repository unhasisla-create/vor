import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

async function nextVehicleTypeCode() {
  const latest = await prisma.vehicleType.findFirst({ orderBy: { code: 'desc' }, select: { code: true } })
  const n = Number(latest?.code?.replace(/^VT-/, '') || '0') + 1
  return `VT-${String(n).padStart(4, '0')}`
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['Admin', 'Management'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const vehicleTypes = await prisma.vehicleType.findMany({
    orderBy: [{ code: 'asc' }],
  })

  // Count only ACTIVE vehicles per type
  const counts = await prisma.vehicle.groupBy({
    by: ['type'],
    where: { isActive: true },
    _count: { type: true }
  })

  const countMap = counts.reduce((acc, curr) => {
    acc[curr.type] = curr._count.type
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    vehicleTypes: vehicleTypes.map(vt => ({ ...vt, vehicleCount: countMap[vt.name] || 0 })),
  })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim() || await nextVehicleTypeCode()
  if (!name) return NextResponse.json({ error: 'Vehicle Type name is required.' }, { status: 400 })

  try {
    const vehicleType = await prisma.vehicleType.create({
      data: { code, name },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Create Vehicle Type', detail: `${code} - ${name}` } })
    return NextResponse.json({ ok: true, vehicleType })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save Vehicle Type.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
