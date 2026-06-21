import {
  BRANCHES, VEHICLE_TYPES, CUSTOMERS, DRIVERS,
  daysInMonth, formatDateKey
} from './constants'
import { getStatusFlags, getAllStatuses } from './status-utils'
import type { Vehicle, StatusMap, KPIResult, AuditLog } from './types'

// ─── KPI ENGINE ───────────────────────────────────────────────────────────────
function getCategorySets() {
  const list = getAllStatuses()
  const groups: Record<string, string[]> = {}
  for (const s of list) {
    const g = s.group || 'OTHER'
    if (!groups[g]) groups[g] = []
    groups[g].push(s.code)
  }
  return {
    UTIL_SET:   groups['UTILISASI'] ?? [],
    RFU_SET:    groups['READY FOR USE'] ?? [],
    DELAY_SET:  groups['DELAY'] ?? [],
    DNA_SET:    [...(groups['DNA (DS HO)'] ?? []), ...(groups['DNA (HC CABANG)'] ?? [])],
    NWD_SET:    groups['NWD'] ?? [],
    UNR_SET:    groups['UNR'] ?? [],
  }
}

export function computeKPI(
  vehicleId: number,
  statuses: StatusMap,
  month: number,
  year: number
): KPIResult {
  const dim = daysInMonth(month, year)
  const vs = statuses[vehicleId] ?? {}
  const cats = getCategorySets()
  let filledDays = 0, pa = 0, ua = 0, prod = 0
  const counts: Record<string, number> = {}

  for (let d = 1; d <= dim; d++) {
    const dateKey = formatDateKey(year, month, d)
    const s = vs[dateKey]
    if (!s) continue
    filledDays++
    counts[s] = (counts[s] ?? 0) + 1
    const flags = getStatusFlags(s)
    if (flags.isPA)   pa++
    if (flags.isUA)   ua++
    if (flags.isPROD) prod++
  }

  const paVal  = filledDays > 0 ? ((pa   / filledDays) * 100).toFixed(1) : '0.0'
  const uaVal  = pa > 0       ? ((ua   / pa)          * 100).toFixed(1) : '0.0'
  const prVal  = ua > 0       ? ((prod / ua)          * 100).toFixed(1) : '0.0'

  return {
    pa: paVal, ua: uaVal, prod: prVal,
    filledDays,
    totalUTI:   counts['UTI'] ?? 0,
    totalUTIL:  cats.UTIL_SET.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    totalRFU:   cats.RFU_SET.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    totalBD:    (counts['BD'] ?? 0) + (counts['BDJ+1'] ?? 0),
    totalDELAY: cats.DELAY_SET.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    totalDNA:   cats.DNA_SET.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    totalNWD:   cats.NWD_SET.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    totalUNR:   cats.UNR_SET.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    totalAMAB:  (counts['AM'] ?? 0) + (counts['AB'] ?? 0),
    counts,
  }
}

export function kpiColorClass(val: string, good: number, warn: number) {
  const n = parseFloat(val)
  if (n >= good) return 'text-green-600'
  if (n >= warn)  return 'text-yellow-600'
  return 'text-red-600'
}

export function kpiBgStyle(val: string, good: number, warn: number): string {
  const n = parseFloat(val)
  if (n >= good) return '#dcfce7'
  if (n >= warn)  return '#fef9c3'
  return '#fee2e2'
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
export function seedVehicles(): Vehicle[] {
  const prefixes: Record<string, string[]> = {
    LMKS: ['DD','DW'], VLIM: ['DD','DB'],
    LSBY: ['L','W'],   LBDG: ['D','Z'], LMDN: ['BK','BA'],
  }
  const suffixes = ['SA','SV','SZ','SG','SCO','UL','UE']
  const tonases  = [1,3,4,5,8,12,20,25]
  const kubiks   = [7,7,7,7,20,33,49,50]
  const chassisPool = ['MHFE3CJX3PK0', 'MHFE3CJX4PK1', 'MHFE3CJX5PK2', 'MHFE3CJX6PK3', 'MHFE3CJX7PK4', '', '', '', '', '']
  const targetPool  = [50000000, 75000000, 100000000, 60000000, 80000000, 0, 0, 0, 0, 0]
  const vehicles: Vehicle[] = []
  let id = 1

  BRANCHES.forEach(branch => {
    const px = prefixes[branch.id] ?? ['XX']
    for (let i = 0; i < 10; i++) {
      const p   = px[i % px.length]
      const num = 8000 + Math.floor(Math.random() * 900)
      const sfx = suffixes[i % suffixes.length]
      vehicles.push({
        id,
        nopol:         `${p} ${num} ${sfx}`,
        type:          VEHICLE_TYPES[i % VEHICLE_TYPES.length],
        tonase:        tonases[i % tonases.length],
        kubikasi:      kubiks[i % kubiks.length],
        chassisNumber: chassisPool[i % chassisPool.length],
        revenueTarget: targetPool[i % targetPool.length],
        customer:      CUSTOMERS[i % CUSTOMERS.length],
        driver:        DRIVERS[(id + i) % DRIVERS.length],
        branchId:      branch.id,
        isActive:      Math.random() > 0.08,
        inactiveReason: '',
      })
      id++
    }
  })
  return vehicles
}

export function seedStatuses(vehicles: Vehicle[]): StatusMap {
  const pool = [
    'UTI','UTI','UTI','UTI','RFU','C','MB',
    'BD','AM','L','TK','BT','AS','BDJ-1','RFU','UTI',
  ]
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const map: StatusMap = {}

  vehicles.forEach(v => {
    map[v.id] = {}
    for (let d = 1; d <= today.getDate(); d++) {
      const dateKey = formatDateKey(year, month, d)
      map[v.id][dateKey] = pool[Math.floor(Math.random() * pool.length)]
    }
  })
  return map
}

export function demoLMKSMayStatuses(vehicles: Vehicle[]): StatusMap {
  const year = 2026
  const month = 5
  const codes = [
    'UTI','C','MB','RFU','RB','AM','BT','AS','BD','BDJ-1','BTJ','FM','AB','TAD','TK','L','AT','LNR','KR','MT-IN','MT-OUT'
  ]
  const map: StatusMap = {}

  vehicles
    .filter(v => v.branchId === 'LMKS')
    .forEach((v, idx) => {
      map[v.id] = {}
      for (let d = 1; d <= 31; d++) {
        const base = (d + idx) % codes.length
        const code = codes[base]
        map[v.id][formatDateKey(year, month, d)] = code
      }
    })

  return map
}

export function seedAuditLogs(): AuditLog[] {
  return [
    { ts: '2026-05-28 08:14', user: 'Admin LMKS',   action: 'Update Status',          detail: 'DD 8124 SA — Tgl 28: RFU → UTI' },
    { ts: '2026-05-28 08:05', user: 'Planner LMKS',  action: 'Copy Actual Yesterday',   detail: 'Branch LMKS — 10 unit disalin' },
    { ts: '2026-05-27 16:30', user: 'Planner LMKS',  action: 'Generate Forecast',       detail: 'Branch LMKS — 9 unit draft SYSTEM' },
    { ts: '2026-05-27 14:22', user: 'Admin LMKS',    action: 'Edit Master Data',         detail: 'DD 8456 UL — Driver diperbarui' },
    { ts: '2026-05-26 09:11', user: 'Admin VLIM',    action: 'Nonaktifkan Unit',         detail: 'DB 8201 SV — Alasan: Dijual' },
  ]
}

// ─── TIMESTAMP ───────────────────────────────────────────────────────────────
export function nowTimestamp(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}
