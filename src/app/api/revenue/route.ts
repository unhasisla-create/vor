import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const branchId = url.searchParams.get('branchId')
    const month = url.searchParams.get('month')
    const year = url.searchParams.get('year')

    const where: any = {}
    if (branchId) where.branchId = branchId
    if (month && year) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = `${year}-${String(month).padStart(2, '0')}-31`
      where.date = { gte: start, lte: end }
    }

    const records = await prisma.revenueRecord.findMany({ where, orderBy: [{ date: 'asc' }, { branchId: 'asc' }, { nopol: 'asc' }] })
    return NextResponse.json({ records })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch revenue records' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { updates } = await req.json()

    // Validasi: pastikan setiap nopol milik branch yang sesuai
    const nopolList = updates.map((u: any) => u.nopol)
    const vehicles = await prisma.vehicle.findMany({
      where: { nopol: { in: nopolList } },
      select: { nopol: true, branch: { select: { code: true } } },
    })
    const vehicleMap = new Map(vehicles.map(v => [v.nopol, v.branch.code]))

    const errors: string[] = []
    updates.forEach((u: any) => {
      const actualBranch = vehicleMap.get(u.nopol)
      if (!actualBranch) {
        errors.push(`Nopol "${u.nopol}" tidak ditemukan di database`)
      } else if (actualBranch !== u.branchId) {
        errors.push(`Nopol "${u.nopol}" milik cabang ${actualBranch}, bukan ${u.branchId}`)
      }
    })

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validasi gagal', details: errors }, { status: 400 })
    }

    const results = await prisma.$transaction(
      updates.map((update: any) =>
        prisma.revenueRecord.upsert({
          where: {
            date_branchId_nopol: {
              date: update.date,
              branchId: update.branchId,
              nopol: update.nopol,
            }
          },
          update: {
            typeUnit: update.typeUnit,
            targetPerUnit: update.targetPerUnit,
            achRevenue: update.achRevenue,
            bop: update.bop,
          },
          create: {
            date: update.date,
            branchId: update.branchId,
            nopol: update.nopol,
            typeUnit: update.typeUnit,
            targetPerUnit: update.targetPerUnit,
            achRevenue: update.achRevenue,
            bop: update.bop,
          }
        })
      )
    )

    if (updates.length > 0) {
      await prisma.auditLog.create({
        data: {
          user: `${session.username} (${session.role})`,
          action: 'Update Revenue',
          detail: `Memperbarui ${results.length} data revenue untuk cabang ${updates[0].branchId}`
        }
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Revenue update error:', error)
    return NextResponse.json({ error: 'Failed to update revenue records' }, { status: 500 })
  }
}
