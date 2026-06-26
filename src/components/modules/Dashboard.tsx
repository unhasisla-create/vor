'use client'
import { useMemo, useState, useEffect } from 'react'
import { useVORStore } from '@/lib/store'
import { BRANCHES, MONTH_NAMES, formatDateKey, VEHICLE_TYPES, CUSTOMERS } from '@/lib/constants'
import { getStatusColor, getStatusMeta, getAllStatuses, getStatusFlags } from '@/lib/status-utils'
import { computeKPI } from '@/lib/utils'
import { getStoredUser } from '@/lib/auth-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Activity, Truck, AlertTriangle, CheckCircle2, Clock, ShieldAlert, ChevronDown, DollarSign, Filter, X } from 'lucide-react'
import { Tabs, showToast, Select } from '@/components/ui'
import type { RevenueRecord } from '@/lib/types'

const BD_CODES = ['BD', 'BDJ+1']

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatDateLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
}

let _statusColors: Record<string,string> = {}
getAllStatuses().forEach((s: any) => { _statusColors[s.code] = s.color })
function getSC(code: string) { return _statusColors[code] ?? getStatusColor(code) }

const todayISO = toIsoDate(new Date())

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.88)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '12px 16px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      minWidth: 160,
    }}>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginBottom:8, letterSpacing:'0.05em' }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.fill || p.color, flexShrink:0 }} />
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>{p.dataKey}</span>
          <span style={{ color:'#fff', fontSize:13, fontWeight:700, marginLeft:'auto', paddingLeft:12 }}>
            {typeof p.value === 'number' && p.dataKey.includes('%') ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function KpiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.88)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '12px 16px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      minWidth: 140,
    }}>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginBottom:8 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.fill || p.color, flexShrink:0 }} />
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>{p.name || p.dataKey}</span>
          <span style={{ color:'#fff', fontSize:13, fontWeight:700, marginLeft:'auto', paddingLeft:12 }}>{typeof p.value === 'number' ? (p.value >= 1000000 ? `${(p.value/1000000).toFixed(1)}jt` : p.value >= 1000 ? `${(p.value/1000).toFixed(0)}rb` : p.value) : p.value}{typeof p.value === 'number' && !p.dataKey.toLowerCase().includes('target') && !p.dataKey.toLowerCase().includes('actual') && !p.dataKey.toLowerCase().includes('bop') ? '%' : ''}</span>
        </div>
      ))}
    </div>
  )
}

function FilterSelect({ value, onChange, disabled, children }: any) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} disabled={disabled}
        className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#3D6B60] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm transition-all hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[#7A9E94] min-w-[160px]">
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A9E94] pointer-events-none" />
    </div>
  )
}

