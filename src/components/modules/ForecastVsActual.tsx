'use client'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useVORStore } from '@/lib/store'
import { BRANCHES, MONTH_NAMES, daysInMonth, formatDateKey } from '@/lib/constants'
import { getStatusMeta } from '@/lib/status-utils'
import { PageHeader, KpiCard, Card } from '@/components/ui'
import { getStoredUser } from '@/lib/auth-client'

export default function ForecastVsActual() {
  const { month, year, branch, setMonth, setYear, setBranch, vehicles, statuses, forecast, branches } = useVORStore()
  const [selectedDate, setSelectedDate] = useState<string>('ALL')
  const [showDatePopup, setShowDatePopup] = useState(false)
  const dateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDatePopup(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        subtitle="Analisis akurasi rencana vs realisasi operasional"
        actions={
          <div className="flex gap-2 flex-wrap">
            <div className="relative" ref={dateRef}>
              <button 
                onClick={() => setShowDatePopup(!showDatePopup)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors">
                <svg className="w-3.5 h-3.5 text-[#5B8F82]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="font-medium text-[#3D6B60]">{selectedDate === 'ALL' ? 'Semua Tanggal' : `Tgl ${selectedDate}`}</span>
              </button>
              
              {showDatePopup && (
                <div className="absolute top-full left-0 mt-1.5 w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="mb-3">
                    <button 
                      onClick={() => { setSelectedDate('ALL'); setShowDatePopup(false); }}
                      className={`w-full py-2 rounded-lg text-[12px] font-medium transition-all ${selectedDate === 'ALL' ? 'bg-teal-50 text-teal-600 border border-teal-200 shadow-sm' : 'bg-slate-50 text-[#4A6B60] border border-slate-200 hover:bg-slate-100'}`}>
                      📅 Tampilkan Semua Tanggal
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({length: maxDay}, (_, i) => i + 1).map(d => (
                      <button
                        key={d}
                        onClick={() => { setSelectedDate(String(d)); setShowDatePopup(false); }}
                        className={`aspect-square rounded-md text-[12px] flex items-center justify-center transition-all ${selectedDate === String(d) ? 'bg-teal-500 text-white font-bold shadow-md scale-105' : 'hover:bg-slate-100 text-[#3D6B60] hover:font-medium'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <select value={month} onChange={e => setMonth(+e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              {MONTH_NAMES.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={effectiveBranch} onChange={e => setBranch(e.target.value)} disabled={!canSwitchBranch}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#5B8F82]">
              {canSwitchBranch && <option value="ALL">ALL — Semua Cabang</option>}
              {branchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Forecast Accuracy" value={`${analysis.acc}%`} sub="Target ≥ 80%"
          color={parseFloat(analysis.acc)>=80?'#16a34a':parseFloat(analysis.acc)>=60?'#ca8a04':'#dc2626'} />
        <KpiCard label="✓ MATCH"          value={analysis.match}   sub="Sesuai rencana"      color="#16a34a" />
        <KpiCard label="≈ CHANGED"         value={analysis.changed} sub="Grup sama, status beda" color="#ca8a04" />
        <KpiCard label="✗ MAJOR DEVIATION" value={analysis.major}   sub="Deviasi signifikan"  color="#dc2626" />
        <KpiCard label="! UNPLANNED"       value={analysis.unplanned} sub="Tanpa forecast"  color="#64748b" />
        <KpiCard label="Total Sel"          value={analysis.total}   sub="Terbandingkan"       color="#6b7280" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-5">
          <h3 className="font-semibold text-[13px]">Matriks Deviasi Per Unit</h3>
          <div className="flex gap-4 text-[11px] text-gray-500 ml-auto">
            {[
              { color:'#16a34a', label:'M = Match' },
              { color:'#ca8a04', label:'C = Changed (grup sama)' },
              { color:'#dc2626', label:'MD = Major Deviation' },
              { color:'#64748b', label:'UP = Unplanned (Hanya Actual)' },
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
                  <th className="px-3 py-3 text-left text-[11px] font-medium">Perbandingan Harian (Forecast → Actual)</th>
                ) : (
                  <>
                    <th className="px-3 py-3 text-left text-[11px] font-medium">Forecast</th>
                    <th className="px-3 py-3 text-left text-[11px] font-medium">Actual</th>
                    <th className="px-3 py-3 text-left text-[11px] font-medium">Status / Deviasi</th>
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
                              title={`Tgl ${c.day} | Forecast: ${c.fc || '-'} | Actual: ${c.ac || '-'}`}>
                              {c.result}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">Tidak ada data operasional di periode ini</span>
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
                             Tidak ada plan
                           </span>
                         )}
                      </td>
                      <td className="px-3 py-2.5">
                         {cells[0]?.ac ? (
                           <span className="inline-block px-2 py-1 bg-slate-100 rounded text-[11px] font-medium">{cells[0].ac}</span>
                         ) : (
                           <span className="text-gray-400 italic flex items-center gap-1 text-[11px]">
                             <span className="w-3 border-b border-gray-400 inline-block mr-1"></span>
                             Kosong
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
                <tr><td colSpan={selectedDate === 'ALL' ? 4 : 6} className="text-center py-10 text-[12px] text-gray-400">Tidak ada kendaraan aktif di cabang ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
