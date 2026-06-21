import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['desc', 'group', 'color', 'details', 'isForecast', 'sortOrder', 'isActive', 'isPA', 'isUA', 'isPROD']
  const data: any = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang dikirim.' }, { status: 400 })
  }

  try {
    const status = await prisma.statusConfig.update({
      where: { code: params.code },
      data,
    })
    await prisma.auditLog.create({
      data: {
        user: `${session.username} (${session.role})`,
        action: 'Edit Status Config',
        detail: `Status "${params.code}" diperbarui`,
      },
    })
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui status.' }, { status: 500 })
  }
}
