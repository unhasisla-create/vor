'use client'

import { useState, useEffect, useMemo } from 'react'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider, PageHeader, Btn, Badge, Modal, FormField, inputCls, selectCls, showToast } from '@/components/ui'
import { getStoredUser } from '@/lib/auth-client'
import type { UserSession } from '@/lib/types'

type Driver = {
  id: string
  code: string
  name: string
  phone: string | null
  branch: string | null
  isActive: boolean
  inactiveReason: string | null
  vehicleCount: number
}

type BranchOption = {
  id: string
  code: string
  name: string
  isActive: boolean
}

const EMPTY_DRIVER = {
  code: '',
  name: '',
  phone: '',
  branchCode: '',
  isActive: true,
  inactiveReason: '',
}

export default function Page() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchesError, setBranchesError] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_DRIVER })
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)

  const canManageDrivers = currentUser?.role === 'Admin'

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setCurrentUser(stored)
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async res => res.ok ? res.json() : null)
      .then(data => { if (data?.user) setCurrentUser(data.user) })
      .catch(() => {})
  }, [])

  const loadDrivers = async () => {
    try {
      const res = await fetch('/api/admin/drivers', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setDrivers(data.drivers ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadBranches = async () => {
    setBranchesLoading(true)
    setBranchesError('')
    try {
      const res = await fetch('/api/admin/branches', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setBranchesError(data?.error || 'Gagal memuat data cabang dari database.')
        return
      }
      const data = await res.json()
      setBranches(data.branches ?? data)
    } catch (e) {
      console.error(e)
      setBranchesError('Gagal terhubung ke server.')
    } finally {
      setBranchesLoading(false)
    }
  }

  useEffect(() => {
    loadDrivers()
    loadBranches()
  }, [])

  const filteredDrivers = useMemo(
    () => drivers.filter(driver =>
      driver.code.toLowerCase().includes(search.toLowerCase()) ||
      driver.name.toLowerCase().includes(search.toLowerCase())
    ),
    [drivers, search]
  )

  const activeBranchOptions = useMemo(
    () => branches.filter(b => b.isActive || b.code === form.branchCode),
    [branches, form.branchCode]
  )

  const openNew = () => {
    setEditId(null)
    setForm({ ...EMPTY_DRIVER })
    setFormOpen(true)
  }

  const openEdit = (driver: Driver) => {
    setEditId(driver.id)
    setForm({
      code: driver.code,
      name: driver.name,
      phone: driver.phone ?? '',
      branchCode: driver.branch ?? '',
      isActive: driver.isActive,
      inactiveReason: driver.inactiveReason ?? '',
    })
    setFormOpen(true)
  }

  const saveDriver = async () => {
    if (!form.name.trim()) {
      showToast('Nama driver wajib diisi!', 'error')
      return
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      branchCode: form.branchCode || undefined,
    }

    if (form.code.trim()) payload.code = form.code.trim()

    try {
      const url = editId ? `/api/admin/drivers/${editId}` : '/api/admin/drivers'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Gagal menyimpan driver.', 'error')
        return
      }
      await loadDrivers()
      setFormOpen(false)
      showToast(editId ? 'Driver berhasil diperbarui.' : 'Driver baru berhasil ditambahkan.')
    } catch (e) {
      console.error(e)
      showToast('Gagal menyimpan driver.', 'error')
    }
  }

  const deactivateDriver = async (driver: Driver) => {
    const reason = prompt(`Alasan menonaktifkan ${driver.code}:`)
    if (!reason?.trim()) return

    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Gagal menonaktifkan driver.', 'error')
        return
      }
      await loadDrivers()
      showToast(`${driver.code} dinonaktifkan.`)
    } catch (e) {
      console.error(e)
      showToast('Gagal menonaktifkan driver.', 'error')
    }
  }

  const reactivateDriver = async (driver: Driver) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true, inactiveReason: '' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Gagal mengaktifkan driver.', 'error')
        return
      }
      await loadDrivers()
      showToast(`${driver.code} diaktifkan.`)
    } catch (e) {
      console.error(e)
      showToast('Gagal mengaktifkan driver.', 'error')
    }
  }

  const updateField = (key: keyof typeof EMPTY_DRIVER, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <ShellLayout>
      <ToastProvider />

      <PageHeader title="Master Driver" subtitle="Manajemen daftar driver" actions={
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode / nama..."
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          {canManageDrivers && <Btn onClick={openNew}>+ Tambah Driver</Btn>}
        </div>
      } />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ background: '#5B8F82', color: '#fff' }}>
              {['No', 'Kode', 'Nama', 'Cabang', 'Telepon', 'Armada', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((driver, index) => (
              <tr key={driver.id} className={`border-b border-slate-100 hover:bg-teal-50 transition-colors ${!driver.isActive ? 'opacity-50 italic' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-3 py-2.5 text-gray-400 text-[11px]">{index + 1}</td>
                <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{driver.code}</td>
                <td className="px-3 py-2.5">{driver.name}</td>
                <td className="px-3 py-2.5">{driver.branch ?? '-'}</td>
                <td className="px-3 py-2.5">{driver.phone || '-'}</td>
                <td className="px-3 py-2.5 text-center font-semibold">{driver.vehicleCount}</td>
                <td className="px-3 py-2.5"><Badge color={driver.isActive ? 'green' : 'gray'}>{driver.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                  {!driver.isActive && driver.inactiveReason && <p className="text-[10px] text-gray-400 mt-0.5">{driver.inactiveReason}</p>}
                </td>
                <td className="px-3 py-2.5">
                  {canManageDrivers ? (
                    <div className="flex gap-1.5 flex-wrap">
                      <Btn size="sm" variant="outline" onClick={() => openEdit(driver)}>Edit</Btn>
                      {driver.isActive
                        ? <Btn size="sm" variant="ghost-red" onClick={() => deactivateDriver(driver)}>Nonaktifkan</Btn>
                        : <Btn size="sm" variant="ghost-green" onClick={() => reactivateDriver(driver)}>Aktifkan</Btn>}
                    </div>
                  ) : (
                    <span className="text-[#5B8F82] text-sm">Tidak bisa</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredDrivers.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[12px] text-gray-400">Tidak ada data driver ditemukan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-gray-400 mt-2 px-1">
        Tampil: <strong>{filteredDrivers.length}</strong> | Aktif: <strong>{drivers.filter(d => d.isActive).length}</strong> | Nonaktif: <strong>{drivers.filter(d => !d.isActive).length}</strong>
      </p>

      {formOpen && (
        <Modal title={editId ? 'Edit Driver' : 'Tambah Driver'} onClose={() => setFormOpen(false)} width={520}
          footer={<> 
            <Btn variant="outline" onClick={() => setFormOpen(false)}>Batal</Btn>
            <Btn onClick={saveDriver}>Simpan</Btn>
          </>}
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kode Driver">
              <input
                className={inputCls}
                value={form.code}
                onChange={e => updateField('code', e.target.value)}
                placeholder="Biarkan kosong untuk kode otomatis"
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Nama Driver *">
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Cabang">
              <select className={selectCls} value={form.branchCode} onChange={e => updateField('branchCode', e.target.value)}>
                <option value="">-</option>
                {activeBranchOptions.map(branch => (
                  <option key={branch.id} value={branch.code}>{branch.code} — {branch.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Telepon">
              <input
                className={inputCls}
                value={form.phone}
                onChange={e => updateField('phone', e.target.value)}
              />
            </FormField>
            {editId && !form.isActive && (
              <div className="col-span-2">
                <FormField label="Alasan Nonaktif">
                  <input
                    className={inputCls}
                    value={form.inactiveReason}
                    onChange={e => updateField('inactiveReason', e.target.value)}
                  />
                </FormField>
              </div>
            )}
          </div>
        </Modal>
      )}
    </ShellLayout>
  )
}
