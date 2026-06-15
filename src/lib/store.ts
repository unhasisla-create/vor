'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Vehicle, StatusMap, NoteMap, ForecastMap, AuditLog, Branch, RevenueRecord } from '@/lib/types'
import { nowTimestamp } from '@/lib/utils'
import { formatDateKey, formatDateObjectKey } from '@/lib/constants'
import { setStatusCache } from '@/lib/status-utils'

interface VORStore {
  month: number
  year: number
  branch: string
  setMonth: (m: number) => void
  setYear: (y: number) => void
  setBranch: (b: string) => void
  setStatuses: (statuses: StatusMap) => void
  branches: Branch[]
  setBranches: (branches: Branch[]) => void
  loadBranches: () => Promise<void>

  revenues: RevenueRecord[]
  setRevenues: (revenues: RevenueRecord[]) => void
  loadRevenues: () => Promise<void>

  statusConfigs: any[]
  setStatusConfigs: (configs: any[]) => void
  loadStatusConfigs: () => Promise<void>

  vehicles: Vehicle[]
  statuses: StatusMap
  notes: NoteMap
  forecast: ForecastMap
  auditLogs: AuditLog[]

  addVehicle: (v: Omit<Vehicle, 'id'>) => void
  updateVehicle: (id: number, data: Partial<Vehicle>) => void
  deactivateVehicle: (id: number, reason: string) => void
  reactivateVehicle: (id: number) => void

  setStatus: (vehicleId: number, day: number, status: string, note?: string) => void
  copyActualYesterday: (branchId: string) => number
  copyActualRange: (branchId: string, sourceDate: string, targetStartDate: string, targetEndDate: string) => number
  copyForecastYesterday: (branchId: string) => number

  setForecast: (vehicleId: number, dateKey: string, status: string) => void
  generateForecastFromActual: (branchId: string) => number

  addAudit: (action: string, detail: string) => void

  _seeded: boolean
  seed: () => void
  initFromServer: () => Promise<void>
  loadFromServer: () => Promise<void>
  resetData: () => void
  isHydrated: boolean
  setHydrated: (v: boolean) => void
}

