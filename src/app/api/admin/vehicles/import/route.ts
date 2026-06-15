import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['Admin', 'Management', 'Planner'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { vehicles } = body

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json({ error: 'No valid vehicles provided for import.' }, { status: 400 })
    }

    // Prepare data
    const dataToInsert = []
    const auditDetails = []

    for (const v of vehicles) {
      // Basic validation
      if (!v.nopol || !v.type || !v.branchId) {
         continue // Skip invalid at backend, though frontend should have filtered them
      }

      dataToInsert.push({
        nopol: String(v.nopol).trim(),
        type: String(v.type).trim(),
        tonase: Number(v.tonase) || 1,
        kubikasi: Number(v.kubikasi) || 7,
        chassisNumber: v.chassisNumber || null,
        revenueTarget: Number(v.revenueTarget) || 0,
        branchId: String(v.branchId).trim(),
        customerId: v.customerId || null,
        driverId: v.driverId || null,
        isActive: true,
      })
      auditDetails.push(v.nopol)
    }

    if (dataToInsert.length === 0) {
      return NextResponse.json({ error: 'All provided rows were invalid or skipped.' }, { status: 400 })
    }

    // Use createMany to insert them
    const result = await prisma.vehicle.createMany({
      data: dataToInsert,
      skipDuplicates: true, // Will skip if nopol already exists
    })

    if (result.count > 0) {
      await prisma.auditLog.create({
        data: {
          user: `${session.username} (${session.role})`,
          action: 'Bulk Import Vehicles',
          detail: `Imported ${result.count} vehicles: ${auditDetails.slice(0, 5).join(', ')}${auditDetails.length > 5 ? '...' : ''}`
        }
      })
    }

    return NextResponse.json({
      ok: true,
      imported: result.count,
      totalRequested: dataToInsert.length
    })

  } catch (e) {
    console.error('Import Error:', e)
    return NextResponse.json({ error: 'Failed to import vehicles.', details: (e as any)?.message ?? String(e) }, { status: 500 })
  }
}
