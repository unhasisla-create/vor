'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useVORStore } from '@/lib/store'
import { CUSTOMERS, STATUS_MASTER } from '@/lib/constants'
import { PageHeader, Btn, Badge, Card, Tabs, Modal, FormField, inputCls, selectCls, SkeletonTable } from '@/components/ui'
import { getStoredUser } from '@/lib/auth-client'
import { showToast } from '@/components/ui'
import type { Vehicle, UserSession } from '@/lib/types'
import VehicleImportModal from './VehicleImportModal'
import { Pencil, PowerOff, CheckCircle, Search, Inbox } from 'lucide-react'

const EMPTY_VEHICLE: Omit<Vehicle, 'id'> = {
  nopol: '', type: '', tonase: 1, kubikasi: 7,
  chassisNumber: '', revenueTarget: 0,
  customer: CUSTOMERS[0], driver: '', branchId: 'LMKS', isActive: true, inactiveReason: '',
}

const ROLE_OPTIONS = ['Admin', 'Planner', 'Supervisor', 'Management']

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

type DriverForm = {
  code: string
  name: string
  phone: string
  branchCode: string
  inactiveReason: string
}


type VehicleTypeData = {
  id: string
  code: string
  name: string
  isActive: boolean
  inactiveReason: string | null
  vehicleCount: number
}

type Customer = {
  id: string
  code: string
  name: string
  branchId: string | null
  branchName?: string
  isActive: boolean
  inactiveReason: string | null
  vehicleCount: number
}

type CustomerForm = {
  code: string
  name: string
  branchId: string
  inactiveReason: string
}

