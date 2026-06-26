// ─── ENTITIES ────────────────────────────────────────────────────────────────
export interface Branch {
  id: string
  name: string
  code: string
  isActive?: boolean
}

export interface UserSession {
  id: string
  username: string
  name: string
  role: 'Admin' | 'Planner' | 'Supervisor' | 'Management'
  branch: string
}

export type Role = UserSession['role']

export interface Vehicle {
  id: number
  nopol: string
  type: string
  tonase: number
  kubikasi: number
  chassisNumber: string
  revenueTarget: number
  customer: string
  driver: string
  customerId?: string | null
  driverId?: string | null
  branchId: string
  isActive: boolean
  inactiveReason: string
}

export interface StatusMeta {
  code: string
  desc: string
  group: string
  color: string
  pa: boolean
  ua: boolean
  prod: boolean
  copy: boolean
  fc: boolean
}

// ─── OPERATIONAL DATA ────────────────────────────────────────────────────────
// statuses[vehicleId]["YYYY-MM-DD"] = statusCode
export type StatusMap = Record<number, Record<string, string>>

// notes[vehicleId]["YYYY-MM-DD"] = note string
export type NoteMap = Record<number, Record<string, string>>

// forecast[vehicleId]["YYYY-MM-DD"] = { status, confidence }
export type ForecastMap = Record<number, Record<string, ForecastCell>>

export interface ForecastCell {
  status: string
  confidence: 'SYSTEM' | 'MANUAL'
}

// ─── KPI ─────────────────────────────────────────────────────────────────────
export interface KPIResult {
  pa: string
  ua: string
  filledDays: number
  totalUTI: number
  totalUTIL: number
  totalRFU: number
  totalBD: number
  totalDELAY: number
  totalDNA: number
  totalNWD: number
  totalUNR: number
  totalAMAB: number
  counts: Record<string, number>
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────
export interface AuditLog {
  ts: string
  user: string
  action: string
  detail: string
}

// ─── FVA ─────────────────────────────────────────────────────────────────────
export type DeviationResult = 'MATCH' | 'CHANGED' | 'MAJOR_DEVIATION'

// ─── REVENUE ──────────────────────────────────────────────────────────────────
export interface RevenueRecord {
  id?: string
  date: string
  branchId: string
  nopol: string
  typeUnit: string
  targetPerUnit: number
  achRevenue: number
  bop: number
}
