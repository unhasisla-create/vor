import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, detail } = body
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  try {
    const userLabel = `${session.username} (${session.role})`
    const entry = await prisma.auditLog.create({ data: { user: userLabel, action, detail: detail ?? '' } })
    return NextResponse.json({ ok: true, entry })
  } catch (e) {
    return NextResponse.json({ error: 'Could not write audit', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['Admin', 'Planner', 'Supervisor'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const where = session.role === 'Admin' || session.branch === 'ALL'
      ? {}
      : await buildBranchAuditWhere(session.branch)
    const logs = await prisma.auditLog.findMany({ where, orderBy: { ts: 'desc' }, take: 500 })
    const mapped = logs.map(l => ({ ts: l.ts.toISOString(), user: l.user, action: l.action, detail: l.detail }))
    return NextResponse.json({ logs: mapped })
  } catch (e) {
    return NextResponse.json({ error: 'Could not read audits', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}

async function buildBranchAuditWhere(branchCode: string) {
  const [vehicles, users] = await Promise.all([
    prisma.vehicle.findMany({
      where: { branch: { code: branchCode } },
      select: { nopol: true },
    }),
    prisma.user.findMany({
      where: { branch: { code: branchCode } },
      select: { username: true },
    }),
  ])

  return {
    OR: [
      { detail: { contains: branchCode, mode: 'insensitive' as const } },
      ...vehicles.map(vehicle => ({ detail: { contains: vehicle.nopol, mode: 'insensitive' as const } })),
      ...users.map(user => ({ user: { contains: user.username, mode: 'insensitive' as const } })),
    ],
  }
}
