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
  if (body.branchId !== undefined) data.branchId = body.branchId || null
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.inactiveReason !== undefined) data.inactiveReason = body.inactiveReason || null

  try {
    const customer = await prisma.customer.update({ where: { id: params.id }, data })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Update Customer', detail: `${customer.code} - ${customer.name}` } })
    return NextResponse.json({ ok: true, customer })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memperbarui customer.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false, inactiveReason: body.reason || null },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Deactivate Customer', detail: `${customer.code} - ${customer.name}` } })
    return NextResponse.json({ ok: true, customer })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menonaktifkan customer.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
