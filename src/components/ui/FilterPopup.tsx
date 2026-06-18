'use client'
import { useState, useMemo, type ReactNode } from 'react'
import { useVORStore } from '@/lib/store'
import { getStoredUser } from '@/lib/auth-client'
import { Filter, X } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/constants'
import Select from './Select'

type Props = {
  children?: ReactNode
  hasActiveFilter?: boolean
}

export default function FilterPopup({ children, hasActiveFilter }: Props) {
  const { month, year, setMonth, setYear, branch, setBranch, branches } = useVORStore()
  const user = getStoredUser()
  const canSwitchBranch = ['Admin', 'Management'].includes(user?.role ?? '')
  const userBranch = user?.branch ?? 'ALL'
  const effectiveBranch = canSwitchBranch ? branch : userBranch

  const [open, setOpen] = useState(false)

  const branchOptions = useMemo(() =>
    (branches.length ? branches : []).filter(b =>
      (b.isActive ?? true) && (canSwitchBranch || userBranch === 'ALL' || b.code === userBranch))
  , [branches, canSwitchBranch, userBranch])

  const curYear = new Date().getFullYear()
  const yearOpts = Array.from({ length: 7 }, (_, i) => curYear - 3 + i)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-xl text-[13px] font-medium transition-all backdrop-blur-sm"
        style={{ background: 'rgba(91,143,130,0.15)', border: '1px solid rgba(91,143,130,0.3)', color: '#2C4A42' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,143,130,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(91,143,130,0.15)' }}>
        <Filter size={14} />
        <span>Filter Settings</span>
        {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full ml-1" style={{ background: '#5B8F82' }} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-[420px] shadow-2xl"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[14px] font-bold text-[#2C4A42]">Filter Settings</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                <X size={16} className="text-[#7A9E94]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Month</label>
                <Select value={month} onChange={v => setMonth(+v)}>
                  {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Year</label>
                <Select value={year} onChange={v => setYear(+v)}>
                  {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B8F82] mb-1.5 block">Branch</label>
                <Select value={effectiveBranch} onChange={v => setBranch(v)} disabled={!canSwitchBranch}>
                  {canSwitchBranch && <option value="ALL">All Branches</option>}
                  {branchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
                </Select>
              </div>
              <div>{children}</div>
            </div>
            <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => setOpen(false)}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-[12px] font-semibold hover:bg-teal-700 transition-all">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
