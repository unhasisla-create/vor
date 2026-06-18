'use client'
import { useVORStore } from '@/lib/store'
import { useEffect, useMemo, useState } from 'react'
import type { AuditLog } from '@/lib/types'
import { PageHeader, Badge, Card, Select } from '@/components/ui'
import { getStoredUser } from '@/lib/auth-client'
import { BRANCHES } from '@/lib/constants'

function formatAuditTimestamp(value: string) {
  if (!value) return '-'
  let date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    date = new Date(value.replace(' ', 'T'))
  }
  if (Number.isNaN(date.getTime())) return value

  const makassar = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${makassar.getFullYear()}-${pad(makassar.getMonth() + 1)}-${pad(makassar.getDate())} ${pad(makassar.getHours())}:${pad(makassar.getMinutes())}:${pad(makassar.getSeconds())}`
}

function formatAuditDetail(detail: string) {
  // Case 1: JSON updates e.g., "LBPP — updates: {\"code\":\"LBPP\",\"name\":\"Logistik Balikpapan\"}"
  if (detail.includes('updates: {') || detail.includes('Data: {')) {
    try {
      const parts = detail.split(/{/);
      const prefix = parts[0];
      const jsonStr = '{' + parts.slice(1).join('{');
      const obj = JSON.parse(jsonStr);
      const formattedKeys = Object.entries(obj).map(([k, v]) => `${k} menjadi "${v}"`).join(', ');
      return `${prefix.replace('updates:', 'memperbarui:').replace('Data:', 'data:')} ${formattedKeys}`;
    } catch (e) {
      // ignore
    }
  }
  
  // Case 2: isActive=false
  let formatted = detail.replace(/set isActive=false/g, 'dinonaktifkan')
                        .replace(/set isActive=true/g, 'diaktifkan kembali');
                        
  return formatted;
}

const ACTION_COLOR: Record<string, string> = {
  'Update Status': 'blue', 'Copy Actual Yesterday': 'green', 'Generate Forecast': 'purple',
  'Edit Master Data': 'yellow', 'Nonaktifkan Unit': 'red', 'Aktifkan Kembali': 'green',
  'Tambah Kendaraan': 'blue', 'Copy Forecast Yesterday': 'blue', 'Update Forecast': 'purple',
}

export default function AuditTrail() {
  const { auditLogs: localLogs, vehicles, branches } = useVORStore()
  const [serverLogs, setServerLogs] = useState<AuditLog[]>([])
  
  // Filters
  const [filterBranch, setFilterBranch] = useState<string>('ALL')
  const [filterDate, setFilterDate] = useState<string>('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  
  const user = getStoredUser()
  const canViewAllAudits = user?.role === 'Admin' || user?.role === 'Management'
  const userBranch = user?.branch ?? 'ALL'
  
  const effectiveBranchOptions = useMemo(() => {
    const list = branches.length ? branches : BRANCHES;
    return list.filter(b => (!('isActive' in b) || b.isActive) && (canViewAllAudits || userBranch === 'ALL' || b.code === userBranch))
  }, [branches, canViewAllAudits, userBranch])
  
  useEffect(() => {
    if (!canViewAllAudits && userBranch !== 'ALL' && filterBranch === 'ALL') {
      setFilterBranch(userBranch)
    }
  }, [canViewAllAudits, userBranch, filterBranch])

  const branchNopols = useMemo(() =>
    vehicles.filter(v => filterBranch === 'ALL' || v.branchId === filterBranch).map(v => v.nopol.toLowerCase())
  , [vehicles, filterBranch])

  const visibleLocalLogs = useMemo(() => {
    let filtered = localLogs
    // Apply branch filter (if filterBranch !== 'ALL')
    if (filterBranch !== 'ALL') {
      filtered = filtered.filter(log => {
        const detail = log.detail.toLowerCase()
        const actor = log.user.toLowerCase()
        return detail.includes(filterBranch.toLowerCase()) ||
          branchNopols.some(nopol => detail.includes(nopol)) ||
          (!!user?.username && actor.includes(user.username.toLowerCase()))
      })
    } else if (!canViewAllAudits && userBranch !== 'ALL') {
      // fallback
      filtered = filtered.filter(log => {
        const detail = log.detail.toLowerCase()
        return detail.includes(userBranch.toLowerCase()) ||
          vehicles.filter(v => v.branchId === userBranch).map(v => v.nopol.toLowerCase()).some(nopol => detail.includes(nopol))
      })
    }
    
    return filtered
  }, [branchNopols, canViewAllAudits, localLogs, user?.username, userBranch, filterBranch, vehicles])

  const allLogs = serverLogs.length ? serverLogs : visibleLocalLogs

  // Apply Date Filter
  const filteredLogs = useMemo(() => {
    let result = allLogs
    if (filterDate) {
      result = result.filter(log => {
        // extract YYYY-MM-DD from log.ts
        let d = new Date(log.ts)
        if (Number.isNaN(d.getTime())) d = new Date(log.ts.replace(' ', 'T'))
        if (!Number.isNaN(d.getTime())) {
          const makassar = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }))
          const pad = (n: number) => String(n).padStart(2, '0')
          const dateStr = `${makassar.getFullYear()}-${pad(makassar.getMonth() + 1)}-${pad(makassar.getDate())}`
          return dateStr === filterDate
        }
        return log.ts.startsWith(filterDate)
      })
    }
    return result
  }, [allLogs, filterDate])

  const totalPages = Math.ceil(filteredLogs.length / pageSize)
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // reset page on filter change
  useEffect(() => { setCurrentPage(1) }, [filterBranch, filterDate])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/audit', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setServerLogs(data.logs ?? [])
      } catch (e) { console.error(e) }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        subtitle={canViewAllAudits ? 'Log seluruh aktivitas modifikasi data sistem secara otomatis' : `Log aktivitas cabang ${userBranch}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <Select value={filterBranch} onChange={v => setFilterBranch(v)} disabled={!canViewAllAudits && userBranch !== 'ALL'}>
              {(canViewAllAudits || userBranch === 'ALL') && <option value="ALL">ALL — Semua Cabang</option>}
              {effectiveBranchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="!p-4">
          <p className="text-[11px] text-gray-400 mb-1">Total Log Terfilter</p>
          <p className="text-[26px] font-bold text-teal-600">{filteredLogs.length}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-[11px] text-gray-400 mb-1">Log Hari Ini (Terfilter)</p>
          <p className="text-[26px] font-bold text-green-600">
            {filteredLogs.filter(l => l.ts.startsWith(new Date().toISOString().slice(0,10))).length}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-[11px] text-gray-400 mb-1">Jenis Aksi Unik</p>
          <p className="text-[26px] font-bold text-purple-600">
            {new Set(filteredLogs.map(l => l.action)).size}
          </p>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ background: '#5B8F82', color: '#fff' }}>
              {['No','Timestamp','Pengguna','Aksi','Detail'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[11px] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log, i) => (
              <tr key={i} className={`border-b border-slate-100 hover:bg-teal-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                <td className="px-3 py-2.5 text-gray-400 text-[11px]">{(currentPage - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2.5 font-mono-jb text-[11px] text-gray-500 whitespace-nowrap">{formatAuditTimestamp(log.ts)}</td>
                <td className="px-3 py-2.5 font-medium text-[11px] whitespace-nowrap">{log.user}</td>
                <td className="px-3 py-2.5">
                  <Badge color={ACTION_COLOR[log.action] ?? 'blue'}>{log.action}</Badge>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-gray-600">{formatAuditDetail(log.detail)}</td>
              </tr>
            ))}
            {paginatedLogs.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-[12px] text-gray-400">Belum ada aktivitas tercatat.</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-slate-200 bg-slate-50">
            <span className="text-[11px] text-[#5B8F82]">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}
                className="px-3 py-1 rounded border border-slate-300 bg-white text-[11px] font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Sebelumnya
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}
                className="px-3 py-1 rounded border border-slate-300 bg-white text-[11px] font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
