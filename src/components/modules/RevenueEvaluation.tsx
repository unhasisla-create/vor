'use client'
import { useEffect, useMemo, useState } from 'react'
import { useVORStore } from '@/lib/store'
import { PageHeader, Card, Btn, showToast, InfoBox } from '@/components/ui'
import { MONTH_NAMES, BRANCHES } from '@/lib/constants'
import { getStoredUser } from '@/lib/auth-client'
import RevenueImportModal from './RevenueImportModal'
import { Upload, Save, TrendingUp, TrendingDown, DollarSign, ChevronDown } from 'lucide-react'

export default function RevenueEvaluation() {
  const { month, year, branch, setMonth, setYear, setBranch, branches, vehicles, revenues, loadRevenues } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')
  const userBranch = user?.branch ?? 'ALL'
  const effectiveBranch = canSwitchBranch ? branch : userBranch

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number)
    if (y !== year || m !== month) {
      setYear(y)
      setMonth(m)
    }
  }, [selectedDate, year, month, setYear, setMonth])

  const [showImport, setShowImport] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [edits, setEdits] = useState<Record<string, { achRevenue: number; bop: number }>>({})

  const branchOptions = useMemo(() =>
    (branches.length ? branches : BRANCHES).filter(b => (!('isActive' in b) || b.isActive) && (canSwitchBranch || userBranch === 'ALL' || b.code === userBranch))
  , [branches, canSwitchBranch, userBranch])

  useEffect(() => {
    loadRevenues()
  }, [loadRevenues, month, year])

  const activeVehicles = useMemo(() =>
    vehicles.filter(v => v.isActive && (effectiveBranch === 'ALL' ? true : v.branchId === effectiveBranch))
  , [vehicles, effectiveBranch])

  useEffect(() => {
    const initial: Record<string, any> = {}
    activeVehicles.forEach(v => {
      const rec = revenues.find(r => r.date === selectedDate && r.nopol === v.nopol)
      initial[v.nopol] = {
        achRevenue: rec?.achRevenue || 0,
        bop: rec?.bop || 0,
      }
    })
    setEdits(initial)
  }, [revenues, selectedDate, activeVehicles])

  const handleEdit = (nopol: string, field: string, valStr: string) => {
    const cleanStr = valStr.replace(/[^0-9]/g, '')
    const val = parseInt(cleanStr, 10) || 0
    setEdits(prev => ({
      ...prev,
      [nopol]: { ...prev[nopol], [field]: val }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const updates = activeVehicles
      .filter(v => edits[v.nopol])
      .map(v => ({
        date: selectedDate,
        branchId: v.branchId,
        nopol: v.nopol,
        typeUnit: v.type,
        targetPerUnit: v.revenueTarget || 0,
        achRevenue: edits[v.nopol]?.achRevenue || 0,
        bop: edits[v.nopol]?.bop || 0,
      }))

    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user': JSON.stringify(user) },
        body: JSON.stringify({ updates })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Data Revenue berhasil disimpan!')
        loadRevenues()
      } else {
        const msg = data.details ? data.details.join('; ') : data.error
        showToast(msg || 'Gagal menyimpan data!', 'error')
      }
    } catch {
      showToast('Terjadi kesalahan jaringan!', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Target per unit berasal dari Master Data (vehicle.revenueTarget) — read-only

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
  }

  const pctColor = (val: number, reverse = false) => {
    if (reverse) {
      return val <= 20 ? '#10b981' : val <= 40 ? '#f59e0b' : '#dc2626'
    }
    return val >= 100 ? '#10b981' : val >= 80 ? '#f59e0b' : '#dc2626'
  }

  const computed = useMemo(() => {
    let totalTarget = 0, totalRevenue = 0, totalBop = 0
    activeVehicles.forEach(v => {
      totalTarget += v.revenueTarget || 0
      const e = edits[v.nopol]
      if (e) {
        totalRevenue += e.achRevenue
        totalBop += e.bop
      }
    })
    const totalAchPct = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0
    const totalBopPct = totalRevenue > 0 ? (totalBop / totalRevenue) * 100 : 0
    return { totalTarget, totalRevenue, totalBop, totalAchPct, totalBopPct }
  }, [activeVehicles, edits])

  const summaryCards = [
    { label: 'Total Target', value: formatRp(computed.totalTarget), color: '#47766F', icon: TrendingUp },
    { label: 'Total Revenue', value: formatRp(computed.totalRevenue), color: '#f59e0b', icon: DollarSign },
    { label: 'Total BOP', value: formatRp(computed.totalBop), color: '#8b5cf6', icon: TrendingDown },
    { label: 'Ach. Revenue', value: `${computed.totalAchPct.toFixed(0)}%`, color: pctColor(computed.totalAchPct), icon: TrendingUp },
    { label: 'BOP', value: `${computed.totalBopPct.toFixed(0)}%`, color: pctColor(computed.totalBopPct, true), icon: TrendingDown },
  ]

  return (
    <div>
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
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#3D6B60' }}>Revenue Management</span>
            </div>
            <h2 className="text-[28px] font-extrabold tracking-tight leading-tight" style={{ color: '#1E3A33' }}>
              Revenue Evaluation
            </h2>
            <p className="text-[14px] mt-1 font-medium" style={{ color: '#5B8F82' }}>
              Evaluasi target dan pencapaian revenue per unit armada
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 items-center">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#3D6B60] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm transition-all hover:border-slate-300 hover:shadow-md min-w-[140px]" />
            <div className="relative">
              <select value={effectiveBranch} onChange={e => setBranch(e.target.value)} disabled={!canSwitchBranch}
                className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#3D6B60] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm transition-all hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[#7A9E94] min-w-[160px]">
                {canSwitchBranch && <option value="ALL">ALL — Semua Cabang</option>}
                {branchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A9E94] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <InfoBox type="blue">
        <div className="text-[11px]">
          <strong>Formula:</strong> Ach. Revenue (%) = (Actual Revenue ÷ Target Per Unit) × 100% &nbsp;|&nbsp; BOP (%) = (BOP ÷ Actual Revenue) × 100%
        </div>
      </InfoBox>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {summaryCards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 transition-all duration-300 hover:shadow-lg"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <p className="text-[11px] font-bold text-[#7A9E94] uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-[22px] font-black tracking-tight tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="flex justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <div />
          <div className="flex gap-2">
            <Btn onClick={() => setShowImport(true)} variant="outline" className="text-teal-700 border-teal-200">
              <Upload size={14} className="mr-1.5" /> Import Excel
            </Btn>
            <Btn onClick={handleSave} disabled={isSaving || activeVehicles.length === 0}>
              <Save size={14} className="mr-1.5" /> {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
            </Btn>
          </div>
        </div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr style={{ background: '#5B8F82', color: '#fff' }}>
                <th className="px-4 py-3.5 text-center text-[11px] font-medium border-r border-white/10 w-10">No</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-medium border-r border-white/10">Nopol</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-medium border-r border-white/10">Type Unit</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-medium border-r border-white/10">
                  Target Revenue
                  {/* <span className="ml-1.5 text-[9px] text-white/40 font-normal">(Master Data)</span> */}
                </th>
                <th className="px-4 py-3.5 text-right text-[11px] font-medium border-r border-white/10">Actual Revenue</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-medium border-r border-white/10">BOP</th>
                <th className="px-4 py-3.5 text-center text-[11px] font-medium border-r border-white/10">Ach. Revenue (%)</th>
                <th className="px-4 py-3.5 text-center text-[11px] font-medium">BOP (%)</th>
              </tr>
            </thead>
            <tbody>
              {activeVehicles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#7A9E94]">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign size={28} className="text-slate-300" />
                      <p className="text-[13px] font-medium">Tidak ada data kendaraan untuk cabang terpilih</p>
                    </div>
                  </td>
                </tr>
              )}
              {activeVehicles.map((v, i) => {
                const e = edits[v.nopol] || { achRevenue: 0, bop: 0 }
                const targetVal = v.revenueTarget || 0
                const achPct = targetVal > 0 ? (e.achRevenue / targetVal) * 100 : 0
                const bopPct = e.achRevenue > 0 ? (e.bop / e.achRevenue) * 100 : 0

                return (
                  <tr key={v.id} className={`border-b border-slate-100 hover:bg-teal-50/50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                    <td className="px-4 py-2.5 text-center text-[#7A9E94] text-[11px]">{i+1}</td>
                    <td className="px-4 py-2.5 font-semibold text-[12px]">{v.nopol}</td>
                    <td className="px-4 py-2.5 text-[#4A6B60]">{v.type}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[12px]">
                      Rp{targetVal.toLocaleString('id-ID')}
                    </td>
                    <td className="p-0 min-w-[140px]">
                      <div className="flex h-full w-full focus-within:bg-teal-50/50">
                        <span className="pl-3 py-2.5 text-[#7A9E94] text-[11px]">Rp</span>
                        <input type="text"
                          className="w-full text-right pr-3 py-2.5 focus:outline-none bg-transparent font-medium text-[12px] text-teal-700"
                          value={e.achRevenue === 0 ? '' : e.achRevenue.toLocaleString('id-ID')}
                          onChange={e => handleEdit(v.nopol, 'achRevenue', e.target.value)}
                          placeholder="0" />
                      </div>
                    </td>
                    <td className="p-0 min-w-[140px]">
                      <div className="flex h-full w-full focus-within:bg-violet-50/50">
                        <span className="pl-3 py-2.5 text-[#7A9E94] text-[11px]">Rp</span>
                        <input type="text"
                          className="w-full text-right pr-3 py-2.5 focus:outline-none bg-transparent font-medium text-[12px]"
                          value={e.bop === 0 ? '' : e.bop.toLocaleString('id-ID')}
                          onChange={e => handleEdit(v.nopol, 'bop', e.target.value)}
                          placeholder="0" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center border-l border-slate-100">
                      <span className="font-bold text-[12px]" style={{ color: pctColor(achPct) }}>
                        {achPct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-bold text-[12px]" style={{ color: pctColor(bopPct, true) }}>
                        {bopPct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {activeVehicles.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-[3px] border-slate-300">
                  <td colSpan={3} className="px-4 py-3 text-center text-[#2C4A42] text-[12px]">TOTAL</td>
                  <td className="px-4 py-3 text-right text-[#2C4A42] text-[12px]">{formatRp(computed.totalTarget)}</td>
                  <td className="px-4 py-3 text-right text-teal-700 text-[12px]">{formatRp(computed.totalRevenue)}</td>
                  <td className="px-4 py-3 text-right text-[#2C4A42] text-[12px]">{formatRp(computed.totalBop)}</td>
                  <td className="px-4 py-3 text-center text-[12px]" style={{ color: pctColor(computed.totalAchPct) }}>
                    {computed.totalAchPct.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-center text-[12px]" style={{ color: pctColor(computed.totalBopPct, true) }}>
                    {computed.totalBopPct.toFixed(0)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <RevenueImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => loadRevenues()}
        vehicles={vehicles}
        date={selectedDate}
        branchId={effectiveBranch}
      />
    </div>
  )
}