function postJson(url: string, body: unknown, method = 'POST') {
  return fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function normalizeBranchValue(value: string, branches: Branch[]) {
  if (value === 'ALL') return value
  const branch = branches.find(b => b.code === value || b.id === value)
  return branch?.code ?? value
}

export const useVORStore = create<VORStore>()(
  persist(
    (set, get) => ({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      branch: 'ALL',
      setMonth: (m) => { set({ month: m }); get().loadFromServer().catch(() => {}) },
      setYear: (y) => { set({ year: y }); get().loadFromServer().catch(() => {}) },
      setBranch: (b) => set(s => ({ branch: normalizeBranchValue(b, s.branches) })),
      setStatuses: (statuses) => set({ statuses }),
      setBranches: (branches) => set(s => ({ branches, branch: normalizeBranchValue(s.branch, branches) })),

      vehicles: [],
      statuses: {},
      notes: {},
      forecast: {},
      auditLogs: [],
      branches: [],
      revenues: [],
      statusConfigs: [],
      _seeded: false,

      seed: () => {
        get().initFromServer().catch(() => {})
      },

      isHydrated: false,
      setHydrated: (v) => set({ isHydrated: v }),

      initFromServer: async () => {
        await get().loadFromServer()
        await get().loadBranches()
        await get().loadStatusConfigs()
        set({ isHydrated: true })
      },

      loadFromServer: async () => {
        const { month, year } = get()
        const res = await fetch(`/api/operations?month=${month}&year=${year}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Gagal memuat data operasional.')
        const data = await res.json()
        set({
          vehicles: data.vehicles ?? [],
          statuses: data.statuses ?? {},
          notes: data.notes ?? {},
          forecast: data.forecast ?? {},
          _seeded: true,
        })
      },

      loadBranches: async () => {
        try {
          const res = await fetch('/api/admin/branches', { credentials: 'include' })
          if (!res.ok) return
          const data = await res.json()
          set({ branches: data.branches ?? data })
        } catch {
          return
        }
      },

      loadRevenues: async () => {
        try {
          const { month, year } = get()
          const res = await fetch(`/api/revenue?month=${month}&year=${year}`, { credentials: 'include' })
          if (!res.ok) return
          const data = await res.json()
          set({ revenues: data.records ?? [] })
        } catch {
          return
        }
      },

      setRevenues: (revenues) => set({ revenues }),

      setStatusConfigs: (configs) => {
        set({ statusConfigs: configs })
        setStatusCache(configs)
      },

      loadStatusConfigs: async () => {
        try {
          const res = await fetch('/api/statuses', { credentials: 'include' })
          if (!res.ok) return
          const data = await res.json()
          const configs = data.statuses ?? []
          set({ statusConfigs: configs })
          if (configs.length > 0) setStatusCache(configs)
        } catch {
          return
        }
      },

      resetData: () => {
        get().initFromServer().catch(() => {})
      },

      addVehicle: (data) => {
        const tempId = Date.now()
        set(s => ({
          vehicles: [...s.vehicles, { ...data, id: tempId }],
          statuses: { ...s.statuses, [tempId]: {} },
          notes: { ...s.notes, [tempId]: {} },
        }))

        postJson('/api/vehicles', data)
          .then(res => res.ok ? res.json() : Promise.reject(res))
          .then(payload => {
            if (!payload.vehicle) return
            set(s => ({
              vehicles: s.vehicles.map(v => v.id === tempId ? payload.vehicle : v),
              statuses: { ...s.statuses, [payload.vehicle.id]: s.statuses[tempId] ?? {} },
              notes: { ...s.notes, [payload.vehicle.id]: s.notes[tempId] ?? {} },
            }))
          })
          .catch(() => get().loadFromServer().catch(() => {}))
      },

      updateVehicle: (id, data) => {
        set(s => ({ vehicles: s.vehicles.map(v => v.id === id ? { ...v, ...data } : v) }))
        postJson(`/api/vehicles/${id}`, data, 'PATCH').catch(() => get().loadFromServer().catch(() => {}))
      },

      deactivateVehicle: (id, reason) => {
        set(s => ({ vehicles: s.vehicles.map(v => v.id === id ? { ...v, isActive: false, inactiveReason: reason } : v) }))
        postJson(`/api/vehicles/${id}`, { isActive: false, inactiveReason: reason }, 'PATCH').catch(() => get().loadFromServer().catch(() => {}))
      },

      reactivateVehicle: (id) => {
        set(s => ({ vehicles: s.vehicles.map(v => v.id === id ? { ...v, isActive: true, inactiveReason: '' } : v) }))
        postJson(`/api/vehicles/${id}`, { isActive: true, inactiveReason: '' }, 'PATCH').catch(() => get().loadFromServer().catch(() => {}))
      },

      setStatus: (vehicleId, day, status, note = '') => {
        const { month, year } = get()
        const date = formatDateKey(year, month, day)
        set(s => ({
          statuses: { ...s.statuses, [vehicleId]: { ...(s.statuses[vehicleId] ?? {}), [date]: status } },
          notes: { ...s.notes, [vehicleId]: { ...(s.notes[vehicleId] ?? {}), [date]: note } },
        }))
        const v = get().vehicles.find(x => x.id === vehicleId)
        get().addAudit('Update Status', `${v?.nopol} - ${date}: ${status}${note ? ` (${note})` : ''}`)
        postJson('/api/actuals', { vehicleId, date, status, note }).catch(() => get().loadFromServer().catch(() => {}))
      },

      copyActualYesterday: (branchId) => {
        const today = new Date()
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1)
        const todayKey = formatDateObjectKey(today)
        const yesterdayKey = formatDateObjectKey(yesterday)
        const vList = get().vehicles.filter(v => (branchId === 'ALL' ? true : v.branchId === branchId) && v.isActive)
        const statuses = { ...get().statuses }
        const notes = { ...get().notes }
        let copied = 0

        vList.forEach(v => {
          const status = get().statuses[v.id]?.[yesterdayKey]
          if (!status) return
          statuses[v.id] = { ...(statuses[v.id] ?? {}), [todayKey]: status }
          const note = get().notes[v.id]?.[yesterdayKey]
          if (note) {
            notes[v.id] = { ...(notes[v.id] ?? {}), [todayKey]: note }
          }
          copied++
        })

        set({ statuses, notes })
        get().addAudit('Copy Actual Yesterday', `Branch ${branchId} - ${copied} unit disalin`)
        postJson('/api/actuals/copy-actual-yesterday', { branchId }).then(() => get().loadFromServer()).catch(() => {})
        return copied
      },

      copyActualRange: (branchId, sourceDate, targetStartDate, targetEndDate) => {
        const targetKeys = (() => {
          const [ty, tm, td] = targetStartDate.split('-').map(Number)
          const [ey, em, ed] = targetEndDate.split('-').map(Number)
          const start = new Date(ty, tm - 1, td)
          const end = new Date(ey, em - 1, ed)
          const keys: string[] = []
          const current = new Date(start)
          while (current <= end) {
            keys.push(formatDateKey(current.getFullYear(), current.getMonth() + 1, current.getDate()))
            current.setDate(current.getDate() + 1)
          }
          return keys
        })()
        const vList = get().vehicles.filter(v => (branchId === 'ALL' ? true : v.branchId === branchId) && v.isActive)
        const statuses = { ...get().statuses }
        const notes = { ...get().notes }
        let copied = 0

        vList.forEach(v => {
          const status = get().statuses[v.id]?.[sourceDate]
          if (!status) return
          const note = get().notes[v.id]?.[sourceDate]
          statuses[v.id] = { ...(statuses[v.id] ?? {}) }
          if (note) notes[v.id] = { ...(notes[v.id] ?? {}) }
          targetKeys.forEach(key => {
            statuses[v.id][key] = status
            if (note) {
              notes[v.id][key] = note
            }
            copied++
          })
        })

        set({ statuses, notes })
        get().addAudit('Copy Actual Range', `Branch ${branchId} ${sourceDate} → ${targetStartDate}..${targetEndDate} - ${copied} sel disalin`)
        postJson('/api/actuals/copy-actual-range', { branchId, sourceDate, targetStartDate, targetEndDate })
          .then(() => get().loadFromServer()).catch(() => {})
        return copied
      },

      copyForecastYesterday: (branchId) => {
        const today = new Date()
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1)
        const todayKey = formatDateObjectKey(today)
        const yesterdayKey = formatDateObjectKey(yesterday)
        const vList = get().vehicles.filter(v => (branchId === 'ALL' ? true : v.branchId === branchId) && v.isActive)
        const statuses = { ...get().statuses }
        let copied = 0

        vList.forEach(v => {
          const item = get().forecast[v.id]?.[todayKey]
          if (!item?.status) return
          statuses[v.id] = { ...(statuses[v.id] ?? {}), [todayKey]: item.status }
          copied++
        })

        set({ statuses })
        get().addAudit('Copy Forecast Yesterday', `Branch ${branchId} - ${copied} unit dari forecast`)
        postJson('/api/actuals/copy-forecast-yesterday', { branchId }).then(() => get().loadFromServer()).catch(() => {})
        return copied
      },

      setForecast: (vehicleId, dateKey, status) => {
        set(s => ({
          forecast: {
            ...s.forecast,
            [vehicleId]: { ...(s.forecast[vehicleId] ?? {}), [dateKey]: { status, confidence: 'MANUAL' } },
          },
        }))
        const v = get().vehicles.find(x => x.id === vehicleId)
        get().addAudit('Update Forecast', `${v?.nopol} - ${dateKey}: ${status} [MANUAL]`)
        postJson('/api/forecasts', { vehicleId, date: dateKey, status, confidence: 'MANUAL' }).catch(() => get().loadFromServer().catch(() => {}))
      },

      generateForecastFromActual: (branchId) => {
        const today = new Date()
        const tomorrow = new Date()
        tomorrow.setDate(today.getDate() + 1)
        const todayKey = formatDateObjectKey(today)
        const tomorrowKey = formatDateObjectKey(tomorrow)
        const vList = get().vehicles.filter(v => (branchId === 'ALL' ? true : v.branchId === branchId) && v.isActive)
        const forecast = { ...get().forecast }
        let generated = 0

        vList.forEach(v => {
          const status = get().statuses[v.id]?.[todayKey]
          const existing = get().forecast[v.id]?.[tomorrowKey]
          if (!status || existing?.confidence === 'MANUAL') return
          forecast[v.id] = { ...(forecast[v.id] ?? {}), [tomorrowKey]: { status, confidence: 'SYSTEM' } }
          generated++
        })

        set({ forecast })
        get().addAudit('Generate Forecast', `Branch ${branchId} - ${generated} unit draft SYSTEM`)
        postJson('/api/forecasts/generate', { branchId }).then(() => get().loadFromServer()).catch(() => {})
        return generated
      },

      addAudit: (action, detail) => {
        try {
          const { getStoredUser } = require('@/lib/auth-client')
          const u = getStoredUser()
          const userLabel = u ? `${u.username} (${u.role})` : 'Anonymous'
          const entry: AuditLog = { ts: nowTimestamp(), user: userLabel, action, detail }
          set(s => ({ auditLogs: [entry, ...s.auditLogs].slice(0, 500) }))
        } catch {
          const entry: AuditLog = { ts: nowTimestamp(), user: 'Anonymous', action, detail }
          set(s => ({ auditLogs: [entry, ...s.auditLogs].slice(0, 500) }))
        }
      },
    }),
    {
      name: 'vor-system-v4',
      version: 2,
      partialize: (state) => ({
        month: state.month,
        year: state.year,
        branch: state.branch,
      }) as unknown as VORStore,
    }
  )
)
