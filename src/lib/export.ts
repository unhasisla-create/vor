import type { Vehicle, StatusMap, NoteMap } from './types'
import { MONTH_NAMES, daysInMonth } from './constants'
import { computeKPI } from './utils'

/**
 * Export monthly actual operation matrix to .xlsx
 * Uses dynamic import so xlsx only loads when needed (client-side)
 */
export async function exportActualToXLSX(
  vehicles: Vehicle[],
  statuses: StatusMap,
  notes: NoteMap,
  month: number,
  year: number,
  branchName: string
): Promise<void> {
  // Dynamic import — only runs in browser
  const XLSX = await import('xlsx')

  const dim   = daysInMonth(month, year)
  const today = new Date()

  // ── Header row ──────────────────────────────────────────────────────────────
  const dayHeaders = Array.from({ length: dim }, (_, i) => `${i + 1}`)
  const headers = [
    'No', 'Nopol', 'Tipe', 'Tonase', 'Kubikasi', 'Customer', 'Driver',
    ...dayHeaders,
    'Utilisasi', 'Ready For Use', 'Breakdown', 'Delay', 'DNA', 'Libur', 'Unready',
    'PA (%)', 'UA (%)', 'Productivity (%)',
  ]

  // ── Data rows ────────────────────────────────────────────────────────────────
  const rows = vehicles
    .filter(v => v.isActive)
    .map((v, i) => {
      const kpi      = computeKPI(v.id, statuses, month, year)
      const dayData  = Array.from({ length: dim }, (_, j) => {
        const dateKey = `${year}-${month}-${j + 1}`
        return statuses[v.id]?.[dateKey] ?? ''
      })
      return [
        i + 1, v.nopol, v.type, v.tonase, v.kubikasi, v.customer, v.driver,
        ...dayData,
        kpi.totalUTIL, kpi.totalRFU, kpi.totalBD, kpi.totalDELAY, kpi.totalDNA, kpi.totalNWD, kpi.totalUNR,
        parseFloat(kpi.pa), parseFloat(kpi.ua), parseFloat(kpi.prod),
      ]
    })

  // ── Build worksheet ──────────────────────────────────────────────────────────
  const wsData = [headers, ...rows]
  const ws     = XLSX.utils.aoa_to_sheet(wsData)

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 14 }, { wch: 18 }, { wch: 6 }, { wch: 7 },
    { wch: 14 }, { wch: 18 },
    ...Array(dim).fill({ wch: 5 }),
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 12 },
  ]

  // ── Workbook ────────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${MONTH_NAMES[month - 1]} ${year}`)

  // ── Download ────────────────────────────────────────────────────────────────
  const fileName = `VOR_${branchName}_${MONTH_NAMES[month - 1]}_${year}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * Export KPI summary per branch to .xlsx
 */
export async function exportKPIToXLSX(
  rows: Array<{
    nopol: string; type: string; branch: string;
    pa: string; ua: string; prod: string;
    totalUTI: number; totalRFU: number; totalBD: number
  }>,
  month: number,
  year: number
): Promise<void> {
  const XLSX = await import('xlsx')

  const headers = ['No', 'Nopol', 'Tipe', 'Cabang', '∑UTI', '∑RFU', '∑BD', 'PA (%)', 'UA (%)', 'Prod (%)']
  const data = rows.map((r, i) => [
    i + 1, r.nopol, r.type, r.branch,
    r.totalUTI, r.totalRFU, r.totalBD,
    parseFloat(r.pa), parseFloat(r.ua), parseFloat(r.prod),
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  ws['!cols'] = [{ wch:4 },{ wch:14 },{ wch:18 },{ wch:10 },{ wch:7 },{ wch:7 },{ wch:7 },{ wch:8 },{ wch:8 },{ wch:8 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `KPI ${MONTH_NAMES[month-1]} ${year}`)
  XLSX.writeFile(wb, `VOR_KPI_${MONTH_NAMES[month-1]}_${year}.xlsx`)
}
