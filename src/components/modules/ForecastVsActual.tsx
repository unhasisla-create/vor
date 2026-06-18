'use client'
import { useEffect, useMemo, useState } from 'react'
import { useVORStore } from '@/lib/store'
import { BRANCHES, daysInMonth, formatDateKey } from '@/lib/constants'
import { getStatusMeta } from '@/lib/status-utils'
import { PageHeader, KpiCard, Card, FilterPopup, Select } from '@/components/ui'
import { getStoredUser } from '@/lib/auth-client'

export default function ForecastVsActual() {
  const { month, year, branch, setMonth, setYear, setBranch, vehicles, statuses, forecast, branches } = useVORStore()
  const [selectedDate, setSelectedDate] = useState<string>('ALL')

  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')
  const userBranch = user?.branch ?? 'ALL'
  const effectiveBranch = canSwitchBranch ? branch : userBranch

  const branchOptions = useMemo(() =>
    (branches.length ? branches : BRANCHES).filter(b => (!('isActive' in b) || b.isActive) && (canSwitchBranch || userBranch === 'ALL' || b.code === userBranch))
  , [branches, canSwitchBranch, userBranch])

  useEffect(() => {
    if (!canSwitchBranch && userBranch !== 'ALL' && branch !== userBranch) {
      setBranch(userBranch)
    }
  }, [branch, canSwitchBranch, setBranch, userBranch])

  const today = new Date()
  const todayD = today.getDate()
  const isCurrentMonth = today.getMonth()+1 === month && today.getFullYear() === year
  const maxDay = isCurrentMonth ? todayD : daysInMonth(month, year)

  const vList = useMemo(() =>
    vehicles.filter(v => (effectiveBranch === 'ALL' ? true : v.branchId === effectiveBranch) && v.isActive)
  , [vehicles, effectiveBranch])

  const analysis = useMemo(() => {
    let match = 0, changed = 0, major = 0, unplanned = 0, total = 0
    const rows = vList.map(v => {
      const cells: { day: number; fc: string; ac: string; result: string; color: string; label: string }[] = []
      
      const startD = selectedDate === 'ALL' ? 1 : Number(selectedDate)
      const endD = selectedDate === 'ALL' ? maxDay : Number(selectedDate)

      for (let d = startD; d <= endD; d++) {
        const dateKey = formatDateKey(year, month, d)
        const fc = forecast[v.id]?.[dateKey]?.status ?? ''
        const ac = statuses[v.id]?.[dateKey] ?? ''
        
        if (!fc && !ac) continue
        
        let result = '', color = '', label = ''
        if (!fc && ac)                                     { result = 'UP'; color = '#64748b'; label = 'Unplanned'; unplanned++ }
        else if (fc && !ac)                                { result = 'NA'; color = '#94a3b8'; label = 'No Actual'; }
        else if (fc === ac)                                { result = 'M';  color = '#16a34a'; label = 'Match'; match++   }
        else if (getStatusMeta(fc)?.group === getStatusMeta(ac)?.group) { result = 'C';  color = '#ca8a04'; label = 'Changed'; changed++ }
        else                                               { result = 'MD'; color = '#dc2626'; label = 'Major Deviation'; major++   }
        
        if (result !== 'NA') total++
        cells.push({ day:d, fc, ac, result, color, label })
      }
      return { v, cells }
    })
    const acc = total > 0 ? ((match / total) * 100).toFixed(1) : '0.0'
    return { rows, match, changed, major, unplanned, total, acc }
  }, [vList, forecast, statuses, maxDay, month, year, selectedDate])

  return (
    <div>
      <PageHeader
        title="Forecast vs Actual"
        subtitle="Forecast vs actual accuracy analysis"
        actions={
          <FilterPopup hasActiveFilter={effectiveBranch !== 'ALL' || selectedDate !== 'ALL'}>
            <div>
              <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Day</label>
              <Select value={selectedDate} onChange={v => setSelectedDate(v)}>
                <option value="ALL">All Dates</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
          </FilterPopup>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Forecast Accuracy" value={`${analysis.acc}%`} sub="Target ≥ 80%"
          color={parseFloat(analysis.acc)>=80?'#16a34a':parseFloat(analysis.acc)>=60?'#ca8a04':'#dc2626'} />
        <KpiCard label="✓ MATCH"          value={analysis.match}   sub="As planned"      color="#16a34a" />
        <KpiCard label="≈ CHANGED"         value={analysis.changed} sub="Same group, diff status" color="#ca8a04" />
        <KpiCard label="✗ MAJOR DEVIATION" value={analysis.major}   sub="Significant deviation"  color="#dc2626" />
        <KpiCard label="! UNPLANNED"       value={analysis.unplanned} sub="Actual without forecast"  color="#64748b" />
        <KpiCard label="Total Cells"       value={analysis.total}   sub="Comparable"       color="#6b7280" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-5">
          <h3 className="font-semibold text-[13px]">Deviation Matrix Per Unit</h3>
          <div className="flex gap-4 text-[11px] text-gray-500 ml-auto">
            {[
              { color:'#16a34a', label:'M = Match' },
              { color:'#ca8a04', label:'C = Changed (same group)' },
              { color:'#dc2626', label:'MD = Major Deviation' },
              { color:'#64748b', label:'UP = Unplanned (Actual only)' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-sm" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr style={{ background: '#5B8F82', color: '#fff' }}>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ width:36 }}>No</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ width:110 }}>Nopol</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ width:100 }}>Customer</th>
                {selectedDate === 'ALL' ? (
                  <th className="px-3 py-3 text-left text-[11px] font-medium">Daily Comparison (Forecast → Actual)</th>
                ) : (
                  <>
                    <th className="px-3 py-3 text-left text-[11px] font-medium">Forecast</th>
                    <th className="px-3 py-3 text-left text-[11px] font-medium">Actual</th>
                    <th className="px-3 py-3 text-left text-[11px] font-medium">Status / Deviation</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map(({ v, cells }, i) => {
                if (selectedDate !== 'ALL' && cells.length === 0) return null;
                return (
                <tr key={v.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                  <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                  <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{v.nopol}</td>
                  <td className="px-3 py-2.5 text-[11px]">{v.customer}</td>
                  {selectedDate === 'ALL' ? (
                    <td className="px-2.5 py-2">
                      {cells.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {cells.map(c => (
                            <span key={c.day}
                              style={{ background: c.color, color:'#fff', width:26, height:26, borderRadius:4, fontSize:8, fontWeight:800, display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                               title={`Day ${c.day} | Forecast: ${c.fc || '-'} | Actual: ${c.ac || '-'}`}>
                              {c.result}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">No operational data in this period</span>
                      )}
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2.5">
                         {cells[0]?.fc ? (
                           <span className="inline-block px-2 py-1 bg-slate-100 rounded text-[11px]">{cells[0].fc}</span>
                         ) : (
                           <span className="text-gray-400 italic flex items-center gap-1 text-[11px]">
                             <span className="w-3 border-b border-gray-400 inline-block mr-1"></span>
                              No plan
                           </span>
                         )}
                      </td>
                      <td className="px-3 py-2.5">
                         {cells[0]?.ac ? (
                           <span className="inline-block px-2 py-1 bg-slate-100 rounded text-[11px] font-medium">{cells[0].ac}</span>
                         ) : (
                           <span className="text-gray-400 italic flex items-center gap-1 text-[11px]">
                             <span className="w-3 border-b border-gray-400 inline-block mr-1"></span>
                              Empty
                           </span>
                         )}
                      </td>
                      <td className="px-3 py-2.5">
                         {cells[0] && (
                           <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold" style={{ background: `${cells[0].color}15`, color: cells[0].color }}>
                             <span className="w-2 h-2 rounded-full" style={{ background: cells[0].color }}></span>
                             {cells[0].label}
                           </span>
                         )}
                      </td>
                    </>
                  )}
                </tr>
              )})}
              {analysis.rows.length === 0 && (
                <tr><td colSpan={selectedDate === 'ALL' ? 4 : 6} className="text-center py-10 text-[12px] text-gray-400">No active vehicles in this branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
