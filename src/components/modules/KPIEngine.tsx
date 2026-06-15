'use client'
import { useCallback, useMemo } from 'react'
import { useVORStore } from '@/lib/store'
import { BRANCHES, MONTH_NAMES } from '@/lib/constants'
import { computeKPI, kpiBgStyle } from '@/lib/utils'
import { PageHeader, KpiCard, Card, InfoBox } from '@/components/ui'
import { showToast } from '@/components/ui'
import { exportKPIToXLSX } from '@/lib/export'
import { Download } from 'lucide-react'
import { getStoredUser } from '@/lib/auth-client'

export default function KPIEngine() {
  const { month, year, branch, setMonth, setYear, setBranch, vehicles, statuses, branches } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')
  const userBranch = user?.branch ?? 'ALL'
  const effectiveBranch = canSwitchBranch ? branch : userBranch

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
      prod: (bKPIs.reduce((a,x) => a + parseFloat(x.kpi.prod), 0) / n).toFixed(1),
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
        pa: kpi.pa, ua: kpi.ua, prod: kpi.prod,
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
        subtitle="Kalkulasi otomatis PA, UA, dan Productivity per unit armada"
        actions={
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(+e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              {MONTH_NAMES.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={effectiveBranch} onChange={e => setBranch(e.target.value)} disabled={!canSwitchBranch}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed">
              {canSwitchBranch && <option value="ALL">ALL — Semua Cabang</option>}
              {branchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
            </select>
            {/* <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white hover:bg-slate-50 transition">
              <Download size={13}/> Export XLSX
            </button> */}
          </div>
        }
      />

      <InfoBox type="blue">
        <div className="text-[11px] leading-relaxed">
          <strong>Formula KPI yang digunakan:</strong>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <div className="bg-white/60 rounded-lg px-3 py-2 border border-teal-100">
              <span className="font-bold text-teal-700">PA%</span>
              <br />= (Hari Terisi − ∑BD) ÷ Hari Terisi × 100%
              <br /><span className="text-[10px] text-gray-400">Hari tidak breakdown dari total hari yang terisi data</span>
            </div>
            <div className="bg-white/60 rounded-lg px-3 py-2 border border-teal-100">
              <span className="font-bold text-emerald-700">UA%</span>
              <br />= UA ÷ (Hari Terisi − ∑BD) × 100%
              <br /><span className="text-[10px] text-gray-400">Hari tersedia dari hari yang bukan breakdown</span>
            </div>
            <div className="bg-white/60 rounded-lg px-3 py-2 border border-teal-100">
              <span className="font-bold text-amber-700">Prod%</span>
              <br />= Prod ÷ UA × 100%
              <br /><span className="text-[10px] text-gray-400">Hari produktif dari hari yang tersedia (UA)</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            <strong>UA</strong> = UTI + C + MB + AM + BT + AS + BDJ-1 + FM + BTJ + AB + L &nbsp;|&nbsp;
            <strong>Prod</strong> = UTI + C + MB + L &nbsp;|&nbsp;
            <strong>∑BD</strong> = BD + BDJ+1 &nbsp;|&nbsp;
            <strong>Hari Terisi</strong> = jumlah hari yang sudah diisi data status
          </div>
        </div>
      </InfoBox>

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
              { label:'PA', val: bk.pa, g:90, w:75 },
              { label:'UA', val: bk.ua, g:80, w:60 },
              { label:'Prod', val: bk.prod, g:70, w:50 },
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
                {['No','Nopol','Tipe','Cabang','∑UTI','∑RFU','∑BD','∑AM/AB','PA %','UA %','Prod %'].map(h => (
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
                    <td className="px-3 py-2.5 text-center">{kpi.totalAMAB}</td>
                    <td className="px-3 py-2.5 text-center" style={{ background: kpiBgStyle(kpi.pa,90,75) }}>
                      <span className="font-bold text-[11px]" style={{ color: kpiColor(kpi.pa,90,75) }}>{kpi.pa}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center" style={{ background: kpiBgStyle(kpi.ua,80,60) }}>
                      <span className="font-bold text-[11px]" style={{ color: kpiColor(kpi.ua,80,60) }}>{kpi.ua}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center" style={{ background: kpiBgStyle(kpi.prod,70,50) }}>
                      <span className="font-bold text-[11px]" style={{ color: kpiColor(kpi.prod,70,50) }}>{kpi.prod}%</span>
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
