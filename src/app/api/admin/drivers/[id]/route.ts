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
  if (body.phone !== undefined) data.phone = body.phone || null
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.inactiveReason !== undefined) data.inactiveReason = body.inactiveReason || null
  if (body.branchCode !== undefined) {
    const branch = body.branchCode ? await prisma.branch.findUnique({ where: { code: body.branchCode } }) : null
    data.branchId = branch?.id ?? null
  }

  try {
    const driver = await prisma.driver.update({ where: { id: params.id }, data })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Update Driver', detail: `${driver.code} - ${driver.name}` } })
    return NextResponse.json({ ok: true, driver })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memperbarui driver.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  try {
    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: { isActive: false, inactiveReason: body.reason || null },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Deactivate Driver', detail: `${driver.code} - ${driver.name}` } })
    return NextResponse.json({ ok: true, driver })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menonaktifkan driver.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