export default function MasterData() {
  const { vehicles, addVehicle, updateVehicle, deactivateVehicle, reactivateVehicle, setBranches, loadFromServer } = useVORStore()
  const [tab, setTab] = useState('Vehicle') // was 'Armada Kendaraan'
  const [showInactive, setShowInactive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>({ ...EMPTY_VEHICLE })
  const [search, setSearch] = useState('')
  const [branchesServer, setBranchesServer] = useState<{ id: string, code: string, name: string, isActive: boolean }[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchesError, setBranchesError] = useState('')
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const [editBranchId, setEditBranchId] = useState<string | null>(null)
  const [newBranchCode, setNewBranchCode] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [usersServer, setUsersServer] = useState<{ id: string; username: string; name: string | null; role: string; branch: string | null; isActive: boolean; createdAt: string }[]>([])
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ username: '', name: '', role: 'Planner', branchCode: '', password: '' })
  const [userLoading, setUserLoading] = useState(false)
  const [showInactiveBranches, setShowInactiveBranches] = useState(false)
  const [showInactiveUsers, setShowInactiveUsers] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  const [driversServer, setDriversServer] = useState<Driver[]>([])
  const [driverModalOpen, setDriverModalOpen] = useState(false)
  const [editDriverId, setEditDriverId] = useState<string | null>(null)
  const [driverForm, setDriverForm] = useState<DriverForm>({ code: '', name: '', phone: '', branchCode: '', inactiveReason: '' })
  const [showInactiveDrivers, setShowInactiveDrivers] = useState(false)
  const [driverLoading, setDriverLoading] = useState(false)
  const [driverError, setDriverError] = useState('')

  const [customersServer, setCustomersServer] = useState<Customer[]>([])
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null)
  const [customerForm, setCustomerForm] = useState<CustomerForm>({ code: '', name: '', branchId: '', inactiveReason: '' })
  const [showInactiveCustomers, setShowInactiveCustomers] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerError, setCustomerError] = useState('')

  const [vehicleTypesServer, setVehicleTypesServer] = useState<VehicleTypeData[]>([])
  const [vehicleTypeModalOpen, setVehicleTypeModalOpen] = useState(false)
  const [editVehicleTypeId, setEditVehicleTypeId] = useState<string | null>(null)
  const [vehicleTypeForm, setVehicleTypeForm] = useState({ code: '', name: '', inactiveReason: '' })
  const [showInactiveVehicleTypes, setShowInactiveVehicleTypes] = useState(false)
  const [vehicleTypeLoading, setVehicleTypeLoading] = useState(false)
  const [vehicleTypeError, setVehicleTypeError] = useState('')

  const [statusConfigs, setStatusConfigs] = useState<any[]>([])
  const [statusConfigLoading, setStatusConfigLoading] = useState(false)
  const [statusConfigError, setStatusConfigError] = useState('')
  const [statusEditOpen, setStatusEditOpen] = useState(false)
  const [statusAddOpen, setStatusAddOpen] = useState(false)
  const [showInactiveStatuses, setShowInactiveStatuses] = useState(false)
  const [statusSearch, setStatusSearch] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [editingStatus, setEditingStatus] = useState<any>(null)
  const [statusForm, setStatusForm] = useState({ desc: '', group: '', color: '', details: '', isForecast: true, isPA: false, isUA: false, isPROD: false })
  const [newStatusForm, setNewStatusForm] = useState({ code: '', desc: '', group: '', color: '#6b7280', details: '', isForecast: true, isPA: false, isUA: false, isPROD: false })

  const canManageBranches = currentUser && (currentUser.role === 'Admin')
  const canManageUsers = currentUser && (currentUser.role === 'Admin')

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setCurrentUser(stored)

    fetch('/api/auth/me', { credentials: 'include' })
      .then(async res => {
        if (!res.ok) return null
        const data = await res.json()
        return data?.user ?? null
      })
      .then(user => {
        if (user) setCurrentUser(user)
      })
      .catch(() => {})
  }, [])

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true)
    setBranchesError('')
    try {
      const res = await fetch('/api/admin/branches', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setBranchesError(data?.error || 'Failed to load branch data.')
        return
      }
      const data = await res.json()
      const branches = data.branches ?? data
      setBranchesServer(branches)
      setBranches(branches)
    } catch (e) {
      console.error(e)
      setBranchesError('Failed to connect to server.')
    } finally {
      setBranchesLoading(false)
    }
  }, [setBranches])

  const loadUsers = async () => {
    setUserLoading(true)
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUsersServer(data.users ?? data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUserLoading(false)
    }
  }

  const loadDrivers = async () => {
    setDriverLoading(true)
    setDriverError('')
    try {
      const res = await fetch('/api/admin/drivers', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setDriverError(data?.error || 'Failed to load drivers.')
        return
      }
      const data = await res.json()
      setDriversServer(data.drivers ?? data)
    } catch (e) {
      console.error(e)
      setDriverError('Failed to connect to server.')
    } finally {
      setDriverLoading(false)
    }
  }


  const loadVehicleTypes = async () => {
    setVehicleTypeLoading(true)
    setVehicleTypeError('')
    try {
      const res = await fetch('/api/admin/vehicle-types', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setVehicleTypeError(data?.error || 'Failed to load vehicle types.')
        return
      }
      const data = await res.json()
      setVehicleTypesServer(data.vehicleTypes ?? data)
    } catch (e) {
      console.error(e)
      setVehicleTypeError('Failed to connect to server.')
    } finally {
      setVehicleTypeLoading(false)
    }
  }

  const loadCustomers = async () => {
    setCustomerLoading(true)
    setCustomerError('')
    try {
      const res = await fetch('/api/admin/customers', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setCustomerError(data?.error || 'Failed to load customers.')
        return
      }
      const data = await res.json()
      setCustomersServer(data.customers ?? data)
    } catch (e) {
      console.error(e)
      setCustomerError('Failed to connect to server.')
    } finally {
      setCustomerLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  useEffect(() => {
    if (tab === 'User') {
      loadUsers()
    }
    if (tab === 'Driver' || tab === 'Vehicle' || tab === 'Customer' || tab === 'Vehicle Type') {
      loadDrivers()
      loadCustomers()
      loadVehicleTypes()
    }
    if (tab === 'Status Configuration') {
      loadStatusConfigs()
    }
  }, [tab])

  const loadStatusConfigs = async () => {
    setStatusConfigLoading(true)
    setStatusConfigError('')
    try {
      const res = await fetch('/api/statuses', { credentials: 'include' })
      if (!res.ok) { setStatusConfigError('Gagal memuat status.'); return }
      const data = await res.json()
      const configs = data.statuses ?? []
      if (configs.length > 0) {
        setStatusConfigs(configs)
      } else {
        setStatusConfigs(STATUS_MASTER.map((s: any) => ({
          code: s.code, desc: s.desc, group: s.group, color: s.color,
          details: s.details, isForecast: s.fc, sortOrder: 0, isActive: true,
          isPA: s.isPA ?? false, isUA: s.isUA ?? false, isPROD: s.isPROD ?? false,
        })))
      }
    } catch {
      setStatusConfigs(STATUS_MASTER.map((s: any) => ({
        code: s.code, desc: s.desc, group: s.group, color: s.color,
        details: s.details, isForecast: s.fc, sortOrder: 0, isActive: true,
        isPA: s.isPA ?? false, isUA: s.isUA ?? false, isPROD: s.isPROD ?? false,
      })))
    } finally {
      setStatusConfigLoading(false)
    }
  }

  const openEditStatus = (s: any) => {
    setEditingStatus(s)
    setStatusForm({ desc: s.desc, group: s.group, color: s.color, details: s.details || '', isForecast: s.isForecast, isPA: !!s.isPA, isUA: !!s.isUA, isPROD: !!s.isPROD })
    setStatusEditOpen(true)
  }

  const createStatusConfig = async () => {
    if (!newStatusForm.code.trim() || !newStatusForm.desc.trim() || !newStatusForm.group.trim()) {
      showToast('Code, Desc, dan Group wajib diisi!', 'error'); return
    }
    try {
      const res = await fetch('/api/statuses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatusForm),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Gagal membuat status.', 'error'); return
      }
      showToast(`Status "${newStatusForm.code}" berhasil dibuat.`)
      setStatusAddOpen(false)
      setNewStatusForm({ code: '', desc: '', group: '', color: '#6b7280', details: '', isForecast: true, isPA: false, isUA: false, isPROD: false })
      loadStatusConfigs()
    } catch {
      showToast('Gagal membuat status.', 'error')
    }
  }

  const toggleStatusActive = async (code: string, currentActive: boolean) => {
    const action = currentActive ? 'nonaktifkan' : 'aktifkan'
    if (!confirm(`Yakin ingin ${action} status "${code}"?`)) return
    try {
      const res = await fetch(`/api/statuses/${code}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (!res.ok) { showToast('Gagal mengubah status.', 'error'); return }
      showToast(`Status "${code}" berhasil di${action}.`)
      loadStatusConfigs()
    } catch {
      showToast('Gagal mengubah status.', 'error')
    }
  }

  const saveStatusConfig = async () => {
    if (!editingStatus) return
    if (!statusForm.desc.trim()) { showToast('Deskripsi status wajib diisi!', 'error'); return }
    try {
      const res = await fetch(`/api/statuses/${editingStatus.code}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desc: statusForm.desc,
          group: statusForm.group,
          color: statusForm.color,
          details: statusForm.details,
          isForecast: statusForm.isForecast,
          isPA: statusForm.isPA,
          isUA: statusForm.isUA,
          isPROD: statusForm.isPROD,
        }),
      })
      if (!res.ok) { showToast('Gagal menyimpan status.', 'error'); return }
      showToast(`Status "${editingStatus.code}" berhasil diperbarui.`)
      setStatusEditOpen(false)
      setEditingStatus(null)
      loadStatusConfigs()
    } catch {
      showToast('Gagal menyimpan status.', 'error')
    }
  }

  const getStatusColor = (code: string) => {
    const s = statusConfigs.find(x => x.code === code)
    return s?.color ?? '#e5e7eb'
  }

  const getStatusMeta = (code: string) => {
    return statusConfigs.find(x => x.code === code) ?? null
  }

  const getTextColor = (hex: string) => {
    const h = hex.replace('#', '')
    if (h.length < 6) return '#111827'
    const r = parseInt(h.slice(0,2),16)
    const g = parseInt(h.slice(2,4),16)
    const b = parseInt(h.slice(4,6),16)
    return (r*299 + g*587 + b*114) / 1000 > 140 ? '#111827' : '#ffffff'
  }

  const kpiFlag = (code: string, key: 'pa' | 'ua' | 'prod') => {
    const s = statusConfigs.find((x: any) => x.code === code)
    if (s) {
      switch (key) {
        case 'pa':   return !!s.isPA
        case 'ua':   return !!s.isUA
        case 'prod': return !!s.isPROD
      }
    }
    const m = STATUS_MASTER.find((x: any) => x.code === code)
    if (m) {
      switch (key) {
        case 'pa':   return !!m.isPA
        case 'ua':   return !!m.isUA
        case 'prod': return !!m.isPROD
      }
    }
    return false
  }

  const filtered = useMemo(() =>
    vehicles.filter(v => (showInactive ? true : v.isActive) &&
      (v.nopol.toLowerCase().includes(search.toLowerCase()) ||
       v.driver.toLowerCase().includes(search.toLowerCase()) ||
       v.customer.toLowerCase().includes(search.toLowerCase())))
  , [vehicles, showInactive, search])

  const visibleUsers = useMemo(() => {
    let items = usersServer.filter(u => showInactiveUsers || u.isActive)
    if (userSearch) {
      const q = userSearch.toLowerCase()
      items = items.filter(u => u.username.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q)))
    }
    return items
  }, [usersServer, showInactiveUsers, userSearch])

  const filteredDrivers = useMemo(
    () => driversServer.filter(d =>
      (showInactiveDrivers ? true : d.isActive) &&
      (d.code.toLowerCase().includes(search.toLowerCase()) || d.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [driversServer, showInactiveDrivers, search]
  )


  const filteredVehicleTypes = useMemo(
    () => vehicleTypesServer.filter(v =>
      (showInactiveVehicleTypes ? true : v.isActive) &&
      (v.code.toLowerCase().includes(search.toLowerCase()) || v.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [vehicleTypesServer, showInactiveVehicleTypes, search]
  )

  const filteredStatuses = useMemo(() => {
    let items = statusConfigs.filter(s => showInactiveStatuses ? true : s.isActive)
    if (statusSearch) {
      const q = statusSearch.toLowerCase()
      items = items.filter(s => s.code.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    }
    return items
  }, [statusConfigs, showInactiveStatuses, statusSearch])

  const filteredBranches = useMemo(() => {
    let items = branchesServer.filter(b => showInactiveBranches || b.isActive)
    if (branchSearch) {
      const q = branchSearch.toLowerCase()
      items = items.filter(b => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
    }
    return items
  }, [branchesServer, showInactiveBranches, branchSearch])

  const filteredCustomers = useMemo(
    () => customersServer.filter(c =>
      (showInactiveCustomers ? true : c.isActive) &&
      (c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [customersServer, showInactiveCustomers, search]
  )

  const branchOptions = useMemo(() => branchesServer, [branchesServer])

  const activeBranchOptions = useMemo(
    () => branchOptions.filter(b => b.isActive || b.code === form.branchId),
    [branchOptions, form.branchId]
  )

  const activeDriverBranchOptions = useMemo(
    () => branchOptions.filter(b => b.isActive || b.code === driverForm.branchCode),
    [branchOptions, driverForm.branchCode]
  )

  const openNewDriver = () => {
    setEditDriverId(null)
    setDriverForm({ code: '', name: '', phone: '', branchCode: '', inactiveReason: '' })
    setDriverModalOpen(true)
  }

  const openEditDriver = (driver: Driver) => {
    setEditDriverId(driver.id)
    setDriverForm({
      code: driver.code,
      name: driver.name,
      phone: driver.phone ?? '',
      branchCode: driver.branch ?? '',
      inactiveReason: driver.inactiveReason ?? '',
    })
    setDriverModalOpen(true)
  }

  const saveDriver = async () => {
    if (!driverForm.name.trim()) { showToast('Driver name is required!', 'error'); return }
    const payload: any = {
      name: driverForm.name.trim(),
      phone: driverForm.phone.trim() || undefined,
      branchCode: driverForm.branchCode || undefined,
    }
    if (driverForm.code.trim()) payload.code = driverForm.code.trim()

    try {
      const url = editDriverId ? `/api/admin/drivers/${editDriverId}` : '/api/admin/drivers'
      const method = editDriverId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to save driver.', 'error')
        return
      }
      await loadDrivers()
      await loadFromServer()
      setDriverModalOpen(false)
      showToast(editDriverId ? 'Driver updated successfully.' : 'New driver added successfully.')
    } catch (e) {
      console.error(e)
      showToast('Failed to save driver.', 'error')
    }
  }

  const deactivateDriver = async (driver: Driver) => {
    const reason = prompt(`Reason for deactivating ${driver.code}:`)
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
        showToast(data?.error || 'Failed to deactivate driver.', 'error')
        return
      }
      await loadDrivers()
      await loadFromServer()
      showToast(`${driver.code} deactivated.`)
    } catch (e) {
      console.error(e)
      showToast('Failed to deactivate driver.', 'error')
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
        showToast(data?.error || 'Failed to activate driver.', 'error')
        return
      }
      await loadDrivers()
      await loadFromServer()
      showToast(`${driver.code} activated.`)
    } catch (e) {
      console.error(e)
      showToast('Failed to activate driver.', 'error')
    }
  }

  const updateField = (k: keyof DriverForm, val: string) => setDriverForm(p => ({ ...p, [k]: val }))

  const openNewVehicleType = () => {
    setEditVehicleTypeId(null)
    setVehicleTypeForm({ code: '', name: '', inactiveReason: '' })
    setVehicleTypeModalOpen(true)
  }

  const openEditVehicleType = (vt: VehicleTypeData) => {
    setEditVehicleTypeId(vt.id)
    setVehicleTypeForm({ code: vt.code, name: vt.name, inactiveReason: vt.inactiveReason ?? '' })
    setVehicleTypeModalOpen(true)
  }

  const saveVehicleType = async () => {
    if (!vehicleTypeForm.name.trim()) { showToast('Vehicle Type name is required!', 'error'); return }
    const payload: any = { name: vehicleTypeForm.name.trim() }
    if (vehicleTypeForm.code.trim()) payload.code = vehicleTypeForm.code.trim()

    try {
      const url = editVehicleTypeId ? `/api/admin/vehicle-types/${editVehicleTypeId}` : '/api/admin/vehicle-types'
      const method = editVehicleTypeId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to save vehicle type.', 'error')
        return
      }
      await loadVehicleTypes()
      setVehicleTypeModalOpen(false)
      showToast(editVehicleTypeId ? 'Vehicle type updated successfully.' : 'New vehicle type added successfully.')
    } catch (e) {
      console.error(e)
      showToast('Failed to save vehicle type.', 'error')
    }
  }

  const deactivateVehicleType = async (vt: VehicleTypeData) => {
    const reason = prompt(`Reason for deactivating ${vt.code}:`)
    if (!reason?.trim()) return
    try {
      const res = await fetch(`/api/admin/vehicle-types/${vt.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to deactivate vehicle type.', 'error')
        return
      }
      await loadVehicleTypes()
      showToast(`${vt.code} deactivated.`)
    } catch (e) {
      console.error(e)
      showToast('Failed to deactivate vehicle type.', 'error')
    }
  }

  const reactivateVehicleType = async (vt: VehicleTypeData) => {
    try {
      const res = await fetch(`/api/admin/vehicle-types/${vt.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true, inactiveReason: '' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to activate vehicle type.', 'error')
        return
      }
      await loadVehicleTypes()
      showToast(`${vt.code} activated.`)
    } catch (e) {
      console.error(e)
      showToast('Failed to activate vehicle type.', 'error')
    }
  }

  const openNewCustomer = () => {
    setEditCustomerId(null)
    setCustomerForm({ code: '', name: '', branchId: '', inactiveReason: '' })
    setCustomerModalOpen(true)
  }

  const openEditCustomer = (customer: Customer) => {
    setEditCustomerId(customer.id)
    setCustomerForm({
      code: customer.code,
      name: customer.name,
      branchId: customer.branchId ?? '',
      inactiveReason: customer.inactiveReason ?? '',
    })
    setCustomerModalOpen(true)
  }

  const saveCustomer = async () => {
    if (!customerForm.name.trim()) { showToast('Customer name is required!', 'error'); return }
    const payload: any = { name: customerForm.name.trim(), branchId: customerForm.branchId || null }
    if (customerForm.code.trim()) payload.code = customerForm.code.trim()

    try {
      const url = editCustomerId ? `/api/admin/customers/${editCustomerId}` : '/api/admin/customers'
      const method = editCustomerId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to save customer.', 'error')
        return
      }
      await loadCustomers()
      await loadFromServer()
      setCustomerModalOpen(false)
      showToast(editCustomerId ? 'Customer updated successfully.' : 'New customer added successfully.')
    } catch (e) {
      console.error(e)
      showToast('Failed to save customer.', 'error')
    }
  }

  const deactivateCustomer = async (customer: Customer) => {
    const reason = prompt(`Reason for deactivating ${customer.code}:`)
    if (!reason?.trim()) return
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to deactivate customer.', 'error')
        return
      }
      await loadCustomers()
      await loadFromServer()
      showToast(`${customer.code} deactivated.`)
    } catch (e) {
      console.error(e)
      showToast('Failed to deactivate customer.', 'error')
    }
  }

  const reactivateCustomer = async (customer: Customer) => {
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true, inactiveReason: '' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to activate customer.', 'error')
        return
      }
      await loadCustomers()
      await loadFromServer()
      showToast(`${customer.code} activated.`)
    } catch (e) {
      console.error(e)
      showToast('Failed to activate customer.', 'error')
    }
  }



  const openNew = () => {
    const defaultType = vehicleTypesServer.find(vt => vt.isActive)?.name ?? ''
    setForm({ ...EMPTY_VEHICLE, type: defaultType })
    setEditId(null)
    setFormOpen(true)
  }
  const openEdit = (v: Vehicle) => { setForm({ ...v }); setEditId(v.id); setFormOpen(true) }

  const save = () => {
    if (!form.nopol.trim()) { showToast('License plate is required!', 'error'); return }
    if (editId) { updateVehicle(editId, form); showToast('Vehicle updated successfully.') }
    else { addVehicle(form); showToast('New vehicle added.') }
    setFormOpen(false)
  }

  const doDeactivate = (v: Vehicle) => {
    const reason = prompt(`Reason for deactivating ${v.nopol}:`)
    if (!reason?.trim()) return
    deactivateVehicle(v.id, reason); showToast(`${v.nopol} deactivated.`)
  }

  const openNewUser = () => {
    setEditUserId(null)
    setUserForm({ username: '', name: '', role: 'Planner', branchCode: '', password: '' })
    setUserModalOpen(true)
  }

  const openEditUser = (user: { id: string; username: string; name: string | null; role: string; branch: string | null }) => {
    setEditUserId(user.id)
    setUserForm({ username: user.username, name: user.name ?? '', role: user.role, branchCode: user.branch ?? '', password: '' })
    setUserModalOpen(true)
  }

  const saveUser = async () => {
    if (!userForm.username.trim()) { showToast('Username is required!', 'error'); return }
    if (!userForm.role) { showToast('Role is required!', 'error'); return }
    if (!editUserId && !userForm.password.trim()) { showToast('Password is required for new users!', 'error'); return }

    const payload: any = {
      username: userForm.username.trim(),
      name: userForm.name.trim(),
      role: userForm.role,
      branchCode: userForm.branchCode || undefined,
    }
    if (!editUserId) payload.password = userForm.password

    try {
      const res = await fetch(editUserId ? `/api/admin/users/${editUserId}` : '/api/admin/users', {
        method: editUserId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Failed to save user.', 'error')
        return
      }
      await loadUsers()
      setUserModalOpen(false)
      showToast(editUserId ? 'User updated successfully.' : 'New user added successfully.')
    } catch (e) {
      console.error(e)
      showToast('Failed to save user.', 'error')
    }
  }

  const f = (k: keyof Omit<Vehicle,'id'>, val: unknown) => setForm(p => ({ ...p, [k]: val }))

  return (
    <div>
      <PageHeader title="Master Data" 
      // subtitle="Manajemen armada, status, cabang, pengguna, dan driver"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {tab === 'Vehicle' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate / driver..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
                  Show inactive
                </label>
                <Btn variant="outline" onClick={() => setImportModalOpen(true)}>Import Excel</Btn>
                <Btn onClick={openNew}>+ Add Vehicle</Btn>
              </>
            )}
            {tab === 'Status Configuration' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={statusSearch} onChange={e => setStatusSearch(e.target.value)} placeholder="Search code / status..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveStatuses} onChange={e => setShowInactiveStatuses(e.target.checked)} className="rounded" />
                  Show inactive
                </label>
                <Btn onClick={() => setStatusAddOpen(true)}>+ Add Status</Btn>
              </>
            )}
            {tab === 'Branch' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={branchSearch} onChange={e => setBranchSearch(e.target.value)} placeholder="Search code / name..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveBranches} onChange={e => setShowInactiveBranches(e.target.checked)} className="rounded" />
                  Show inactive branches
                </label>
                {canManageBranches && <Btn onClick={() => { setEditBranchId(null); setNewBranchCode(''); setNewBranchName(''); setBranchModalOpen(true) }}>+ Add Branch</Btn>}
              </>
            )}
            {tab === 'User' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search username / name..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveUsers} onChange={e => setShowInactiveUsers(e.target.checked)} className="rounded" />
                  Show inactive users
                </label>
                {canManageUsers && <Btn onClick={openNewUser}>+ Add User</Btn>}
              </>
            )}
            {tab === 'Driver' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code / name..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveDrivers} onChange={e => setShowInactiveDrivers(e.target.checked)} className="rounded" />
                  Show inactive
                </label>
                {canManageUsers && <Btn onClick={openNewDriver}>+ Add Driver</Btn>}
              </>
            )}

              {tab === 'Vehicle Type' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code / name..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveVehicleTypes} onChange={e => setShowInactiveVehicleTypes(e.target.checked)} className="rounded" />
                  Show inactive
                </label>
                {canManageUsers && <Btn onClick={openNewVehicleType}>+ Add Vehicle Type</Btn>}
              </>
            )}
                
              {tab === 'Customer' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A9E94]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code / name..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-48 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveCustomers} onChange={e => setShowInactiveCustomers(e.target.checked)} className="rounded" />
                  Show inactive
                </label>
                {canManageUsers && <Btn onClick={openNewCustomer}>+ Add Customer</Btn>}
              </>
            )}
          </div>
        }
      />

      {/* <Tabs tabs={['Armada Kendaraan','Konfigurasi Status','Cabang','Driver','Customer','Pengguna']} active={tab} onChange={setTab} /> */}
      {/* old Indonesian tab labels:
          ['Armada Kendaraan','Konfigurasi Status','Cabang','Driver','Customer','Pengguna']
      */}
      <Tabs tabs={['Vehicle', 'Status Configuration', 'Branch', 'Driver', 'Vehicle Type', 'Customer', 'User']} active={tab} onChange={setTab} />


      {tab === 'Vehicle' && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  <th className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap rounded-tl-2xl"
                    style={{ position: 'sticky', left: 0, zIndex: 10, background: '#5B8F82', minWidth: 35 }}>No</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap"
                    style={{ position: 'sticky', left: '41px', zIndex: 10, background: '#5B8F82' }}>License Plate</th>
                  {['Chassis Number','Type','Tonnage','Cubic','Revenue Target','Customer','Driver','Branch','Status','Action'].map(h => (
                    <th key={h} className={`px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap ${h==='Action' ? 'last:rounded-tr-2xl' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const b = branchOptions.find(x => x.code === v.branchId)
                  const bg = i%2===0 ? '#fff' : '#f8fafc'
                  return (
                    <tr key={v.id} className={`border-b border-slate-100 hover:bg-teal-50 transition-colors
                      ${!v.isActive ? 'opacity-50 italic' : ''} ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                      <td className="px-3 py-2.5 text-gray-400 text-[11px]"
                        style={{ position: 'sticky', left: 0, zIndex: 5, background: bg }}>{i+1}</td>
                      <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]"
                        style={{ position: 'sticky', left: '41px', zIndex: 5, background: bg }}>{v.nopol}</td>
                      <td className="px-3 py-2.5 text-[11px] text-[#4A6B60]">{v.chassisNumber || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{v.type}</td>
                      <td className="px-3 py-2.5 text-center">{v.tonase}</td>
                      <td className="px-3 py-2.5 text-center">{v.kubikasi}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[11px]">{v.revenueTarget ? v.revenueTarget.toLocaleString('id-ID') : '-'}</td>
                      <td className="px-3 py-2.5">{v.customer}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{v.driver}</td>
                      <td className="px-3 py-2.5"><Badge color="blue">{b?.code ?? v.branchId}</Badge></td>
                      <td className="px-3 py-2.5">
                        <Badge color={v.isActive ? 'green' : 'gray'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>
                        {!v.isActive && v.inactiveReason && <p className="text-[10px] text-gray-400 mt-0.5">{v.inactiveReason}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => openEdit(v)}><Pencil size={14} /></button>
                          {v.isActive
                            ? <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={() => doDeactivate(v)}><PowerOff size={14} /></button>
                            : <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={() => { reactivateVehicle(v.id); showToast(`${v.nopol} activated.`) }}><CheckCircle size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No vehicle data found.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-gray-400 mt-2 px-1">
            Showing: <strong>{filtered.length}</strong> | Active: <strong>{vehicles.filter(v=>v.isActive).length}</strong> | Inactive: <strong>{vehicles.filter(v=>!v.isActive).length}</strong>
          </p>
        </>
      )}

      {tab === 'Status Configuration' && (
        <div>
          {statusConfigError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{statusConfigError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm mt-3">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  {['Code','Status','Group','Description','Color','Forecast','PA','UA','Prod','Active','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statusConfigLoading ? (
                  <SkeletonTable rows={4} cols={11} />
                ) : filteredStatuses.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No status data found.</div>
                  </td></tr>
                ) : filteredStatuses.map((s, i) => (
                  <tr key={s.code} className={`border-b border-slate-100 hover:bg-teal-50 transition-colors ${!s.isActive ? 'opacity-50' : ''} ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: s.color, color: getTextColor(s.color) }}>{s.code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] font-medium">{s.desc}</td>
                    <td className="px-3 py-2.5 text-[10px] text-gray-500">{s.group}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[#4A6B60] max-w-xl break-words">{s.details || '-'}</td>
                    <td className="px-3 py-2.5"><span className="inline-block w-5 h-5 rounded-md border border-slate-200" style={{ background: s.color }} /></td>
                    <td className="px-3 py-2.5 text-center text-[12px]">
                      {s.isForecast ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-red-400">No</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[13px]">{kpiFlag(s.code,'pa') ? <span className="text-green-600">{'\u2713'}</span> : <span className="text-red-300">{'\u2717'}</span>}</td>
                    <td className="px-3 py-2.5 text-center text-[13px]">{kpiFlag(s.code,'ua') ? <span className="text-green-600">{'\u2713'}</span> : <span className="text-red-300">{'\u2717'}</span>}</td>
                    <td className="px-3 py-2.5 text-center text-[13px]">{kpiFlag(s.code,'prod') ? <span className="text-green-600">{'\u2713'}</span> : <span className="text-red-300">{'\u2717'}</span>}</td>
                    <td className="px-3 py-2.5"><Badge color={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => openEditStatus(s)}><Pencil size={14} /></button>
                        {s.isActive ? (
                          <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={() => toggleStatusActive(s.code, true)}><PowerOff size={14} /></button>
                        ) : (
                          <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={() => toggleStatusActive(s.code, false)}><CheckCircle size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-gray-400 mt-2 px-1">
            Showing: <strong>{filteredStatuses.length}</strong> | Active: <strong>{statusConfigs.filter(s => s.isActive).length}</strong> | Inactive: <strong>{statusConfigs.filter(s => !s.isActive).length}</strong>
          </p>
        </div>
      )}

      {tab === 'Branch' && ( // was 'Cabang'
        <div>
          {branchesError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{branchesError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  {['No','Code','Branch Name','Active Fleet','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchesLoading ? (
                  <SkeletonTable rows={3} cols={6} />
                ) : filteredBranches.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No branch data found.</div>
                  </td></tr>
                ) : filteredBranches.map((b, i) => {
                  const cnt = vehicles.filter(v => v.branchId === b.code && v.isActive).length
                  return (
                    <tr key={b.id} className={`border-b border-slate-100 hover:bg-teal-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                      <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5"><Badge color="blue">{b.code}</Badge></td>
                      <td className="px-3 py-2.5 font-medium">{b.name}</td>
                      <td className="px-3 py-2.5 text-center font-semibold">{cnt} units</td>
                      <td className="px-3 py-2.5"><Badge color={b.isActive ? 'green' : 'gray'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-3 py-2.5">
                        {canManageBranches ? (
                          <div className="flex flex-wrap gap-1">
                            <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => {
                              setEditBranchId(b.id)
                              setNewBranchCode(b.code)
                              setNewBranchName(b.name)
                              setBranchModalOpen(true)
                            }}><Pencil size={14} /></button>
                            {b.isActive ? (
                              <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={async ()=>{
                                if(!confirm('Deactivate this branch?')) return
                                const res = await fetch(`/api/admin/branches/${b.id}`, { method: 'DELETE', credentials: 'include' })
                                if(res.ok) {
                                  const data = await (await fetch('/api/admin/branches', { credentials: 'include' })).json()
                                  const branches = data.branches ?? data
                                  setBranchesServer(branches)
                                  setBranches(branches)
                                } else alert('Failed to deactivate')
                              }}><PowerOff size={14} /></button>
                            ) : (
                              <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={async ()=>{
                                if(!confirm('Reactivate this branch?')) return
                                const res = await fetch(`/api/admin/branches/${b.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) })
                                if(res.ok) {
                                  const data = await (await fetch('/api/admin/branches', { credentials: 'include' })).json()
                                  const branches = data.branches ?? data
                                  setBranchesServer(branches)
                                  setBranches(branches)
                                } else alert('Failed to activate branch')
                              }}><CheckCircle size={14} /></button>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'User' && ( // was 'Pengguna'
        <div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  {['No','Username','Name','Role','Branch','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userLoading ? (
                  <SkeletonTable rows={3} cols={7} />
                ) : visibleUsers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No users found.</div>
                  </td></tr>
                ) : visibleUsers.map((u, i) => {
                  const isSelf = currentUser?.id === u.id
                  return (
                    <tr key={u.id} className={`border-b border-slate-100 hover:bg-teal-50 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                      <td className="px-3 py-2.5 text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5 font-mono-jb">{u.username}</td>
                      <td className="px-3 py-2.5">{u.name || '-'}</td>
                      <td className="px-3 py-2.5">{u.role}</td>
                      <td className="px-3 py-2.5">{u.branch || '-'}</td>
                      <td className="px-3 py-2.5"><Badge color={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-3 py-2.5">
                        {canManageUsers ? (
                          isSelf ? (
                            <span className="text-sm text-[#5B8F82]">Your Account</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => { setEditUserId(u.id); setUserForm({ username: u.username, name: u.name ?? '', role: u.role, branchCode: u.branch ?? '', password: '' }); setUserModalOpen(true) }}><Pencil size={14} /></button>
                              {u.isActive ? (
                                <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={async () => {
                                  if (!confirm(`Deactivate user ${u.username}?`)) return
                                  const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', credentials: 'include' })
                                  if (res.ok) { loadUsers(); showToast(`${u.username} deactivated.`) } else showToast('Failed to deactivate pengguna.', 'error')
                                }}><PowerOff size={14} /></button>
                              ) : (
                                <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={async () => {
                                  if (!confirm(`Reactivate user ${u.username}?`)) return
                                  const res = await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) })
                                  if (res.ok) { loadUsers(); showToast(`${u.username} activated.`) } else showToast('Gagal mengaktifkan pengguna.', 'error')
                                }}><CheckCircle size={14} /></button>
                              )}
                            </div>
                          )
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Driver' && (
        <div>
          {driverError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{driverError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  {['No','Code','Name','Branch','Phone','Fleet','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driverLoading ? (
                  <SkeletonTable rows={3} cols={8} />
                ) : filteredDrivers.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No driver data found.</div>
                  </td></tr>
                ) : filteredDrivers.map((driver, i) => (
                  <tr key={driver.id} className={`border-b border-slate-100 hover:bg-teal-50 transition-colors ${!driver.isActive ? 'opacity-50 italic' : ''} ${i%2===0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{driver.code}</td>
                    <td className="px-3 py-2.5">{driver.name}</td>
                    <td className="px-3 py-2.5">{driver.branch || '-'}</td>
                    <td className="px-3 py-2.5">{driver.phone || '-'}</td>
                    <td className="px-3 py-2.5 text-center font-semibold">{driver.vehicleCount}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={driver.isActive ? 'green' : 'gray'}>{driver.isActive ? 'Active' : 'Inactive'}</Badge>
                      {!driver.isActive && driver.inactiveReason && <p className="text-[10px] text-gray-400 mt-0.5">{driver.inactiveReason}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      {canManageUsers ? (
                        <div className="flex gap-1 flex-wrap">
                          <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => openEditDriver(driver)}><Pencil size={14} /></button>
                          {driver.isActive
                            ? <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={() => deactivateDriver(driver)}><PowerOff size={14} /></button>
                            : <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={() => reactivateDriver(driver)}><CheckCircle size={14} /></button>}
                        </div>
                      ) : (
                        <span className="text-[#5B8F82] text-sm">No access</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-gray-400 mt-2 px-1">
            Showing: <strong>{filteredDrivers.length}</strong> | Active: <strong>{driversServer.filter(d => d.isActive).length}</strong> | Inactive: <strong>{driversServer.filter(d => !d.isActive).length}</strong>
          </p>
        </div>
      )}

        {tab === 'Vehicle Type' && (
        <div>
          {vehicleTypeError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{vehicleTypeError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  {['No','Code','Name','Fleet','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleTypeLoading ? (
                  <SkeletonTable rows={3} cols={6} />
                ) : filteredVehicleTypes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No vehicle type data found.</div>
                  </td></tr>
                ) : filteredVehicleTypes.map((vt, i) => (
                  <tr key={vt.id} className={`border-b border-slate-100 hover:bg-teal-50 transition-colors ${!vt.isActive ? 'opacity-50 italic' : ''} ${i%2===0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{vt.code}</td>
                    <td className="px-3 py-2.5">{vt.name}</td>
                    <td className="px-3 py-2.5 text-center font-semibold">{vt.vehicleCount}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={vt.isActive ? 'green' : 'gray'}>{vt.isActive ? 'Active' : 'Inactive'}</Badge>
                      {!vt.isActive && vt.inactiveReason && <p className="text-[10px] text-gray-400 mt-0.5">{vt.inactiveReason}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      {canManageUsers ? (
                        <div className="flex gap-1 flex-wrap">
                          <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => openEditVehicleType(vt)}><Pencil size={14} /></button>
                          {vt.isActive
                            ? <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={() => deactivateVehicleType(vt)}><PowerOff size={14} /></button>
                            : <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={() => reactivateVehicleType(vt)}><CheckCircle size={14} /></button>}
                        </div>
                      ) : (
                        <span className="text-[#5B8F82] text-sm">No access</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-gray-400 mt-2 px-1">
            Showing: <strong>{filteredVehicleTypes.length}</strong> | Active: <strong>{vehicleTypesServer.filter(v => v.isActive).length}</strong> | Inactive: <strong>{vehicleTypesServer.filter(v => !v.isActive).length}</strong>
          </p>
        </div>
      )}

      {tab === 'Customer' && (
        <div>
          {customerError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{customerError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: '#5B8F82', color: '#fff' }}>
                  {['No','Code','Name','Branch','Fleet','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerLoading ? (
                  <SkeletonTable rows={3} cols={7} />
                ) : filteredCustomers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2"><Inbox size={24} className="text-slate-300"/>No customer data found.</div>
                  </td></tr>
                ) : filteredCustomers.map((customer, i) => (
                  <tr key={customer.id} className={`border-b border-slate-100 hover:bg-teal-50 transition-colors ${!customer.isActive ? 'opacity-50 italic' : ''} ${i%2===0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{customer.code}</td>
                    <td className="px-3 py-2.5">{customer.name}</td>
                    <td className="px-3 py-2.5">{customer.branchName ? <Badge color="blue">{customer.branchName}</Badge> : <span className="text-slate-300 text-[11px]">-</span>}</td>
                    <td className="px-3 py-2.5 text-center font-semibold">{customer.vehicleCount}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={customer.isActive ? 'green' : 'gray'}>{customer.isActive ? 'Active' : 'Inactive'}</Badge>
                      {!customer.isActive && customer.inactiveReason && <p className="text-[10px] text-gray-400 mt-0.5">{customer.inactiveReason}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      {canManageUsers ? (
                        <div className="flex gap-1 flex-wrap">
                          <button className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors text-[#7A9E94] hover:text-teal-600" title="Edit" onClick={() => openEditCustomer(customer)}><Pencil size={14} /></button>
                          {customer.isActive
                            ? <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#7A9E94] hover:text-red-600" title="Deactivate" onClick={() => deactivateCustomer(customer)}><PowerOff size={14} /></button>
                            : <button className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-[#7A9E94] hover:text-green-600" title="Activate" onClick={() => reactivateCustomer(customer)}><CheckCircle size={14} /></button>}
                        </div>
                      ) : (
                        <span className="text-[#5B8F82] text-sm">No access</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-gray-400 mt-2 px-1">
            Showing: <strong>{filteredCustomers.length}</strong> | Active: <strong>{customersServer.filter(c => c.isActive).length}</strong> | Inactive: <strong>{customersServer.filter(c => !c.isActive).length}</strong>
          </p>
        </div>
      )}

      {userModalOpen && (
        <Modal title={editUserId ? 'Edit User' : 'Add User'} onClose={() => setUserModalOpen(false)} width={520}
          footer={<> 
            <Btn variant="outline" onClick={() => setUserModalOpen(false)}>Cancel</Btn>
            <Btn onClick={saveUser}>Save</Btn>
          </> }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Username *">
                <input className={inputCls} value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Name">
              <input className={inputCls} value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} />
            </FormField>
            <FormField label="Role">
              <select className={selectCls} value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="Branch">
              <select className={selectCls} value={userForm.branchCode} onChange={e => setUserForm(p => ({ ...p, branchCode: e.target.value }))}>
                <option value="">-</option>
                {activeBranchOptions.map(b => (
                  <option key={b.id} value={b.code}>{b.code} — {b.name}</option>
                ))}
              </select>
            </FormField>
            {!editUserId && (
              <FormField label="Password *">
                <input type="password" className={inputCls} value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} />
              </FormField>
            )}
          </div>
        </Modal>
      )}

      {driverModalOpen && (
        <Modal title={editDriverId ? 'Edit Driver' : 'Add Driver'} onClose={() => setDriverModalOpen(false)} width={520}
          footer={<> 
            <Btn variant="outline" onClick={() => setDriverModalOpen(false)}>Cancel</Btn>
            <Btn onClick={saveDriver}>Save</Btn>
          </> }
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Driver Code">
              <input className={inputCls} value={driverForm.code} onChange={e => updateField('code', e.target.value)} placeholder="Leave blank for auto-code" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Driver Name *">
                <input className={inputCls} value={driverForm.name} onChange={e => updateField('name', e.target.value)} />
              </FormField>
            </div>
            <FormField label="Branch">
              <select className={selectCls} value={driverForm.branchCode} onChange={e => updateField('branchCode', e.target.value)}>
                <option value="">-</option>
                {activeDriverBranchOptions.map(b => (
                  <option key={b.id} value={b.code}>{b.code} — {b.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Phone">
              <input className={inputCls} value={driverForm.phone} onChange={e => updateField('phone', e.target.value)} />
            </FormField>
            {editDriverId && (
              <div className="col-span-2">
                <FormField label="Inactive Reason">
                  <input className={inputCls} value={driverForm.inactiveReason} onChange={e => updateField('inactiveReason', e.target.value)} />
                </FormField>
              </div>
            )}
          </div>
        </Modal>
      )}


            {vehicleTypeModalOpen && (
        <Modal title={editVehicleTypeId ? 'Edit Vehicle Type' : 'Add Vehicle Type'} onClose={() => setVehicleTypeModalOpen(false)} width={520}
          footer={<> 
            <Btn variant="outline" onClick={() => setVehicleTypeModalOpen(false)}>Cancel</Btn>
            <Btn onClick={saveVehicleType}>Save</Btn>
          </> }
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vehicle Type Code">
              <input className={inputCls} value={vehicleTypeForm.code} onChange={e => setVehicleTypeForm(p => ({ ...p, code: e.target.value }))} placeholder="Leave blank for auto-code" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Vehicle Type Name *">
                <input className={inputCls} value={vehicleTypeForm.name} onChange={e => setVehicleTypeForm(p => ({ ...p, name: e.target.value }))} />
              </FormField>
            </div>
            {editVehicleTypeId && (
              <div className="col-span-2">
                <FormField label="Inactive Reason">
                  <input className={inputCls} value={vehicleTypeForm.inactiveReason} onChange={e => setVehicleTypeForm(p => ({ ...p, inactiveReason: e.target.value }))} />
                </FormField>
              </div>
            )}
          </div>
        </Modal>
      )}

      {customerModalOpen && (
        <Modal title={editCustomerId ? 'Edit Customer' : 'Add Customer'} onClose={() => setCustomerModalOpen(false)} width={520}
          footer={<> 
            <Btn variant="outline" onClick={() => setCustomerModalOpen(false)}>Cancel</Btn>
            <Btn onClick={saveCustomer}>Save</Btn>
          </> }
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Customer Code">
              <input className={inputCls} value={customerForm.code} onChange={e => setCustomerForm(p => ({ ...p, code: e.target.value }))} placeholder="Leave blank for auto-code" />
            </FormField>
            <FormField label="Branch">
              <select className={selectCls} value={customerForm.branchId} onChange={e => setCustomerForm(p => ({ ...p, branchId: e.target.value }))}>
                <option value="">- All Branches -</option>
                {activeBranchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </FormField>
            <div className="col-span-2">
              <FormField label="Customer Name *">
                <input className={inputCls} value={customerForm.name} onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))} />
              </FormField>
            </div>
            {editCustomerId && (
              <div className="col-span-2">
                <FormField label="Inactive Reason">
                  <input className={inputCls} value={customerForm.inactiveReason} onChange={e => setCustomerForm(p => ({ ...p, inactiveReason: e.target.value }))} />
                </FormField>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Branch modal */}
      {branchModalOpen && (
        <Modal title={editBranchId ? 'Edit Branch' : 'Add Branch'} onClose={() => { setBranchModalOpen(false); setEditBranchId(null) }} width={480}
          footer={<> 
            <Btn variant="outline" onClick={() => { setBranchModalOpen(false); setEditBranchId(null) }}>Cancel</Btn>
            <Btn onClick={async ()=>{
              if(!newBranchCode.trim() || !newBranchName.trim()){ alert('Code and Name are required'); return }
              if (editBranchId) {
                const res = await fetch(`/api/admin/branches/${editBranchId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newBranchCode.trim(), name: newBranchName.trim() }) })
                if(res.ok){
                  const data = await (await fetch('/api/admin/branches', { credentials: 'include' })).json()
                  const branches = data.branches ?? data
                  setBranchesServer(branches)
                  setBranches(branches)
                  setBranchModalOpen(false)
                  setEditBranchId(null)
                  setNewBranchCode('')
                  setNewBranchName('')
                } else {
                  alert('Failed to update branch')
                }
              } else {
                const res = await fetch('/api/admin/branches', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newBranchCode.trim(), name: newBranchName.trim() }) })
                if(res.ok){
                  const data = await (await fetch('/api/admin/branches', { credentials: 'include' })).json()
                  const branches = data.branches ?? data
                  setBranchesServer(branches)
                  setBranches(branches)
                  setBranchModalOpen(false)
                  setNewBranchCode('')
                  setNewBranchName('')
                } else {
                  alert('Failed to add branch')
                }
              }
            }}>Save</Btn>
          </>}
        >
          <div className="grid gap-3">
            <FormField label="Branch Code">
              <input className={inputCls} value={newBranchCode} onChange={e => setNewBranchCode(e.target.value)} />
            </FormField>
            <FormField label="Branch Name">
              <input className={inputCls} value={newBranchName} onChange={e => setNewBranchName(e.target.value)} />
            </FormField>
          </div>
        </Modal>
      )}

      <VehicleImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          loadFromServer()
          // Optionally trigger local refresh
        }}
        branches={branchesServer}
        vehicleTypes={vehicleTypesServer}
        customers={customersServer}
        drivers={driversServer}
      />

      {/* Vehicle Form Modal */}
      {formOpen && (
        <Modal title={editId ? 'Edit Vehicle' : 'Add New Vehicle'} onClose={() => setFormOpen(false)}
          width={540}
          footer={
            <>
              <Btn variant="outline" onClick={() => setFormOpen(false)}>Cancel</Btn>
              <Btn onClick={save}>Save</Btn>
            </>
          }>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="License Plate *">
                <input className={inputCls} value={form.nopol} onChange={e => f('nopol', e.target.value)} placeholder="e.g. DD 8124 SA" />
              </FormField>
            </div>
            <FormField label="Vehicle Type">
              <select className={selectCls} value={form.type} onChange={e => f('type', e.target.value)}>
                <option value="">- Select Type -</option>
                {vehicleTypesServer.filter(vt => vt.isActive || vt.name === form.type).map(vt => (
                  <option key={vt.id} value={vt.name}>{vt.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Branch">
              <select className={selectCls} value={form.branchId} onChange={e => f('branchId', e.target.value)}>
                {activeBranchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </FormField>
            <FormField label="Tonnage (ton)">
              <input type="number" className={inputCls} value={form.tonase} onChange={e => f('tonase', +e.target.value)} onFocus={e => e.target.select()} />
            </FormField>
            <FormField label="Cubic (m³)">
              <input type="number" className={inputCls} value={form.kubikasi} onChange={e => f('kubikasi', +e.target.value)} onFocus={e => e.target.select()} />
            </FormField>
            <FormField label="Chassis Number">
              <input className={inputCls} value={form.chassisNumber} onChange={e => f('chassisNumber', e.target.value)} placeholder="e.g. MHFE3C..." />
            </FormField>
            <FormField label="Revenue Target (Rp)">
              <input 
                type="text" 
                className={inputCls} 
                value={form.revenueTarget ? form.revenueTarget.toLocaleString('id-ID') : ''} 
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  f('revenueTarget', raw ? parseInt(raw, 10) : 0);
                }} 
                placeholder="0" 
              />
            </FormField>
            <FormField label="Customer">
              <select className={selectCls} value={form.customerId || ''} onChange={e => {
                const c = customersServer.find(x => x.id === e.target.value)
                setForm(p => ({ ...p, customerId: c?.id || null, customer: c?.name || '' }))
              }}>
                <option value="">- No Customer -</option>
                {customersServer.filter(c => c.isActive || c.id === form.customerId).map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Driver">
              <select className={selectCls} value={form.driverId || ''} onChange={e => {
                const d = driversServer.find(x => x.id === e.target.value)
                setForm(p => ({ ...p, driverId: d?.id || null, driver: d?.name || '' }))
              }}>
                <option value="">- No Driver -</option>
                {driversServer.filter(d => d.isActive || d.id === form.driverId).map(d => (
                  <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                ))}
              </select>
            </FormField>
            {editId && !form.isActive && (
              <div className="col-span-2">
                <FormField label="Inactive Reason">
                  <input className={inputCls} value={form.inactiveReason} onChange={e => f('inactiveReason', e.target.value)} />
                </FormField>
              </div>
            )}
          </div>
        </Modal>
      )}

      {statusAddOpen && (
        <Modal title="Add New Status" onClose={() => setStatusAddOpen(false)} width={520}
          footer={
            <>
              <Btn variant="outline" onClick={() => setStatusAddOpen(false)}>Cancel</Btn>
              <Btn onClick={createStatusConfig}>Save</Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Status Code *">
                <input className={inputCls} value={newStatusForm.code} onChange={e => setNewStatusForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. NEW" />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Description *">
                <input className={inputCls} value={newStatusForm.desc} onChange={e => setNewStatusForm(p => ({ ...p, desc: e.target.value }))} />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Group *">
                <input className={inputCls} value={newStatusForm.group} onChange={e => setNewStatusForm(p => ({ ...p, group: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Color (hex)">
              <div className="flex items-center gap-2">
                <input type="color" value={newStatusForm.color} onChange={e => setNewStatusForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-9 rounded-lg border border-slate-300 cursor-pointer" />
                <input className={inputCls} value={newStatusForm.color} onChange={e => setNewStatusForm(p => ({ ...p, color: e.target.value }))} />
              </div>
            </FormField>
            <FormField label="Forecast">
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" checked={newStatusForm.isForecast} onChange={e => setNewStatusForm(p => ({ ...p, isForecast: e.target.checked }))} className="rounded" />
                <span className="text-[12px] text-gray-600">Tampilkan di dropdown forecast</span>
              </label>
            </FormField>
            <div className="col-span-2 border-t border-slate-200 pt-3 mt-1">
              <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">KPI Flags</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newStatusForm.isPA} onChange={e => setNewStatusForm(p => ({ ...p, isPA: e.target.checked }))} className="rounded" />
                  <span className="text-[12px]"><span className="font-medium">PA</span> (Performance Achievement)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newStatusForm.isUA} onChange={e => setNewStatusForm(p => ({ ...p, isUA: e.target.checked }))} className="rounded" />
                  <span className="text-[12px]"><span className="font-medium">UA</span> (Unit Availability)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newStatusForm.isPROD} onChange={e => setNewStatusForm(p => ({ ...p, isPROD: e.target.checked }))} className="rounded" />
                  <span className="text-[12px]"><span className="font-medium">Prod</span> (Produktivitas)</span>
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <FormField label="Details / Tooltip">
                <textarea className={inputCls + ' min-h-[72px]'} value={newStatusForm.details} onChange={e => setNewStatusForm(p => ({ ...p, details: e.target.value }))} />
              </FormField>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-[#7A9E94] flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: newStatusForm.color }} />
                Preview: <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ml-1" style={{ background: newStatusForm.color, color: getTextColor(newStatusForm.color) }}>{newStatusForm.code || 'NEW'}</span>
                <span className="ml-2 text-[#5B8F82]">{newStatusForm.desc || 'Description'}</span>
              </p>
            </div>
          </div>
        </Modal>
      )}
      {statusEditOpen && editingStatus && (
        <Modal title={`Edit Status — ${editingStatus.code}`} onClose={() => setStatusEditOpen(false)} width={520}
          footer={
            <>
              <Btn variant="outline" onClick={() => setStatusEditOpen(false)}>Cancel</Btn>
              <Btn onClick={saveStatusConfig}>Save</Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Status Code (read-only)">
                <input className={inputCls} value={editingStatus.code} disabled />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Description *">
                <input className={inputCls} value={statusForm.desc} onChange={e => setStatusForm(p => ({ ...p, desc: e.target.value }))} />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Group">
                <input className={inputCls} value={statusForm.group} onChange={e => setStatusForm(p => ({ ...p, group: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Color (hex)">
              <div className="flex items-center gap-2">
                <input type="color" value={statusForm.color} onChange={e => setStatusForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-9 rounded-lg border border-slate-300 cursor-pointer" />
                <input className={inputCls} value={statusForm.color} onChange={e => setStatusForm(p => ({ ...p, color: e.target.value }))} />
              </div>
            </FormField>
            <FormField label="Forecast">
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" checked={statusForm.isForecast} onChange={e => setStatusForm(p => ({ ...p, isForecast: e.target.checked }))} className="rounded" />
                <span className="text-[12px] text-gray-600">Tampilkan di dropdown forecast</span>
              </label>
            </FormField>
            <div className="col-span-2 border-t border-slate-200 pt-3 mt-1">
              <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">KPI Flags</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={statusForm.isPA} onChange={e => setStatusForm(p => ({ ...p, isPA: e.target.checked }))} className="rounded" />
                  <span className="text-[12px]"><span className="font-medium">PA</span> (Performance Achievement)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={statusForm.isUA} onChange={e => setStatusForm(p => ({ ...p, isUA: e.target.checked }))} className="rounded" />
                  <span className="text-[12px]"><span className="font-medium">UA</span> (Unit Availability)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={statusForm.isPROD} onChange={e => setStatusForm(p => ({ ...p, isPROD: e.target.checked }))} className="rounded" />
                  <span className="text-[12px]"><span className="font-medium">Prod</span> (Produktivitas)</span>
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <FormField label="Details / Tooltip">
                <textarea className={inputCls + ' min-h-[72px]'} value={statusForm.details} onChange={e => setStatusForm(p => ({ ...p, details: e.target.value }))} />
              </FormField>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-[#7A9E94] flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: statusForm.color }} />
                Preview: <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ml-1" style={{ background: statusForm.color, color: getTextColor(statusForm.color) }}>{editingStatus.code}</span>
                <span className="ml-2 text-[#5B8F82]">{statusForm.desc}</span>
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
