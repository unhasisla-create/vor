import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

async function nextDriverCode() {
  const latest = await prisma.driver.findFirst({ orderBy: { code: 'desc' }, select: { code: true } })
  const n = Number(latest?.code?.replace(/^DRV-/, '') || '0') + 1
  return `DRV-${String(n).padStart(4, '0')}`
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['Admin', 'Management'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const drivers = await prisma.driver.findMany({
    include: {
      branch: { select: { code: true, name: true } },
      _count: { select: { vehicles: true } },
    },
    orderBy: [{ code: 'asc' }],
  })

  return NextResponse.json({
    drivers: drivers.map(d => ({ ...d, branch: d.branch?.code ?? null, vehicleCount: d._count.vehicles })),
  })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim() || await nextDriverCode()
  if (!name) return NextResponse.json({ error: 'Nama driver wajib diisi.' }, { status: 400 })

  const branch = body.branchCode ? await prisma.branch.findUnique({ where: { code: body.branchCode } }) : null

  try {
    const driver = await prisma.driver.create({
      data: { code, name, phone: body.phone || null, branchId: branch?.id },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Create Driver', detail: `${code} - ${name}` } })
    return NextResponse.json({ ok: true, driver })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan driver.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
