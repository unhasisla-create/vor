import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'
import type { Role } from '@prisma/client'

function toPrismaRole(role: string): Role | null {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'PLANNER') return 'PLANNER'
  if (normalized === 'SUPERVISOR') return 'SUPERVISOR'
  if (normalized === 'MANAGEMENT') return 'MANAGEMENT'
  return null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, role, branchCode, isActive } = body
  const data: any = {}

  if (name !== undefined) data.name = name
  if (role !== undefined) {
    const prismaRole = toPrismaRole(role)
    if (!prismaRole) return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    data.role = prismaRole
  }
  if (isActive !== undefined) data.isActive = !!isActive
  if (branchCode !== undefined) {
    const branch = branchCode ? await prisma.branch.findUnique({ where: { code: branchCode } }) : null
    data.branchId = branch?.id ?? null
  }

  try {
    const user = await prisma.user.update({ where: { id: params.id }, data })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Update User', detail: `${user.username} - updates: ${JSON.stringify(data)}` } })
    return NextResponse.json({ ok: true, user })
  } catch (e) {
    return NextResponse.json({ error: 'Could not update user', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const user = await prisma.user.update({ where: { id: params.id }, data: { isActive: false } })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Deactivate User', detail: `${user.username} set isActive=false` } })
    return NextResponse.json({ ok: true, user })
  } catch (e) {
    return NextResponse.json({ error: 'Could not delete user', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
