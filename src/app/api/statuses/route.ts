import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function GET() {
  try {
    const statuses = await prisma.statusConfig.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ statuses })
  } catch {
    return NextResponse.json({ error: 'Gagal memuat konfigurasi status.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { code, desc, group, color, details, isForecast, sortOrder } = body
  if (!code || !desc || !group || !color) {
    return NextResponse.json({ error: 'Code, desc, group, color wajib diisi.' }, { status: 400 })
  }

  try {
    const existing = await prisma.statusConfig.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: `Kode "${code}" sudah ada.` }, { status: 409 })
    }
    const status = await prisma.statusConfig.create({
      data: {
        code,
        desc,
        group,
        color,
        details: details ?? '',
        isForecast: isForecast ?? true,
        sortOrder: sortOrder ?? 0,
      },
    })
    await prisma.auditLog.create({
      data: {
        user: `${session.username} (${session.role})`,
        action: 'Create Status Config',
        detail: `Status "${code}" ditambahkan`,
      },
    })
    return NextResponse.json({ status }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat status.' }, { status: 500 })
  }
}
