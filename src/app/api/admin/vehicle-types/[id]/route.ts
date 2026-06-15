import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const data: any = {}
  if (body.code !== undefined) data.code = String(body.code).trim()
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.inactiveReason !== undefined) data.inactiveReason = body.inactiveReason || null

  try {
    const vehicleType = await prisma.vehicleType.update({ where: { id: params.id }, data })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Update Vehicle Type', detail: `${vehicleType.code} - ${vehicleType.name}` } })
    return NextResponse.json({ ok: true, vehicleType })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update Vehicle Type.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  try {
    const vehicleType = await prisma.vehicleType.update({
      where: { id: params.id },
      data: { isActive: false, inactiveReason: body.reason || null },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Deactivate Vehicle Type', detail: `${vehicleType.code} - ${vehicleType.name}` } })
    return NextResponse.json({ ok: true, vehicleType })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to deactivate Vehicle Type.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
