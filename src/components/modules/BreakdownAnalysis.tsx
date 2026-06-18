'use client'
import { useState, useMemo, useEffect, Fragment } from 'react'
import { useVORStore } from '@/lib/store'
import { getStoredUser } from '@/lib/auth-client'
import { PageHeader, Card, Select, FilterPopup } from '@/components/ui'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

type DayDetail = {
  date: string
  status: string
  note: string
}

type BreakdownEvent = {
  nopol: string
  type: string
  branch: string
  startDate: string
  endDate: string
  duration: number
  notes: string
  details: DayDetail[]
}

export default function BreakdownAnalysis() {
  const { month, year, setMonth, setYear, branch, setBranch, vehicles, statuses, notes } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')
  const userBranch = user?.branch ?? 'ALL'
  const effectiveBranch = canSwitchBranch ? branch : userBranch

  const [selectedNopol, setSelectedNopol] = useState('ALL')
  const [page, setPage] = useState(1)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const PER_PAGE = 15

  const activeVehicles = useMemo(() =>
    vehicles.filter(v => v.isActive && (effectiveBranch === 'ALL' ? true : v.branchId === effectiveBranch))
  , [vehicles, effectiveBranch])

  const events = useMemo(() => {
    const result: BreakdownEvent[] = []
    const daysInMonth = new Date(year, month, 0).getDate()
    const pad = (n: number) => String(n).padStart(2, '0')

    for (const v of activeVehicles) {
      if (selectedNopol !== 'ALL' && v.nopol !== selectedNopol) continue

      const vStatuses = statuses[v.id] ?? {}
      let eventStart: string | null = null
      let eventEndDay = 0
      let eventDetails: DayDetail[] = []

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${pad(month)}-${pad(d)}`
        const st = vStatuses[dateStr]
        const isBD = st === 'BD' || st === 'BDJ+1'

        if (isBD) {
          if (eventStart === null) {
            eventStart = dateStr
            eventEndDay = d
            eventDetails = []
          } else {
            eventEndDay = d
          }
          eventDetails.push({ date: dateStr, status: st, note: notes[v.id]?.[dateStr] || '' })
        } else {
          if (eventStart !== null) {
            result.push({
              nopol: v.nopol,
              type: v.type,
              branch: v.branchId,
              startDate: eventStart,
              endDate: `${year}-${pad(month)}-${pad(eventEndDay)}`,
              duration: eventEndDay - parseInt(eventStart.split('-')[2]) + 1,
              notes: eventDetails.map(dd => dd.note).filter(Boolean).join('; ') || '',
              details: eventDetails,
            })
            eventStart = null
          }
        }
      }

      if (eventStart !== null) {
        result.push({
          nopol: v.nopol,
          type: v.type,
          branch: v.branchId,
          startDate: eventStart,
          endDate: `${year}-${pad(month)}-${pad(eventEndDay)}`,
          duration: eventEndDay - parseInt(eventStart.split('-')[2]) + 1,
          notes: eventDetails.map(dd => dd.note).filter(Boolean).join('; ') || '',
          details: eventDetails,
        })
      }
    }

    return result.sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [activeVehicles, statuses, notes, month, year, selectedNopol])

  const totalPages = Math.ceil(events.length / PER_PAGE)
  const paginatedEvents = events.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [events.length])

  const totalBreakdown = events.length
  const totalDowntime = events.reduce((sum, e) => sum + e.duration, 0)

  const fmtDate = (d: string) => {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  const allNopol = useMemo(() =>
    activeVehicles.map(v => v.nopol).sort()
  , [activeVehicles])

  return (
    <div>
      <PageHeader
        title="Breakdown Analysis"
        subtitle="BD & BDJ+1 events per unit"
        actions={
          <FilterPopup hasActiveFilter={effectiveBranch !== 'ALL' || selectedNopol !== 'ALL'}>
            <div>
              <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Unit</label>
              <Select value={selectedNopol} onChange={v => setSelectedNopol(v)}>
                <option value="ALL">All Units</option>
                {allNopol.map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </div>
          </FilterPopup>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card className="!p-4">
          <p className="text-[11px] font-bold text-[#7A9E94] uppercase tracking-widest mb-2">Breakdown Events</p>
          <p className="text-[28px] font-black tracking-tight" style={{ color: '#A52A2A' }}>{totalBreakdown}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-[11px] font-bold text-[#7A9E94] uppercase tracking-widest mb-2">Total Downtime</p>
          <p className="text-[28px] font-black tracking-tight" style={{ color: '#A52A2A' }}>{totalDowntime} day{totalDowntime !== 1 ? 's' : ''}</p>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ background: '#5B8F82', color: '#fff' }}>
              {['No', 'Unit', 'Type', 'Branch', 'Start Date', 'End Date', 'Duration', 'Notes', ''].map((h, idx) => (
                <th key={idx} className={`px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap ${idx === 8 ? 'w-10 text-center' : ''}`}>
                  {h || null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[#7A9E94]">
                  <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-[13px] font-medium">No breakdown events found</p>
                  <p className="text-[11px] mt-1">Try adjusting the filter or select a different period</p>
                </td>
              </tr>
            )}
            {paginatedEvents.map((e, i) => {
              const globalIdx = (page - 1) * PER_PAGE + i
              const isExpanded = expandedIdx === globalIdx
              const dayStart = parseInt(e.startDate.split('-')[2])
              const dayEnd = parseInt(e.endDate.split('-')[2])
              const isSingleDay = dayStart === dayEnd
              return (
                <Fragment key={i}>
                  <tr className={`border-b border-slate-100 transition-all ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${isExpanded ? '!bg-[#F0F7F4]' : ''}`}>
                    <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-[12px]">{e.nopol}</td>
                    <td className="px-3 py-2.5 text-[#4A6B60]">{e.type}</td>
                    <td className="px-3 py-2.5">{e.branch}</td>
                    <td className="px-3 py-2.5">{fmtDate(e.startDate)}</td>
                    <td className="px-3 py-2.5">{isSingleDay ? '—' : fmtDate(e.endDate)}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: e.duration > 2 ? '#A52A2A' : '#8B4513' }}>
                      {e.duration} day{e.duration !== 1 ? 's' : ''}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[180px]">
                      <span className="truncate block">{e.notes || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                        className="p-1 rounded-md transition-all hover:bg-white/60"
                        title={isExpanded ? 'Collapse detail' : 'Expand detail'}>
                        {isExpanded
                          ? <ChevronDown size={14} className="text-[#5B8F82]" />
                          : <ChevronRight size={14} className="text-[#7A9E94]" />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="px-0 py-0 border-b border-slate-100">
                        <div className="bg-[#F5FAF8] px-6 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5B8F82]" />
                            <span className="text-[10px] font-bold text-[#5B8F82] uppercase tracking-widest">Timeline</span>
                          </div>
                          <div className="space-y-1">
                            {e.details.map((d, di) => (
                              <div key={di}
                                className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-white border border-slate-100">
                                <span className="text-[11px] font-mono text-[#4A6B60] min-w-[52px] font-semibold">{fmtDate(d.date)}</span>
                                <div className="flex items-center gap-2 min-w-[72px]">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                                    style={{ background: d.status === 'BD' ? 'rgba(165,42,42,0.12)' : 'rgba(139,69,19,0.12)',
                                             color: d.status === 'BD' ? '#A52A2A' : '#8B4513' }}>
                                    {di + 1}
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    d.status === 'BD'
                                      ? 'bg-[#A52A2A]/10 text-[#A52A2A]'
                                      : 'bg-[#8B4513]/10 text-[#8B4513]'
                                  }`}>{d.status}</span>
                                </div>
                                <span className="text-[12px] text-gray-600 flex-1">{d.note || <span className="italic text-[#7A9E94]">No note</span>}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[11px] text-[#7A9E94]">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, events.length)} of {events.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-30"
              style={{ background: 'rgba(91,143,130,0.1)', color: '#2C4A42', border: '1px solid rgba(91,143,130,0.2)' }}
              onMouseEnter={e => { if (!(page === 1)) e.currentTarget.style.background = 'rgba(91,143,130,0.2)' }}
              onMouseLeave={e => { if (!(page === 1)) e.currentTarget.style.background = 'rgba(91,143,130,0.1)' }}>
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-lg text-[12px] font-medium transition-all"
                style={page === i + 1
                  ? { background: '#5B8F82', color: '#fff' }
                  : { background: 'rgba(91,143,130,0.08)', color: '#4A6B60' }}
                onMouseEnter={e => { if (page !== i + 1) e.currentTarget.style.background = 'rgba(91,143,130,0.2)' }}
                onMouseLeave={e => { if (page !== i + 1) e.currentTarget.style.background = 'rgba(91,143,130,0.08)' }}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-30"
              style={{ background: 'rgba(91,143,130,0.1)', color: '#2C4A42', border: '1px solid rgba(91,143,130,0.2)' }}
              onMouseEnter={e => { if (!(page === totalPages)) e.currentTarget.style.background = 'rgba(91,143,130,0.2)' }}
              onMouseLeave={e => { if (!(page === totalPages)) e.currentTarget.style.background = 'rgba(91,143,130,0.1)' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
