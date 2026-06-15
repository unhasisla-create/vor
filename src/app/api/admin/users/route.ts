import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession, hashPassword } from '@/lib/auth'
import type { Role } from '@prisma/client'

function toPrismaRole(role: string): Role | null {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'PLANNER') return 'PLANNER'
  if (normalized === 'SUPERVISOR') return 'SUPERVISOR'
  if (normalized === 'MANAGEMENT') return 'MANAGEMENT'
  return null
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    where: { username: { not: 'superadmin' } },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      branch: { select: { code: true } },
      isActive: true,
      createdAt: true,
    },
    orderBy: { username: 'asc' },
  })

  return NextResponse.json({
    users: users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branch: user.branch?.code ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { username, name, password, role, branchCode } = body
  if (!username || !password || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (String(username).toLowerCase() === 'superadmin') return NextResponse.json({ error: 'Username superadmin tidak digunakan lagi.' }, { status: 400 })

  const prismaRole = toPrismaRole(role)
  if (!prismaRole) return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })

  const branch = branchCode ? await prisma.branch.findUnique({ where: { code: branchCode } }) : null
  const passwordHash = await hashPassword(password)

  try {
    const user = await prisma.user.create({
      data: { username, name, passwordHash, role: prismaRole, branchId: branch?.id },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Create User', detail: `${username} - role: ${prismaRole}` } })
    return NextResponse.json({ ok: true, user })
  } catch (e) {
    return NextResponse.json({ error: 'Could not create user', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
