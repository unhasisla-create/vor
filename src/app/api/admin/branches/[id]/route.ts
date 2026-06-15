import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { code, name, isActive } = body
  const data: any = {}
  if (code !== undefined) data.code = code
  if (name !== undefined) data.name = name
  if (isActive !== undefined) data.isActive = !!isActive

  try {
    const branch = await prisma.branch.update({ where: { id: params.id }, data })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Update Branch', detail: `${branch.code} — updates: ${JSON.stringify(data)}` } })
    return NextResponse.json({ ok: true, branch })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Kode cabang sudah digunakan.' }, { status: 400 })
    return NextResponse.json({ error: 'Could not update branch', details: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // soft-delete: mark isActive = false
    const branch = await prisma.branch.update({ where: { id: params.id }, data: { isActive: false } })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Deactivate Branch', detail: `${branch.code} set isActive=false` } })
    return NextResponse.json({ ok: true, branch })
  } catch (e) {
    return NextResponse.json({ error: 'Could not delete branch', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
