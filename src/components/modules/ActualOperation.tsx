'use client'
import { useMemo, useState, useEffect } from 'react'
import { useVORStore } from '@/lib/store'
import { getStoredUser } from '@/lib/auth-client'
import { BRANCHES, MONTH_NAMES, daysInMonth, formatDateKey } from '@/lib/constants'
import { getStatusColor, getTextColor, getActiveStatuses } from '@/lib/status-utils'
import { computeKPI, kpiBgStyle } from '@/lib/utils'
import { PageHeader, Btn, ConfirmModal, Modal, FilterPopup } from '@/components/ui'
import { showToast } from '@/components/ui'
import { exportActualToXLSX } from '@/lib/export'
import { Download } from 'lucide-react'

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function buildDateKeys(start: Date, end: Date) {
  const keys: string[] = []
  const current = new Date(start)
  while (current <= end) {
    keys.push(toIsoDate(current))
    current.setDate(current.getDate() + 1)
  }
  return keys
}

// ── Cell Popover ──────────────────────────────────────────────────────────────
function CellPopover({ vehicleId, day, nopol, onClose }: {
  vehicleId: number; day: number; nopol: string; onClose: () => void
}) {
  const { statuses, notes, setStatus, month, year } = useVORStore()
  const dateKey   = formatDateKey(year, month, day)
  const curStatus = statuses[vehicleId]?.[dateKey] ?? ''
  const curNote   = notes[vehicleId]?.[dateKey] ?? ''
  const [sel, setSel] = useState(curStatus)
  const [note, setNote] = useState(curNote)

  const save = () => {
    if (!sel) { showToast('Pilih status terlebih dahulu.', 'error'); return }
    setStatus(vehicleId, day, sel, note)
    showToast(`Tersimpan: ${sel}${note ? ' + catatan' : ''}`)
    onClose()
  }

  const monthName = MONTH_NAMES[month-1]
  const selMeta = getActiveStatuses().find(s => s.code === sel)

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[95vw] border border-slate-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
          <div>
            <p className="font-bold text-[14px] font-mono-jb text-[#1E3A33]">{nopol}</p>
            <p className="text-[11px] text-[#5B8F82] mt-0.5">Tanggal {day} {monthName} {year}</p>
          </div>
          <button onClick={onClose} className="text-[#7A9E94] hover:text-[#4A6B60] hover:bg-slate-100 text-xl leading-none p-1.5 rounded-lg transition-all duration-200 flex-shrink-0">×</button>
        </div>
        <div className="px-6 py-5 bg-white">
          <p className="text-[12px] font-semibold text-[#3D6B60] mb-3 tracking-tight">Pilih Status</p>
          <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto mb-4 pb-1">
            {getActiveStatuses().map(s => {
              const bg = s.color
              const tc = getTextColor(bg)
              const isSel = sel === s.code
              return (
                <button key={s.code} onClick={() => setSel(s.code)}
                  title={s.desc}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200"
                  style={{
                    background: bg, color: tc,
                    outline: isSel ? `3px solid ${bg}` : 'none',
                    outlineOffset: isSel ? 2 : 0,
                    boxShadow: isSel ? `0 0 0 2px white, 0 0 0 4px ${bg}` : '0 1px 2px rgba(0,0,0,0.05)',
                    transform: isSel ? 'scale(1.08)' : 'scale(1)',
                  }}>
                  {s.code}
                </button>
              )
            })}
          </div>
          {selMeta && (
            <div className="px-4 py-3.5 rounded-xl bg-teal-50 border border-l-4 border-l-teal-500 border-teal-200 mb-4 text-[12px] text-teal-800">
              <strong className="block text-teal-900 mb-0.5">{selMeta.code}</strong>
              <p>{selMeta.desc} <span className="ml-2 text-[11px] text-teal-600">[{selMeta.group}]</span></p>
            </div>
          )}
          <label className="block text-[12px] font-semibold text-[#3D6B60] mb-2 tracking-tight">📝 Catatan (opsional)</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Nomor LK, rute, alasan hambatan, info penting..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-[12px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white hover:border-slate-400 transition-all duration-200" />
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white rounded-b-2xl">
          <Btn variant="outline" size="sm" onClick={onClose}>Batal</Btn>
          <Btn size="sm" onClick={save} disabled={!sel} className="bg-teal-600 hover:bg-teal-700 text-white border-0">Simpan</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Main Module ───────────────────────────────────────────────────────────────
export default function ActualOperation() {
  const { month, year, branch, setMonth, setYear, setBranch, vehicles, statuses, notes, copyActualYesterday, copyActualRange, copyForecastYesterday, branches } = useVORStore()
  const user = getStoredUser()

  const branchOptions = branches.length ? branches.filter(b => b.isActive ?? true) : BRANCHES

  useEffect(() => {
    if (user?.branch && user.branch !== 'ALL' && branch !== user.branch) {
      setBranch(user.branch)
    }
  }, [branch, setBranch, user])

  const [popover, setPopover] = useState<{ vehicleId: number; day: number; nopol: string } | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null)
  const [isCopyActualModalOpen, setIsCopyActualModalOpen] = useState(false)
  const [copyActualSourceDate, setCopyActualSourceDate] = useState('')
  const [copyActualTargetStartDate, setCopyActualTargetStartDate] = useState('')
  const [copyActualTargetEndDate, setCopyActualTargetEndDate] = useState('')

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const defaultSource = toIsoDate(yesterday)
  const defaultTarget = toIsoDate(today)

  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year
  const todayD = today.getDate()
  const dim = daysInMonth(month, year)

  const vList = useMemo(() => vehicles.filter(v => (branch === 'ALL' ? true : v.branchId === branch) && v.isActive), [vehicles, branch])
  const allKPIs = useMemo(() => {
    const map: Record<number, ReturnType<typeof computeKPI>> = {}
    vList.forEach(v => { map[v.id] = computeKPI(v.id, statuses, month, year) })
    return map
  }, [vList, statuses, month, year])

  const openCell = (vehicleId: number, day: number, nopol: string) => {
    const cellDate = new Date(year, month - 1, day)
    if (cellDate > today) { showToast('Tidak bisa mengisi tanggal masa depan!', 'error'); return }
    setPopover({ vehicleId, day, nopol })
  }

  const handleCopyActual = () => {
    setCopyActualSourceDate(defaultSource)
    setCopyActualTargetStartDate(defaultTarget)
    setCopyActualTargetEndDate(defaultTarget)
    setIsCopyActualModalOpen(true)
    setConfirm(null)
  }

  const copyActualTargetKeys = (() => {
    const start = parseIsoDate(copyActualTargetStartDate)
    const end = parseIsoDate(copyActualTargetEndDate)
    if (!start || !end || start > end) return []
    return buildDateKeys(start, end)
  })()

  const copyActualTargetHasExisting = copyActualTargetKeys.some(key =>
    vList.some(v => !!statuses[v.id]?.[key])
  )

  const copyActualSourceDateObj = parseIsoDate(copyActualSourceDate)
  const copyActualTargetStartDateObj = parseIsoDate(copyActualTargetStartDate)
  const copyActualTargetEndDateObj = parseIsoDate(copyActualTargetEndDate)
  const copyActualRangeInvalid = !copyActualSourceDateObj || !copyActualTargetStartDateObj || !copyActualTargetEndDateObj || copyActualTargetStartDateObj > copyActualTargetEndDateObj
  const copyActualTargetHasFuture = !!copyActualTargetEndDateObj && copyActualTargetEndDateObj > today
  const copyActualSourceInFuture = !!copyActualSourceDateObj && copyActualSourceDateObj > today

  const executeCopyActualRange = () => {
    const n = copyActualRange(branch, copyActualSourceDate, copyActualTargetStartDate, copyActualTargetEndDate)
    if (n === 0) showToast('Tidak ada data actual pada tanggal sumber untuk disalin.', 'error')
    else showToast(`${n} status actual berhasil disalin dari ${copyActualSourceDate} ke rentang ${copyActualTargetStartDate} hingga ${copyActualTargetEndDate}.`)
    setConfirm(null)
    setIsCopyActualModalOpen(false)
  }

  const handleConfirmCopyActualRange = () => {
    if (copyActualRangeInvalid) {
      showToast('Rentang target tidak valid. Periksa kembali tanggal.', 'error')
      return
    }
    if (copyActualSourceInFuture) {
      showToast('Tanggal sumber tidak boleh di masa depan.', 'error')
      return
    }
    if (copyActualTargetHasFuture) {
      showToast('Rentang target tidak boleh berisi tanggal masa depan.', 'error')
      return
    }
    if (copyActualTargetHasExisting) {
      setConfirm({
        msg: 'Beberapa tanggal target sudah berisi actual. Lanjutkan menimpa data?',
        onConfirm: executeCopyActualRange,
      })
      setIsCopyActualModalOpen(false)
      return
    }
    executeCopyActualRange()
  }

  const handleCopyForecast = () => {
    const n = copyForecastYesterday(branch)
    if (n === 0) showToast('Tidak ada data forecast kemarin.', 'error')
    else showToast(`${n} unit disalin dari forecast kemarin.`)
    setConfirm(null)
  }

  const branchName = branch === 'ALL'
    ? 'ALL — Semua Cabang'
    : branchOptions.find(b => b.code === branch)?.name ?? branch

  const jumpToToday = () => {
    const todayCol = document.getElementById('today-column')
    todayCol?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const handleExport = async () => {
    try {
      showToast('Mengekspor data ke XLSX...')
      await exportActualToXLSX(vList, statuses, notes, month, year, branch)
      showToast(`Export berhasil: VOR_${branch}_${MONTH_NAMES[month-1]}_${year}.xlsx`)
    } catch (e) {
      showToast('Gagal export. Coba lagi.', 'error')
    }
  }

  return (
    <div>
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {popover && <CellPopover {...popover} onClose={() => setPopover(null)} />}
      {isCopyActualModalOpen && (
        <Modal title="Copy Actual by Date Range" onClose={() => setIsCopyActualModalOpen(false)} width={540}
          footer={
            <>
              <Btn variant="outline" onClick={() => setIsCopyActualModalOpen(false)}>Batal</Btn>
              <Btn onClick={handleConfirmCopyActualRange} disabled={copyActualRangeInvalid || copyActualSourceInFuture || copyActualTargetHasFuture} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
                Lanjutkan Copy
              </Btn>
            </>
          }>
          <div className="space-y-4">
            <p className="text-[13px] text-[#4A6B60] leading-relaxed">Default: source kemarin → target hari ini. Ubah jika perlu copy actual ke rentang libur atau periode khusus.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#3D6B60] mb-2 tracking-tight">📅 Source Date</label>
                <input type="date" value={copyActualSourceDate}
                  onChange={e => setCopyActualSourceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white hover:border-slate-400 transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#3D6B60] mb-2 tracking-tight">📅 Target Start</label>
                <input type="date" value={copyActualTargetStartDate}
                  onChange={e => setCopyActualTargetStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white hover:border-slate-400 transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#3D6B60] mb-2 tracking-tight">📅 Target End</label>
                <input type="date" value={copyActualTargetEndDate}
                  onChange={e => setCopyActualTargetEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white hover:border-slate-400 transition-all duration-200" />
              </div>
            </div>
            {copyActualRangeInvalid && (
              <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-l-4 border-l-red-500 border-red-200 text-[12px] text-red-800">
                <span className="flex-shrink-0 text-base leading-none">⚠️</span>
                <p>Rentang target tidak valid. Pastikan tanggal awal tidak setelah tanggal akhir.</p>
              </div>
            )}
            {copyActualSourceInFuture && (
              <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-l-4 border-l-red-500 border-red-200 text-[12px] text-red-800">
                <span className="flex-shrink-0 text-base leading-none">⚠️</span>
                <p>Tanggal sumber tidak boleh berada di masa depan.</p>
              </div>
            )}
            {copyActualTargetHasFuture && (
              <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-l-4 border-l-red-500 border-red-200 text-[12px] text-red-800">
                <span className="flex-shrink-0 text-base leading-none">⚠️</span>
                <p>Rentang target tidak boleh berisi tanggal masa depan.</p>
              </div>
            )}
            {copyActualTargetHasExisting && !copyActualRangeInvalid && !copyActualTargetHasFuture && (
              <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-yellow-50 border border-l-4 border-l-yellow-500 border-yellow-200 text-[12px] text-yellow-800">
                <span className="flex-shrink-0 text-base leading-none">⚡</span>
                <p>Beberapa tanggal target sudah berisi actual. Proses ini akan menimpa data existing.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Page Header with Filter ── */}
      <PageHeader
        title="Actual Operation"
        subtitle={`${branchName} — ${vList.length} unit aktif — ${MONTH_NAMES[month-1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <FilterPopup hasActiveFilter={branch !== 'ALL'} />
          </div>
        }
      />

      {/* ── Sticky Toolbar ── */}
      <div className="act-toolbar" style={{ justifyContent: 'flex-end' }}>
        <button className="act-toolbar__jump" onClick={jumpToToday}>
          📍 Hari Ini
        </button>
        <div className="act-toolbar__divider" />
        <Btn variant="ghost-green" onClick={handleCopyActual}>
          ✅ Copy Actual
        </Btn>
        <Btn variant="ghost-blue" onClick={() => setConfirm({ msg: 'Timpa data hari ini dengan Forecast kemarin?', onConfirm: handleCopyForecast })}>
          📋 Copy Forecast
        </Btn>
      </div>

      <div className="matrix-container">
        <div className="min-w-[1100px]">
          <table className="matrix-table">
          <thead>
            <tr>
              <th className="th-left" style={{ position:'sticky', left:0, zIndex:30, width:28 }}>No</th>
              <th className="th-left" style={{ position:'sticky', left:28, zIndex:30, width:96 }}>Nopol</th>
              <th className="th-left" style={{ position:'sticky', left:124, zIndex:30, width:90 }}>Tipe</th>
              <th className="th-left" style={{ position:'sticky', left:214, zIndex:30, width:80 }}>Customer</th>
              <th className="th-left sticky-col-last" style={{ position:'sticky', left:294, zIndex:30, width:90 }}>Driver</th>
              {Array.from({ length: dim }, (_, i) => i + 1).map(d => (
                <th key={d} id={isCurrentMonth && d === todayD ? 'today-column' : undefined} style={{ width:42 }}
                  className={isCurrentMonth && d === todayD ? 'th-today' : ''}>
                  {d}
                </th>
              ))}
              {['UTI','RFU','BD','D','DNA','L','NR','PA%','UA%','Prod%'].map(h => (
                <th key={h} className="th-right" style={{ width:54 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vList.map((v, i) => {
              const kpi = allKPIs[v.id]
              const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc'
              return (
                <tr key={v.id}>
                  <td className="td-left" style={{ position:'sticky', left:0, zIndex:10, background:rowBg, width:28, textAlign:'center', color:'#9ca3af', fontSize:10 }}>{i+1}</td>
                  <td className="td-left" style={{ position:'sticky', left:28, zIndex:10, background:rowBg, width:96, fontFamily:'JetBrains Mono,monospace', fontWeight:600, fontSize:10 }}>{v.nopol}</td>
                  <td className="td-left" style={{ position:'sticky', left:124, zIndex:10, background:rowBg, width:90, fontSize:10, overflow:'hidden', textOverflow:'ellipsis' }}>{v.type}</td>
                  <td className="td-left" style={{ position:'sticky', left:214, zIndex:10, background:rowBg, width:80, fontSize:10 }}>{v.customer}</td>
                  <td className="td-left sticky-col-last" style={{ position:'sticky', left:294, zIndex:10, background:rowBg, width:90, fontSize:10, overflow:'hidden', textOverflow:'ellipsis' }}>{v.driver}</td>

                  {Array.from({ length: dim }, (_, j) => j + 1).map(d => {
                    const dateKey = formatDateKey(year, month, d)
                    const s = statuses[v.id]?.[dateKey] ?? ''
                    const hasNote = !!notes[v.id]?.[dateKey]
                    const noteText = notes[v.id]?.[dateKey] ?? ''
                    const cellDate = new Date(year, month - 1, d)
                    const isFuture = cellDate > today
                    const isToday = isCurrentMonth && d === todayD
                    const bg = s ? getStatusColor(s) : isFuture ? 'transparent' : '#f1f5f9'
                    const tc = s ? getTextColor(bg) : '#cbd5e1'
                    return (
                      <td key={d} style={{ outline: isToday ? '2px solid #2563eb' : 'none', outlineOffset:-2 }}>
                        <div className={`status-cell ${isFuture ? 'future' : ''} ${isToday ? 'today-outline' : ''}`}
                          style={{ background: bg, color: tc }}
                          onClick={() => !isFuture && openCell(v.id, d, v.nopol)}
                          title={s
                            ? `${s} — click to edit${hasNote ? `\n📝 ${noteText}` : ''}`
                            : isFuture
                              ? 'Tanggal masa depan'
                              : 'Klik untuk isi'}>
                          {s || (!isFuture ? '–' : '')}
                          {hasNote && <span className="note-indicator" />}
                        </div>
                      </td>
                    )
                  })}

                  {/* KPI cols */}
                  <td className="td-right">{kpi?.totalUTIL ?? '–'}</td>
                  <td className="td-right">{kpi?.totalRFU ?? '–'}</td>
                  <td className="td-right" style={{ color: kpi?.totalBD > 0 ? '#dc2626' : undefined, fontWeight: kpi?.totalBD > 0 ? 700 : 400 }}>{kpi?.totalBD ?? '–'}</td>
                  <td className="td-right">{kpi?.totalDELAY ?? '–'}</td>
                  <td className="td-right">{kpi?.totalDNA ?? '–'}</td>
                  <td className="td-right">{kpi?.totalNWD ?? '–'}</td>
                  <td className="td-right">{kpi?.totalUNR ?? '–'}</td>
                  <td className="td-right" style={{ background: kpiBgStyle(kpi?.pa, 90, 75) }}>
                    <span className="font-bold text-[10px]" style={{ color: parseFloat(kpi?.pa)>=90?'#16a34a':parseFloat(kpi?.pa)>=75?'#ca8a04':'#dc2626' }}>{kpi?.pa}</span>
                  </td>
                  <td className="td-right" style={{ background: kpiBgStyle(kpi?.ua, 80, 60) }}>
                    <span className="font-bold text-[10px]" style={{ color: parseFloat(kpi?.ua)>=80?'#16a34a':parseFloat(kpi?.ua)>=60?'#ca8a04':'#dc2626' }}>{kpi?.ua}</span>
                  </td>
                  <td className="td-right" style={{ background: kpiBgStyle(kpi?.prod, 70, 50) }}>
                    <span className="font-bold text-[10px]" style={{ color: parseFloat(kpi?.prod)>=70?'#16a34a':parseFloat(kpi?.prod)>=50?'#ca8a04':'#dc2626' }}>{kpi?.prod}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {[
          { color:'#16a34a', label:'UTI/C/MB — Utilisasi' },
          { color:'#ca8a04', label:'RFU/RB — Ready For Use' },
          { color:'#dc2626', label:'BD/BDJ+1 — Breakdown' },
          { color:'#ea580c', label:'AM/BT/AS/AB — Delay' },
          { color:'#2563eb', label:'L — Libur' },
          { color:'#7c3aed', label:'FM/BTJ — Force/Jalur' },
          { color:'#6b7280', label:'AT/LNR/KR — Not Ready' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border-2 border-red-500" />
          Ada catatan
        </span>
      </div>
    </div>
  )
}
