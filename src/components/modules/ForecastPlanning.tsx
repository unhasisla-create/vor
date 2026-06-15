'use client'
import { useMemo, useEffect } from 'react'
import { useVORStore } from '@/lib/store'
import { BRANCHES, MONTH_NAMES, formatDateKey } from '@/lib/constants'
import { getStatusColor, getTextColor, getActiveStatuses } from '@/lib/status-utils'
import { PageHeader, Btn, Badge, KpiCard } from '@/components/ui'
import { showToast } from '@/components/ui'
import { getStoredUser } from '@/lib/auth-client'

export default function ForecastPlanning() {
  const { branch, setBranch, vehicles, statuses, forecast, setForecast, generateForecastFromActual, branches } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')

  const branchOptions = branches.length ? branches.filter(b => b.isActive ?? true) : BRANCHES

  useEffect(() => {
    if (user?.branch && user.branch !== 'ALL' && branch !== user.branch) {
      setBranch(user.branch)
    }
  }, [branch, setBranch, user])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tDay   = tomorrow.getDate()
  const tMonth = tomorrow.getMonth() + 1
  const tYear  = tomorrow.getFullYear()

  const vList = useMemo(() => vehicles.filter(v => (branch === 'ALL' ? true : v.branchId === branch) && v.isActive), [vehicles, branch])

  const tDateKey = formatDateKey(tYear, tMonth, tDay)

  const stats = useMemo(() => ({
    total:  vList.length,
    manual: vList.filter(v => forecast[v.id]?.[tDateKey]?.confidence === 'MANUAL').length,
    system: vList.filter(v => forecast[v.id]?.[tDateKey]?.confidence === 'SYSTEM').length,
    empty:  vList.filter(v => !forecast[v.id]?.[tDateKey]).length,
  }), [vList, forecast, tDateKey])

  const doGenerate = () => {
    const n = generateForecastFromActual(branch)
    showToast(`${n} unit draft SYSTEM berhasil di-generate.`)
  }

  const handleChange = (vehicleId: number, status: string) => {
    setForecast(vehicleId, tDateKey, status)
    showToast(`Forecast disimpan: ${status}`)
  }

  return (
    <div>
      <PageHeader
        title="Forecast Planning"
        subtitle={`Rencana operasional esok hari — ${MONTH_NAMES[tMonth-1]} ${tDay}, ${tYear}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <select value={branch} onChange={e => setBranch(e.target.value)} disabled={!canSwitchBranch}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#5B8F82]">
              <option value="ALL">ALL — Semua Cabang</option>
              {branchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
            </select>
            {!canSwitchBranch && user?.branch !== 'ALL' ? (
              <span className="text-[11px] text-[#5B8F82] self-center">Cabang terkunci: {user?.branch}</span>
            ) : null}
            <Btn variant="purple" onClick={doGenerate}>
              ⚡ Generate dari Aktual Hari Ini
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Unit"    value={stats.total}  color="#5B8F82" />
        <KpiCard label="Draft MANUAL"  value={stats.manual} sub="Disunting planner" color="#16a34a" />
        <KpiCard label="Draft SYSTEM"  value={stats.system} sub="Auto-generate" color="#6b7280" />
        <KpiCard label="Belum Diisi"   value={stats.empty}  sub={stats.empty > 0 ? 'Perlu diisi' : 'Lengkap ✓'} color={stats.empty > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ background: '#5B8F82', color: '#fff' }}>
              {['No','Nopol','Tipe','Customer','Driver','Status Forecast','Confidence','Ubah Status'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vList.map((v, i) => {
              const fc = forecast[v.id]?.[tDateKey]
              const isManual = fc?.confidence === 'MANUAL'
              const bg = fc ? getStatusColor(fc.status) : 'transparent'
              const tc = fc ? getTextColor(bg) : '#cbd5e1'
              return (
                <tr key={v.id} className={`border-b border-slate-100 hover:bg-purple-50 transition-colors ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                  <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                  <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{v.nopol}</td>
                  <td className="px-3 py-2.5 text-[11px]">{v.type}</td>
                  <td className="px-3 py-2.5 text-[11px]">{v.customer}</td>
                  <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">{v.driver}</td>
                  <td className="px-3 py-2.5">
                    {fc ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${isManual ? 'fc-manual' : 'fc-system'}`}
                        style={{ background: bg, color: tc }}>
                        {fc.status}
                      </span>
                    ) : <span className="text-gray-300 text-[11px]">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {fc ? (
                      <Badge color={isManual ? 'green' : 'gray'}>{fc.confidence}</Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={fc?.status ?? ''}
                      onChange={e => e.target.value && handleChange(v.id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-[11px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-slate-400 transition-all duration-200 cursor-pointer appearance-none pr-7" 
                      style={{backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path fill=%22%23334155%22 d=%22M1 1l5 5 5-5%22/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '1.5rem'}}>
                      <option value="">-- Pilih Status --</option>
                      {getActiveStatuses().filter((s: any) => s.isForecast).map(s => (
                        <option key={s.code} value={s.code}>{s.code} — {s.desc}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
            {vList.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-[12px] text-gray-400">Tidak ada kendaraan aktif di cabang ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-5 mt-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 border border-dashed border-gray-400 rounded inline-block opacity-60" />
          SYSTEM — Draft otomatis (transparan)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-green-500 rounded inline-block" />
          MANUAL — Telah disunting planner
        </span>
      </div>
    </div>
  )
}
