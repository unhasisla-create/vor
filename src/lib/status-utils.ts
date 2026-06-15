import { STATUS_MASTER } from './constants'

let _cached: any[] | null = null

export function setStatusCache(configs: any[]) {
  _cached = configs
}

function source(code: string) {
  const match = _cached?.find(s => s.code === code)
  if (match) return match
  const fallback = STATUS_MASTER.find(s => s.code === code)
  if (fallback) return { ...fallback, isForecast: fallback.fc ?? true }
  return null
}

export function getStatusColor(code: string): string {
  return source(code)?.color ?? '#e5e7eb'
}

export function getStatusMeta(code: string) {
  return source(code)
}

export function getTextColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#111827'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#111827' : '#ffffff'
}

export function getActiveStatuses() {
  if (_cached) return _cached
  return STATUS_MASTER.map((s: any) => ({ ...s, isForecast: s.fc ?? true }))
}
