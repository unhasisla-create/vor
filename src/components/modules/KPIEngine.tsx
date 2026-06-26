'use client'
import { useCallback, useMemo } from 'react'
import { useVORStore } from '@/lib/store'
import { BRANCHES, MONTH_NAMES } from '@/lib/constants'
import { computeKPI, kpiBgStyle } from '@/lib/utils'
import { PageHeader, KpiCard, Card, InfoBox, FilterPopup } from '@/components/ui'
import { showToast } from '@/components/ui'
import { exportKPIToXLSX } from '@/lib/export'
import { Download } from 'lucide-react'
import { getStoredUser } from '@/lib/auth-client'

export default function KPIEngine() {
  const { month, year, branch, setMonth, setYear, setBranch, vehicles, statuses, branches, kpiConfigs } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')
  const userBranch = user?.branch ?? 'ALL'
  const effectiveBranch = canSwitchBranch ? branch : userBranch

  const kpiThreshold = (metric: string) => {
    const cfg = kpiConfigs.find((c: any) => c.metric === metric)
    return { good: cfg?.goodThreshold ?? 90, warn: cfg?.warnThreshold ?? 75 }
  }
  const paCfg = kpiThreshold('PA')
  const uaCfg = kpiThreshold('UA')


  const branchOptions = useMemo(() =>
    (branches.length ? branches : BRANCHES).filter(b => (!('isActive' in b) || b.isActive) && (canSwitchBranch || userBranch === 'ALL' || b.code === userBranch))
  , [branches, canSwitchBranch, userBranch])

  const activeVehicles = useMemo(() =>
    vehicles.filter(v => v.isActive && (effectiveBranch === 'ALL' ? true : v.branchId === effectiveBranch))
  , [vehicles, effectiveBranch])

  const allKPIs = useMemo(() =>
    activeVehicles.map(v => ({ v, kpi: computeKPI(v.id, statuses, month, year) })),
    [activeVehicles, statuses, month, year]
  )

  const branchKPIs = useMemo(() => branchOptions.filter(b => effectiveBranch === 'ALL' || b.code === effectiveBranch).map(b => {
    const bKPIs = allKPIs.filter(x => x.v.branchId === b.code)
    const n = bKPIs.length || 1
    return {
      branch: b,
      total: bKPIs.length,
      pa:   (bKPIs.reduce((a,x) => a + parseFloat(x.kpi.pa),   0) / n).toFixed(1),
      ua:   (bKPIs.reduce((a,x) => a + parseFloat(x.kpi.ua),   0) / n).toFixed(1),
      bd:   bKPIs.reduce((a,x) => a + x.kpi.totalBD, 0),
    }
  }), [allKPIs, branchOptions])

  const kpiColor = (val: string, g: number, w: number) =>
    parseFloat(val) >= g ? '#16a34a' : parseFloat(val) >= w ? '#ca8a04' : '#dc2626'

  const handleExport = async () => {
    try {
      const rows = allKPIs.map(({ v, kpi }) => ({
        nopol: v.nopol, type: v.type,
        branch: branchOptions.find(b => b.code === v.branchId)?.code ?? v.branchId,
        pa: kpi.pa, ua: kpi.ua,
        totalUTI: kpi.totalUTI, totalRFU: kpi.totalRFU, totalBD: kpi.totalBD,
      }))
      await exportKPIToXLSX(rows, month, year)
      showToast(`KPI berhasil diekspor ke XLSX`)
    } catch { showToast('Gagal export.', 'error') }
  }

  return (
    <div>
      <PageHeader
        title="KPI Engine"
        subtitle="Kalkulasi otomatis PA dan UA per unit armada"
        actions={
          <div className="flex gap-2">
            <FilterPopup hasActiveFilter={effectiveBranch !== 'ALL'} />
          </div>
        }
      />

      {/* Branch summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        {branchKPIs.map(bk => (
          <Card key={bk.branch.id} className="!p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-[13px]">{bk.branch.name}</p>
                <p className="text-[10px] text-gray-400">{bk.branch.code} · {bk.total} unit</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bk.bd > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {bk.bd > 0 ? `${bk.bd} BD` : 'No BD'}
              </span>
            </div>
            {[
              { label:'PA', val: bk.pa, g: paCfg.good, w: paCfg.warn },
              { label:'UA', val: bk.ua, g: uaCfg.good, w: uaCfg.warn },

            ].map(x => (
              <div key={x.label} className="mb-2.5">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-gray-500">{x.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: kpiColor(x.val, x.g, x.w) }}>{x.val}%</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill" style={{ width:`${x.val}%`, background: kpiColor(x.val, x.g, x.w) }} />
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {/* Detail table */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-[13px]">Detail KPI Per Unit — {MONTH_NAMES[month-1]} {year}{effectiveBranch !== 'ALL' ? ` · ${branchOptions.find(b => b.code === effectiveBranch)?.code ?? effectiveBranch}` : ''}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr style={{ background: '#5B8F82', color: '#fff' }}>
                {['No','Nopol','Tipe','Cabang','Utilisasi','RFU','BD','DELAY','DNA','NWD','UNR','PA%','UA%'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allKPIs.map(({ v, kpi }, i) => {
                const b = branchOptions.find(x => x.code === v.branchId)
                return (
                  <tr key={v.id} className={`border-b border-slate-100 hover:bg-teal-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{v.nopol}</td>
                    <td className="px-3 py-2.5 text-[11px]">{v.type}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">{b?.code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">{kpi.totalUTI}</td>
                    <td className="px-3 py-2.5 text-center">{kpi.totalRFU}</td>
                    <td className="px-3 py-2.5 text-center font-bold" style={{ color: kpi.totalBD > 0 ? '#dc2626' : undefined }}>{kpi.totalBD}</td>
                    <td className="px-3 py-2.5 text-center" style={{ color: kpi.totalDELAY > 0 ? '#ea580c' : undefined }}>{kpi.totalDELAY}</td>
                    <td className="px-3 py-2.5 text-center" style={{ color: kpi.totalDNA > 0 ? '#db2777' : undefined }}>{kpi.totalDNA}</td>
                    <td className="px-3 py-2.5 text-center" style={{ color: kpi.totalNWD > 0 ? '#2563eb' : undefined }}>{kpi.totalNWD}</td>
                    <td className="px-3 py-2.5 text-center" style={{ color: kpi.totalUNR > 0 ? '#6b7280' : undefined }}>{kpi.totalUNR}</td>
                    <td className="px-3 py-2.5 text-center" style={{ background: kpiBgStyle(kpi.pa, paCfg.good, paCfg.warn) }}>
                      <span className="font-bold text-[11px]" style={{ color: kpiColor(kpi.pa, paCfg.good, paCfg.warn) }}>{kpi.pa}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center" style={{ background: kpiBgStyle(kpi.ua, uaCfg.good, uaCfg.warn) }}>
                      <span className="font-bold text-[11px]" style={{ color: kpiColor(kpi.ua, uaCfg.good, uaCfg.warn) }}>{kpi.ua}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
