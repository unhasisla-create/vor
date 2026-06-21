import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function GET() {
  try {
    const configs = await prisma.kpiConfig.findMany({ orderBy: { metric: 'asc' } })
    return NextResponse.json({ configs })
  } catch {
    return NextResponse.json({ error: 'Gagal memuat konfigurasi KPI.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { metric, label, goodThreshold, warnThreshold } = body
  if (!metric || goodThreshold === undefined || warnThreshold === undefined) {
    return NextResponse.json({ error: 'metric, goodThreshold, warnThreshold wajib diisi.' }, { status: 400 })
  }

  try {
    const config = await prisma.kpiConfig.upsert({
      where: { metric },
      update: { label, goodThreshold, warnThreshold },
      create: { metric, label, goodThreshold, warnThreshold },
    })
    await prisma.auditLog.create({
      data: {
        user: `${session.username} (${session.role})`,
        action: 'Edit KPI Config',
        detail: `KPI "${metric}" diperbarui: good=${goodThreshold}, warn=${warnThreshold}`,
      },
    })
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui konfigurasi KPI.' }, { status: 500 })
  }
}
