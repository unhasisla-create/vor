import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['Admin', 'Management'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const branches = await prisma.branch.findMany({ orderBy: { code: 'asc' } })
  return NextResponse.json({ branches })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { code, name } = body
  if (!code || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  try {
    const b = await prisma.branch.create({ data: { code, name } })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Create Branch', detail: `${code} — ${name}` } })
    return NextResponse.json({ ok: true, branch: b })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Kode cabang sudah digunakan.' }, { status: 400 })
    return NextResponse.json({ error: 'Could not create branch', details: e?.message ?? String(e) }, { status: 500 })
  }
}