function MetricCard({ label, value, sub, color, icon: Icon, trend }: {
  label: string; value: string|number; sub?: string; color: string; icon?: any; trend?: 'up'|'down'|'flat'
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#E17055' : '#94a3b8'
  return (
    <div className="group relative bg-white rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-all duration-300 group-hover:top-2 group-hover:bottom-2"
        style={{ background: `linear-gradient(to bottom, ${color}, ${color}88)` }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top right, ${color}08, transparent 70%)` }} />
      <div className="relative pl-3">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-bold text-[#7A9E94] uppercase tracking-widest">{label}</p>
          {Icon && (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ background: `${color}12` }}>
              <Icon size={15} style={{ color }} />
            </div>
          )}
        </div>
        <p className="text-[32px] font-extrabold tracking-tight leading-none mb-1.5 tabular-nums"
          style={{ color, textShadow: `0 0 24px ${color}33` }}>{value}</p>
        <div className="flex items-center gap-2">
          {sub && <p className="text-[11px] text-[#7A9E94] font-medium">{sub}</p>}
          {trend && (
            <TrendIcon size={13} style={{ color: trendColor }} />
          )}
        </div>
      </div>
    </div>
  )
}

function MinimalBadge({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon?: any }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-white shadow-sm"
      style={{ borderColor: `${color}30` }}>
      {Icon && <Icon size={12} style={{ color }} />}
      <span className="text-[11px] font-medium text-[#4A6B60]">{label}:</span>
      <span className="text-[12px] font-bold" style={{ color }}>{count}</span>
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[14px] font-bold text-[#2C4A42]">{title}</h3>
      {sub && <p className="text-[12px] text-[#7A9E94] mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-6 flex flex-col ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px_32px rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(15,23,42,0.88)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '12px 16px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      minWidth: 140,
    }}>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginBottom:6 }}>Hari ke-{label}</p>
      <p style={{ color:'#60a5fa', fontSize:22, fontWeight:800, lineHeight:1.1 }}>{d.utilization}%</p>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginTop:4 }}>{d.activeFleet} unit dengan data</p>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Vehicle Performance')
  const { month, year, setMonth, setYear, vehicles, statuses, branches, branch, setBranch, revenues, loadRevenues, kpiConfigs } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')

  const kpiThreshold = (metric: string) => {
    const cfg = kpiConfigs.find((c: any) => c.metric === metric)
    return { good: cfg?.goodThreshold ?? 90, warn: cfg?.warnThreshold ?? 75, label: cfg?.label ?? `Target ≥ 90%` }
  }
  const paCfg = kpiThreshold('PA')
  const uaCfg = kpiThreshold('UA')

  useEffect(() => {
    if (user?.branch && user.branch !== 'ALL' && branch !== user.branch) {
      setBranch(user.branch)
    }
  }, [branch, setBranch, user])

  useEffect(() => { loadRevenues() }, [loadRevenues])

  const branchOptions = branches.length ? branches.filter(b => b.isActive ?? true) : BRANCHES

  // Default: tanggal 1 bulan ini s.d hari ini (Month-to-Date)
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [dateEnd, setDateEnd] = useState(() => toIsoDate(new Date()))

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number)
    if (y !== year || m !== month) {
      setYear(y)
      setMonth(m)
    }
  }, [selectedDate, year, month, setYear, setMonth])

  const [selectedCustomer, setSelectedCustomer] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [revenuePage, setRevenuePage] = useState(1)
  const [sortByBD, setSortByBD] = useState(false)
  const pageSize = 10



  const filteredVehicles = useMemo(() =>
    vehicles.filter(v => {
      if (!v.isActive) return false
      if (branch !== 'ALL' && v.branchId !== branch) return false
      if (selectedCustomer !== 'ALL' && v.customer !== selectedCustomer) return false
      if (selectedType !== 'ALL' && v.type !== selectedType) return false
      return true
    }), [vehicles, branch, selectedCustomer, selectedType])

  const allKPIs = useMemo(() =>
    filteredVehicles.map(v => ({ v, kpi: computeKPI(v.id, statuses, month, year) })),
    [filteredVehicles, statuses, month, year])

  const totalPages = Math.ceil(allKPIs.length / pageSize) || 1
  const paginatedKPIs = useMemo(() => {
    const sorted = sortByBD ? [...allKPIs].sort((a, b) => b.kpi.totalBD - a.kpi.totalBD) : allKPIs
    return sorted.slice((page - 1) * pageSize, page * pageSize)
  }, [allKPIs, page, pageSize, sortByBD])

  const totalActive = filteredVehicles.length

  const formatRp = (num: number) => {
    if (!num) return 'Rp0'
    return 'Rp' + Math.round(num).toLocaleString('id-ID')
  }

  const activeVehiclesBranch = useMemo(() =>
    vehicles.filter(v => v.isActive && (branch === 'ALL' || v.branchId === branch)),
  [vehicles, branch])

  const dateRangeKeys = useMemo(() => {
    const keys: string[] = []
    const s = new Date(selectedDate), e = new Date(dateEnd)
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      keys.push(formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()))
    }
    return keys
  }, [selectedDate, dateEnd])

  // ── Agregasi dinamis PA / UA / BD sesuai dateRangeKeys dari filter ──────
  const rangeKPI = useMemo(() => {
    let totalPA = 0, totalUA = 0, totalBD = 0, totalFilled = 0
    filteredVehicles.forEach(v => {
      let vPA = 0, vUA = 0, vBD = 0, vFilled = 0
      dateRangeKeys.forEach(dk => {
        const code = statuses[v.id]?.[dk]
        if (!code) return
        vFilled++
        const flags = getStatusFlags(code)
        if (flags.isPA) vPA++
        if (flags.isUA) vUA++
        if (BD_CODES.includes(code)) vBD++
      })
      if (vFilled > 0) {
        totalPA += (vPA / vFilled) * 100
        totalUA += vFilled > 0 ? (vUA / vFilled) * 100 : 0
        totalFilled++
      }
      totalBD += vBD
    })
    const n = totalFilled || 1
    return {
      avgPA: (totalPA / n).toFixed(1),
      avgUA: (totalUA / n).toFixed(1),
      totalBD,
    }
  }, [filteredVehicles, statuses, dateRangeKeys])

  const avgPA = rangeKPI.avgPA
  const avgUA = rangeKPI.avgUA
  const totalBD = rangeKPI.totalBD

  const revenueDateKeys = useMemo(() => {
    const keys: string[] = []
    const e = new Date(dateEnd)
    const s = new Date(e.getFullYear(), e.getMonth(), 1) // Start from 1st of the month
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      keys.push(formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()))
    }
    return keys
  }, [dateEnd])

  const revenueByNopol = useMemo(() => {
    const map: Record<string, { achRevenue: number; bop: number }> = {}
    revenues.filter(r => revenueDateKeys.includes(r.date)).forEach(r => {
      if (!map[r.nopol]) map[r.nopol] = { achRevenue: 0, bop: 0 }
      map[r.nopol].achRevenue += r.achRevenue
      map[r.nopol].bop += r.bop
    })
    return map
  }, [revenues, revenueDateKeys])

  const revenueMetrics = useMemo(() => {
    let totalTarget = 0, totalRevenue = 0, totalBop = 0

    activeVehiclesBranch.forEach(v => {
      const vehicleTarget = v.revenueTarget || 0
      totalTarget += vehicleTarget
      
      const r = revenueByNopol[v.nopol]
      if (!r) return
      totalRevenue += r.achRevenue
      totalBop += r.bop
    })
    const achPct = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0
    const bopPct = totalRevenue > 0 ? (totalBop / totalRevenue) * 100 : 0
    return { totalTarget, totalRevenue, totalBop, achPct, bopPct }
  }, [activeVehiclesBranch, revenueByNopol, year, month, dateRangeKeys.length])

  const dailyTrend = useMemo(() => {
    const dim = new Date(year, month, 0).getDate()
    const data: { day: string; utilization: number; activeFleet: number }[] = []
    for (let d = 1; d <= dim; d++) {
      const dk = formatDateKey(year, month, d)
      let total = 0, operational = 0
      filteredVehicles.forEach(v => {
        const code = statuses[v.id]?.[dk]
        if (code) { total++; if (!BD_CODES.includes(code)) operational++ }
      })
      data.push({
        day: String(d),
        utilization: total > 0 ? Math.round((operational / total) * 100) : 0,
        activeFleet: total,
      })
    }
    return data
  }, [filteredVehicles, statuses, month, year])



  const statusGroups = useMemo(() => {
    const groups: Record<string, number> = {}
    filteredVehicles.forEach(v => {
      dateRangeKeys.forEach(dk => {
        const sCode = statuses[v.id]?.[dk]
        if (sCode) {
          const sMeta = getStatusMeta(sCode)
          if (sMeta) groups[sMeta.group] = (groups[sMeta.group] ?? 0) + 1
        }
      })
    })
    return groups
  }, [filteredVehicles, statuses, dateRangeKeys])

  const stackedChartData = useMemo(() => {
    const dataMap: Record<string, Record<string, any>> = {}
    filteredVehicles.forEach(v => {
      dateRangeKeys.forEach(dk => {
        const sCode = statuses[v.id]?.[dk]
        if (!sCode) return
        if (!dataMap[v.type]) dataMap[v.type] = { label: v.type }
        dataMap[v.type][sCode] = (dataMap[v.type][sCode] || 0) + 1
      })
    })
    return Object.values(dataMap).sort((a, b) => {
      const totalA = Object.entries(a).filter(([k]) => k !== 'label').reduce((s, [,v]) => s + (v as number), 0)
      const totalB = Object.entries(b).filter(([k]) => k !== 'label').reduce((s, [,v]) => s + (v as number), 0)
      return totalB - totalA
    })
  }, [filteredVehicles, statuses, dateRangeKeys])

  const activeStatusCodes = useMemo(() => {
    const totals: Record<string, number> = {}
    stackedChartData.forEach(item => {
      Object.entries(item).forEach(([k, v]) => {
        if (k !== 'label') totals[k] = (totals[k] || 0) + (v as number)
      })
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([code]) => code)
  }, [stackedChartData])

  const branchData = useMemo(() =>
    branchOptions.filter(b => branch === 'ALL' || b.code === branch).map(b => {
      const bv = allKPIs.filter(x => x.v.branchId === b.code)
      const n = bv.length || 1
      return {
        name: b.code,
        'PA (%)': parseFloat((bv.reduce((a,x) => a + parseFloat(x.kpi.pa), 0) / n).toFixed(1)),
        'UA (%)': parseFloat((bv.reduce((a,x) => a + parseFloat(x.kpi.ua), 0) / n).toFixed(1)),
      }
    }), [allKPIs, branchOptions, branch])

  const revenueByBranch = useMemo(() => {
    const map: Record<string, { target: number; actual: number; bop: number }> = {}
    activeVehiclesBranch.forEach(v => {
      const r = revenueByNopol[v.nopol]
      if (!r) return
      if (!map[v.branchId]) map[v.branchId] = { target: 0, actual: 0, bop: 0 }
      map[v.branchId].target += v.revenueTarget || 0
      map[v.branchId].actual += r.achRevenue
      map[v.branchId].bop += r.bop
    })
    return branchOptions
      .filter(b => branch === 'ALL' || b.code === branch)
      .map(b => ({ name: b.code, ...(map[b.code] ?? { target: 0, actual: 0, bop: 0 }) }))
      .filter(d => d.target > 0 || d.actual > 0)
  }, [activeVehiclesBranch, branchOptions, branch, revenueByNopol])

  const revenueRecords = useMemo(() =>
    activeVehiclesBranch.map(v => {
      const r = revenueByNopol[v.nopol]
      if (!r) return null
      return {
        id: v.nopol,
        nopol: v.nopol,
        typeUnit: v.type,
        branchId: v.branchId,
        targetPerUnit: v.revenueTarget || 0,
        achRevenue: r.achRevenue,
        bop: r.bop
      }
    }).filter(Boolean) as { id: string; nopol: string; typeUnit: string; branchId: string; targetPerUnit: number; achRevenue: number; bop: number }[],
  [activeVehiclesBranch, revenueByNopol])

  const revenueTotalPages = Math.ceil(revenueRecords.length / pageSize) || 1
  const paginatedRevenue = useMemo(() => revenueRecords.slice((revenuePage - 1) * pageSize, revenuePage * pageSize), [revenueRecords, revenuePage, pageSize])

  const achColor = revenueMetrics.achPct >= 100 ? '#10b981' : revenueMetrics.achPct >= 80 ? '#f59e0b' : '#E17055'

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* ─── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl mb-6 p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #E8F0EC 0%, #D6E4DC 40%, #C4D8CC 100%)', border: '1px solid #B8CEBC' }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(#5B8F82 1px, transparent 1px), linear-gradient(90deg, #5B8F82 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #A8CBBF, transparent)' }} />
        <div className="absolute bottom-0 left-32 w-48 h-48 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #82AFA9, transparent)' }} />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#5B8F82' }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#3D6B60' }}>Live Monitoring</span>
            </div>
            <h2 className="text-[28px] font-extrabold tracking-tight leading-tight" style={{ color: '#1E3A33' }}>
              Operational Dashboard
            </h2>
            <p className="text-[14px] mt-1 font-medium" style={{ color: '#5B8F82' }}>
              {selectedDate === dateEnd
                ? formatDateLabel(selectedDate)
                : `${formatDateLabel(selectedDate).split(',')[0]} — ${formatDateLabel(dateEnd)}`
              } · {activeTab === 'Vehicle Performance' ? `${filteredVehicles.length} active vehicle units` : `${revenueRecords.length} revenue records`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <button onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-xl text-[13px] font-medium transition-all backdrop-blur-sm"
              style={{ background: 'rgba(91,143,130,0.15)', border: '1px solid rgba(91,143,130,0.3)', color: '#2C4A42' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,143,130,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(91,143,130,0.15)'}>
              <Filter size={14} />
              <span>Filter Settings</span>
              {(branch !== 'ALL' || selectedCustomer !== 'ALL' || selectedType !== 'ALL') && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#5B8F82' }} />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs tabs={['Vehicle Performance', 'Revenue & Financials']} active={activeTab} onChange={setActiveTab} />

      {/* ════════════════════════════════════════════════════════════════════════
           TAB 1: VEHICLE PERFORMANCE
           ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Vehicle Performance' && (
        <>

          {/* ─── Row 1: Primary Monthly KPIs ──────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <MetricCard label="Active Vehicle" value={totalActive} sub="operating units" color="#47766F" icon={Truck} />
            <MetricCard label="Avg PA" value={`${avgPA}%`} sub={`${paCfg.label} · ${dateRangeKeys.length} hari`}
              color={parseFloat(avgPA)>=paCfg.good?'#10b981':parseFloat(avgPA)>=paCfg.warn?'#f59e0b':'#E17055'} icon={CheckCircle2}
              trend={parseFloat(avgPA)>=paCfg.good?'up':parseFloat(avgPA)>=paCfg.warn?'flat':'down'} />
            <MetricCard label="Avg UA" value={`${avgUA}%`} sub={`${uaCfg.label} · ${dateRangeKeys.length} hari`}
              color={parseFloat(avgUA)>=uaCfg.good?'#10b981':parseFloat(avgUA)>=uaCfg.warn?'#f59e0b':'#E17055'} icon={Activity}
              trend={parseFloat(avgUA)>=uaCfg.good?'up':parseFloat(avgUA)>=uaCfg.warn?'flat':'down'} />
            <MetricCard label="Total Breakdown" value={totalBD} sub={`unit-days · ${dateRangeKeys.length} hari`}
              color={totalBD===0?'#10b981':'#E17055'} icon={AlertTriangle}
              trend={totalBD===0?'flat':'down'} />
          </div>

          {/* ─── NEW: Daily Vehicle Utilization Trend ───────────────────────────── */}
          <ChartCard className="mb-5">
            <SectionHeader
              title="Daily Utilization Trend"
              sub={`Percentage of operational vehicle (non-breakdown) per day · ${MONTH_NAMES[month-1]} ${year} (${dateRangeKeys.length} hari)`}
            />
            <div className="h-[220px]">
              {dailyTrend.some(d => d.activeFleet > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#47766F" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#47766F" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false} tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      unit="%"
                    />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
                    <ReferenceLine y={90} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5}
                      label={{ value: 'Target 90%', position: 'right', fontSize: 10, fill: '#10b981' }} />
                    <Area
                      type="monotone" dataKey="utilization"
                      stroke="#47766F" strokeWidth={2}
                      fill="url(#utilGrad)"
                      dot={false} activeDot={{ r: 4, fill: '#47766F', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[13px] text-[#7A9E94]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <Activity size={24} className="text-[#A8CBBF]" />
                    </div>
                    <p className="text-[13px] text-[#7A9E94] font-medium">No daily status data for this period</p>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>

          {/* ─── Row 2: 50/50 Charts ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Left: Stacked Bar Chart */}
            <ChartCard className="h-full">
              <SectionHeader
                title="Status Distribution per Vehicle Type"
                sub={`Status composition per vehicle type · ${formatDateLabel(selectedDate).split(',')[0]}${dateEnd !== selectedDate ? ` — ${formatDateLabel(dateEnd).split(',')[0]}` : ''}`}
              />
              <div className="flex flex-wrap gap-2 mb-6">
                <MinimalBadge label="Utilisasi" count={statusGroups['UTILISASI']??0} color="#10b981" icon={CheckCircle2} />
                <MinimalBadge label="Ready For Use" count={statusGroups['READY FOR USE']??0} color="#f59e0b" icon={Clock} />
                <MinimalBadge label="Breakdown" count={statusGroups['BREAKDOWN']??0} color="#E17055" icon={AlertTriangle} />
                <MinimalBadge label="Delay" count={statusGroups['DELAY']??0} color="#f97316" icon={TrendingDown} />
                <MinimalBadge label="DNA" count={(statusGroups['DNA (DS HO)']??0)+(statusGroups['DNA (HC CABANG)']??0)} color="#ec4899" icon={ShieldAlert} />
                <MinimalBadge label="Libur (NWD)" count={statusGroups['NWD']??0} color="#8b5cf6" icon={Minus} />
                <MinimalBadge label="UNR" count={statusGroups['UNR']??0} color="#94a3b8" icon={Minus} />
              </div>
              <div className="flex-1 min-h-[360px]">
                {stackedChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedChartData} margin={{ top:0, right:10, left:-20, bottom:70 }}>
                      <defs>
                        {activeStatusCodes.map(code => (
                          <linearGradient key={code} id={`grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={getSC(code)} stopOpacity={1} />
                            <stop offset="100%" stopColor={getSC(code)} stopOpacity={0.75} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" strokeOpacity={0.8} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize:10, fill:'#64748b', fontWeight:500 }}
                        axisLine={false} tickLine={false}
                        angle={-40} textAnchor="end" height={75}
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize:10, fill:'#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100,116,139,0.06)', radius: 4 }} />
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ fontSize:11, paddingBottom:16 }}
                        iconType="square"
                        iconSize={8}
                      />
                      {activeStatusCodes.map((code, i) => (
                        <Bar key={code} dataKey={code} stackId="s"
                          fill={`url(#grad-${code})`}
                          radius={i === activeStatusCodes.length-1 ? [4,4,0,0] : [0,0,0,0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <Truck size={28} className="text-[#A8CBBF]" />
                    </div>
                    <p className="text-[13px] text-[#7A9E94] font-medium">No status data for this date</p>
                  </div>
                )}
              </div>
            </ChartCard>

            {/* Right: Branch KPI Bar Chart */}
            <ChartCard className="h-full">
              <SectionHeader
                title="KPI Performance per Branch"
                sub={`Average PA and UA per branch · ${selectedDate === dateEnd ? formatDateLabel(selectedDate).split(',')[0] : `${formatDateLabel(selectedDate).split(',')[0]} — ${formatDateLabel(dateEnd)}`}`}
              />
              <div className="flex-1 min-h-[360px] flex flex-col">
                {branchData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchData} margin={{ top:0, right:10, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="gradPA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="gradUA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#47766F" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:12, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip content={<KpiTooltip />} cursor={{ fill: 'rgba(100,116,139,0.06)', radius:4 }} />
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ fontSize:12, paddingBottom:16 }}
                        iconType="square"
                        iconSize={10}
                      />
                      <Bar dataKey="PA (%)" fill="url(#gradPA)" radius={[6,6,0,0]} maxBarSize={52} />
                      <Bar dataKey="UA (%)" fill="url(#gradUA)" radius={[6,6,0,0]} maxBarSize={52} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[13px] text-[#7A9E94]">
                    No branch data
                  </div>
                )}

                  <div className="flex flex-wrap gap-4 mt-auto pt-4 border-t border-slate-100">
                    {[{ label:'Target PA', value: paCfg.label.replace('Target ', ''), color:'#10b981' }, { label:'Target UA', value: uaCfg.label.replace('Target ', ''), color:'#47766F' }].map(t => (
                      <div key={t.label} className="flex items-center gap-2">
                        <div className="w-5 h-0.5 rounded-full" style={{ background: t.color }} />
                        <span className="text-[11px] text-[#5B8F82]">{t.label}: <strong style={{ color: t.color }}>{t.value}</strong></span>
                      </div>
                    ))}
                  </div>
              </div>
            </ChartCard>

          </div>

{/* ─── Vehicle Status Composition ─────────────────────────────────────── */}
<ChartCard className="mb-5 mt-5">
  <SectionHeader
    title="Vehicle Status Composition"
    sub={`Distribution of all vehicle-days by status group · ${selectedDate === dateEnd ? formatDateLabel(selectedDate).split(',')[0] : `${formatDateLabel(selectedDate).split(',')[0]} — ${formatDateLabel(dateEnd).split(',')[0]}`}`}
  />
  {(() => {
    const groups = [
      { key: 'UTILISASI',     label: 'UA (UTILISASI)', color: '#16a34a', owner: 'Operasional' },
      { key: 'READY FOR USE', label: 'READY FOR USE',  color: '#f59e0b', owner: 'Operasional' },
      { key: 'BREAKDOWN',     label: 'BREAKDOWN',      color: '#dc2626', owner: 'Maintenance' },
      { key: 'DELAY',         label: 'DELAY',          color: '#f97316', owner: 'Admin / BOP' },
      { key: 'DNA',           label: 'DNA',            color: '#ec4899', owner: 'HR / Driver' },
      { key: 'NWD',           label: 'LIBUR (NWD)',    color: '#8b5cf6', owner: 'Terjadwal' },
      { key: 'UNR',           label: 'NOT READY',      color: '#94a3b8', owner: 'Admin / Legal' },
    ]
    const dnaCount = (statusGroups['DNA (DS HO)'] ?? 0) + (statusGroups['DNA (HC CABANG)'] ?? 0)
    const raw: Record<string, number> = {}
    groups.forEach(g => {
      if (g.key === 'DNA') raw[g.key] = dnaCount
      else raw[g.key] = statusGroups[g.key] ?? 0
    })
    const total = Object.values(raw).reduce((a, b) => a + b, 0)
    const data = groups.map(g => ({
      ...g,
      pct: total > 0 ? ((raw[g.key] / total) * 100).toFixed(0) : '0',
      value: raw[g.key],
    }))

    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
            <Activity size={24} className="text-[#A8CBBF]" />
          </div>
          <p className="text-[13px] text-[#7A9E94] font-medium">No status data for this period</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col lg:flex-row items-center gap-6">

        {/* Donut chart */}
        <div className="relative w-[400px] h-[400px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={90}
                dataKey="value"
                stroke="none"
                cornerRadius={3}
                paddingAngle={2}
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.value > 0 ? entry.color : entry.color + '22'} />
                ))}
              </Pie>

              {/* ✅ Center label pakai SVG text — berada di bawah layer tooltip HTML */}
              <text
                x="50%"
                y="50%"
                dy="-5"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 26, fontWeight: 600, fill: '#1e293b' }}
              >
                {total.toLocaleString()}
              </text>
              <text
                x="50%"
                y="50%"
                dy="20"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 10, fill: '#94a3b8', letterSpacing: '0.05em' }}
              >
                Total Status
              </text>

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'
                  return (
                    <div style={{
                      background: 'rgba(15,23,42,0.88)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14,
                      padding: '8px 12px',
                      boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
                    }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{d.label}</p>
                      <p style={{ color: d.color, fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                        {d.value} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>status</span>
                      </p>
                      <p style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600, marginTop: 2 }}>{pct}%</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* ✅ Div absolut center label DIHAPUS dari sini */}
        </div>

        {/* Legend rows */}
        <div className="flex-1 w-full space-y-1">
          {data.map(item => (
            <div
              key={item.key}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-slate-50 group"
            >
              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: item.color, opacity: item.value > 0 ? 1 : 0.3 }}
              />

              {/* Label + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-[12px] font-medium tracking-wide"
                    style={{ color: item.value > 0 ? '#334155' : '#94a3b8' }}
                  >
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: item.value > 0 ? '#64748b' : '#cbd5e1' }}
                    >
                      {item.value} status
                    </span>
                    <span
                      className="text-[12px] font-semibold tabular-nums w-9 text-right"
                      style={{ color: item.value > 0 ? item.color : '#cbd5e1' }}
                    >
                      {item.pct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar + owner badge */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-[3px] rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%`, background: item.color, opacity: item.value > 0 ? 1 : 0.2 }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal flex-shrink-0 min-w-[70px] text-right">
                    {item.owner}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Footer total */}
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 px-3">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Total</span>
            <span className="text-[12px] font-semibold text-slate-700">{total.toLocaleString()} status</span>
          </div>
        </div>

      </div>
    )
  })()}
</ChartCard>


          {/* ─── Vehicle Performance Table ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl overflow-hidden mt-5"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px_32px rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.06)' }}>
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-[14px] font-bold text-[#2C4A42]">Vehicle Performance</h3>
              <p className="text-[12px] text-[#7A9E94] mt-0.5">KPI Details per vehicle unit · {MONTH_NAMES[month-1]} {year} ({dateRangeKeys.length} hari)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #5B8F82, #4A7B70)', color: '#fff' }}>
                    {['No','Nopol','Type','Branch','PA %','UA %'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[11px] font-medium whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-4 py-3.5 text-left text-[11px] font-medium whitespace-nowrap cursor-pointer select-none hover:text-emerald-200 transition-colors"
                      onClick={() => setSortByBD(p => !p)}>
                      <span className="flex items-center gap-1">∑BD{sortByBD ? <span className="text-emerald-200">{'\u25BC'}</span> : ''}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedKPIs.map(({ v, kpi }, i) => {
                    const b = branchOptions.find(x => x.code === v.branchId)
                    const kpiColor = (val: number, g: number, w: number) =>
                      val >= g ? '#16a34a' : val >= w ? '#ca8a04' : '#E17055'
                    const pa = parseFloat(kpi.pa)
                    const ua = parseFloat(kpi.ua)
                    const rowNum = (page - 1) * pageSize + i + 1
                    return (
                      <tr key={v.id} className={`border-b border-slate-100 hover:bg-teal-50/60 ${rowNum%2===0?'bg-white':'bg-slate-50/50'}`}>
                        <td className="px-4 py-3 text-[#7A9E94] text-[11px]">{rowNum}</td>
                        <td className="px-4 py-3 font-semibold text-[12px]">{v.nopol}</td>
                        <td className="px-4 py-3 text-[12px] text-[#4A6B60]">{v.type}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E0F0EA', color: '#3D6B60', border: '1px solid #B8CEBC' }}>{b?.code ?? v.branchId}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-[12px]" style={{ color: kpiColor(pa, paCfg.good, paCfg.warn) }}>{kpi.pa}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-[12px]" style={{ color: kpiColor(ua, uaCfg.good, uaCfg.warn) }}>{kpi.ua}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-[12px]">{kpi.totalBD}</span>
                        </td>
                      </tr>
                    )
                  })}
                  {paginatedKPIs.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-[12px] text-[#7A9E94]">No vehicle data found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {allKPIs.length > pageSize && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <p className="text-[11px] text-[#7A9E94]">
                  {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, allKPIs.length)} of {allKPIs.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">Prev</button>
                  <span className="flex items-center px-2 text-[11px] text-[#5B8F82]">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
           TAB 2: REVENUE & FINANCIALS
           ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Revenue & Financials' && (
        <>

          {/* ─── Row 1: Revenue Summary Cards ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <MetricCard label="Actual Revenue" value={formatRp(revenueMetrics.totalRevenue)}
              sub={`Accumulated until ${formatDateLabel(dateEnd)}`} color="#f59e0b" icon={DollarSign} />
            <MetricCard label="Total BOP" value={formatRp(revenueMetrics.totalBop)}
              sub={`${revenueMetrics.bopPct.toFixed(0)}% of actual revenue`} color="#8b5cf6" icon={Activity} />
            <MetricCard label="Net Revenue" value={formatRp(revenueMetrics.totalRevenue - revenueMetrics.totalBop)}
              sub={`Revenue after BOP`} color="#10b981" icon={TrendingUp} />
          </div>

          {/* ─── Row 2: Revenue Gauge + Target vs Actual ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

            {/* Left: Revenue Achievement Gauge */}
            <ChartCard>
              <SectionHeader
                title="Revenue Achievement (MTD)"
                sub={`${formatRp(revenueMetrics.totalRevenue)} of ${formatRp(revenueMetrics.totalTarget)}`}
              />
              <div className="flex flex-col items-center py-4">
                {revenueMetrics.totalTarget > 0 ? (
                  <div className="relative w-full max-w-[280px] mx-auto">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Achieved', value: Math.min(revenueMetrics.achPct, 100) },
                            { name: 'Remaining', value: Math.max(0, 100 - Math.min(revenueMetrics.achPct, 100)) },
                          ]}
                          startAngle={180} endAngle={0}
                          innerRadius={55} outerRadius={80}
                          dataKey="value"
                          stroke="none" cornerRadius={4}
                        >
                          <Cell fill={achColor} />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                      <span className="text-[34px] font-extrabold tracking-tight leading-none" style={{ color: achColor }}>
                        {revenueMetrics.achPct.toFixed(0)}%
                      </span>
                      <span className="text-[11px] font-medium text-[#7A9E94] mt-1">Achievement</span>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#47766F' }} />
                        <span className="text-[11px] text-[#5B8F82]">Monthly Target: {formatRp(revenueMetrics.totalTarget)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f59e0b' }} />
                        <span className="text-[11px] text-[#5B8F82]">Actual Revenue: {formatRp(revenueMetrics.totalRevenue)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <DollarSign size={24} className="text-[#A8CBBF]" />
                    </div>
                    <p className="text-[13px] text-[#7A9E94] font-medium">No revenue data for this period</p>
                  </div>
                )}
              </div>
            </ChartCard>

            {/* Right: Target vs Actual per Branch */}
            <ChartCard>
              <SectionHeader
                title="Monthly Target vs Actual Revenue"
                sub="Comparison by branch"
              />
              <div className="flex-1 min-h-[260px]">
                {revenueByBranch.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByBranch} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#47766F" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#47766F" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:12, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : String(v)} />
                      <Tooltip content={<KpiTooltip />} cursor={{ fill: 'rgba(100,116,139,0.06)' }} />
                      <Legend verticalAlign="top" wrapperStyle={{ fontSize:11, paddingBottom:12 }} iconType="square" iconSize={8} />
                      <Bar dataKey="target" fill="url(#targetGrad)" radius={[4,4,0,0]} maxBarSize={40} name="Monthly Target" />
                      <Bar dataKey="actual" fill="url(#actualGrad)" radius={[4,4,0,0]} maxBarSize={40} name="Actual Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[13px] text-[#7A9E94]">
                    No revenue data per branch
                  </div>
                )}
              </div>
            </ChartCard>

          </div>

          {/* ─── Revenue Detail Table ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px_32px rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.06)' }}>
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-[14px] font-bold text-[#2C4A42]">Revenue Details per Unit</h3>
              <p className="text-[12px] text-[#7A9E94] mt-0.5">
                Monthly target, actual revenue, and BOP per unit (until {formatDateLabel(dateEnd)})
                {revenueRecords.length > 0 && ` · ${revenueRecords.length} units`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #5B8F82, #4A7B70)', color: '#fff' }}>
                    {['No','Nopol','Type','Branch','Monthly Target','Actual Rev.','BOP','Ach.%','BOP%'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[11px] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRevenue.length > 0 ? (
                    paginatedRevenue.map((r, i) => {
                      const ach = r.targetPerUnit > 0 ? (r.achRevenue / r.targetPerUnit) * 100 : 0
                      const bopPct = r.achRevenue > 0 ? (r.bop / r.achRevenue) * 100 : 0
                      const v = vehicles.find(x => x.nopol === r.nopol)
                      const rowNum = (revenuePage - 1) * pageSize + i + 1
                      return (
                        <tr key={r.id || i} className={`border-b border-slate-100 hover:bg-teal-50/60 ${rowNum%2===0?'bg-white':'bg-slate-50/50'}`}>
                          <td className="px-4 py-3 text-[#7A9E94] text-[11px]">{rowNum}</td>
                          <td className="px-4 py-3 font-semibold text-[12px]">{r.nopol}</td>
                          <td className="px-4 py-3 text-[12px] text-[#4A6B60]">{r.typeUnit || v?.type || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E0F0EA', color: '#3D6B60', border: '1px solid #B8CEBC' }}>{v?.branchId || r.branchId}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[12px]">{formatRp(r.targetPerUnit)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[12px]"
                            style={{ color: ach >= 100 ? '#16a34a' : ach >= 80 ? '#ca8a04' : '#E17055' }}>
                            {formatRp(r.achRevenue)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[12px] text-[#4A6B60]">{formatRp(r.bop)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-[12px]" style={{ color: ach >= 100 ? '#16a34a' : ach >= 80 ? '#ca8a04' : '#E17055' }}>
                              {ach.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-[12px]" style={{ color: bopPct <= 20 ? '#16a34a' : bopPct <= 40 ? '#ca8a04' : '#E17055' }}>
                              {bopPct.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[#7A9E94]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                            <DollarSign size={24} className="text-[#A8CBBF]" />
                          </div>
                          <p>Belum ada data revenue untuk periode ini</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {revenueRecords.length > pageSize && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <p className="text-[11px] text-[#7A9E94]">
                  {(revenuePage - 1) * pageSize + 1}-{Math.min(revenuePage * pageSize, revenueRecords.length)} of {revenueRecords.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setRevenuePage(p => Math.max(1, p - 1))} disabled={revenuePage === 1}
                    className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">Prev</button>
                  <span className="flex items-center px-2 text-[11px] text-[#5B8F82]">{revenuePage} / {revenueTotalPages}</span>
                  <button onClick={() => setRevenuePage(p => Math.min(revenueTotalPages, p + 1))} disabled={revenuePage === revenueTotalPages}
                    className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Filter Popup ─────────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setFilterOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-[420px] shadow-2xl"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[14px] font-bold text-[#2C4A42]">Filter Settings</h3>
              <button onClick={() => setFilterOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                <X size={16} className="text-[#7A9E94]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Start Date</label>
                <input type="date" value={selectedDate} max={todayISO} onChange={e => {
                  const val = e.target.value
                  setSelectedDate(val)
                  const d = new Date(val)
                  if (!isNaN(d.getTime())) { setMonth(d.getMonth()+1); setYear(d.getFullYear()) }
                  if (dateEnd < val) setDateEnd(val)
                  setPage(1); setRevenuePage(1)
                }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">End Date</label>
                <input type="date" value={dateEnd} min={selectedDate} max={todayISO} onChange={e => {
                  const val = e.target.value
                  if (val < selectedDate) { showToast('End date cannot be before start date', 'error'); return }
                  setDateEnd(val)
                  setPage(1); setRevenuePage(1)
                }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Branch</label>
                <Select value={branch} onChange={v => { setBranch(v); setPage(1); setRevenuePage(1) }} disabled={!canSwitchBranch}>
                  <option value="ALL">All Branches</option>
                  {branchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Customer</label>
                <Select value={selectedCustomer} onChange={v => { setSelectedCustomer(v); setPage(1); setRevenuePage(1) }}>
                  <option value="ALL">All Customers</option>
                  {CUSTOMERS.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Vehicle Type</label>
                <Select value={selectedType} onChange={v => { setSelectedType(v); setPage(1); setRevenuePage(1) }}>
                  <option value="ALL">All Types</option>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => setFilterOpen(false)}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-[12px] font-semibold hover:bg-teal-700 transition-all">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
