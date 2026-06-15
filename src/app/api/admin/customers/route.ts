import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

async function nextCustomerCode() {
  const latest = await prisma.customer.findFirst({ orderBy: { code: 'desc' }, select: { code: true } })
  const n = Number(latest?.code?.replace(/^CUST-/, '') || '0') + 1
  return `CUST-${String(n).padStart(4, '0')}`
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['Admin', 'Management'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const customers = await prisma.customer.findMany({
    include: {
      _count: { select: { vehicles: true } },
      branch: { select: { name: true } },
    },
    orderBy: [{ code: 'asc' }],
  })

  return NextResponse.json({
    customers: customers.map(c => ({ ...c, vehicleCount: c._count.vehicles, branchName: c.branch?.name ?? null })),
  })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim() || await nextCustomerCode()
  const branchId = body.branchId || null
  if (!name) return NextResponse.json({ error: 'Nama customer wajib diisi.' }, { status: 400 })

  try {
    const customer = await prisma.customer.create({
      data: { code, name, branchId },
    })
    await prisma.auditLog.create({ data: { user: `${session.username} (${session.role})`, action: 'Create Customer', detail: `${code} - ${name}` } })
    return NextResponse.json({ ok: true, customer })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan customer.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
