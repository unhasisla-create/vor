import re

with open('src/components/modules/MasterData.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add types
types_addition = """
type Customer = {
  id: string
  code: string
  name: string
  isActive: boolean
  inactiveReason: string | null
  vehicleCount: number
}

type CustomerForm = {
  code: string
  name: string
  inactiveReason: string
}
"""
content = content.replace("export default function MasterData() {", types_addition + "\nexport default function MasterData() {")

# 2. Add states
states_addition = """
  const [customersServer, setCustomersServer] = useState<Customer[]>([])
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null)
  const [customerForm, setCustomerForm] = useState<CustomerForm>({ code: '', name: '', inactiveReason: '' })
  const [showInactiveCustomers, setShowInactiveCustomers] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerError, setCustomerError] = useState('')
"""
content = content.replace("const [driverError, setDriverError] = useState('')", "const [driverError, setDriverError] = useState('')\n" + states_addition)

# 3. Add loadCustomers function
load_customers = """
  const loadCustomers = async () => {
    setCustomerLoading(true)
    setCustomerError('')
    try {
      const res = await fetch('/api/admin/customers', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setCustomerError(data?.error || 'Gagal memuat customer.')
        return
      }
      const data = await res.json()
      setCustomersServer(data.customers ?? data)
    } catch (e) {
      console.error(e)
      setCustomerError('Gagal terhubung ke server.')
    } finally {
      setCustomerLoading(false)
    }
  }
"""
content = content.replace("  useEffect(() => {\n    fetchBranches()\n  }, [fetchBranches])", load_customers + "\n  useEffect(() => {\n    fetchBranches()\n  }, [fetchBranches])")

# 4. Modify useEffect for tabs
new_use_effect = """
  useEffect(() => {
    if (tab === 'Pengguna') {
      loadUsers()
    }
    if (tab === 'Driver' || tab === 'Armada Kendaraan' || tab === 'Customer') {
      loadDrivers()
      loadCustomers()
    }
  }, [tab])
"""
content = re.sub(r"  useEffect\(\(\) => \{\n    if \(tab === 'Pengguna'\) \{\n      loadUsers\(\)\n    \}\n    if \(tab === 'Driver' \|\| tab === 'Armada Kendaraan'\) \{\n      loadDrivers\(\)\n    \}\n  \}, \[tab\]\)", new_use_effect.strip('\n'), content)

# 5. Add filteredCustomers
filtered_customers = """
  const filteredCustomers = useMemo(
    () => customersServer.filter(c =>
      (showInactiveCustomers ? true : c.isActive) &&
      (c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [customersServer, showInactiveCustomers, search]
  )
"""
content = content.replace("  const branchOptions = useMemo(() => branchesServer, [branchesServer])", filtered_customers + "\n  const branchOptions = useMemo(() => branchesServer, [branchesServer])")

# 6. Add customer handler functions
handlers = """
  const openNewCustomer = () => {
    setEditCustomerId(null)
    setCustomerForm({ code: '', name: '', inactiveReason: '' })
    setCustomerModalOpen(true)
  }

  const openEditCustomer = (customer: Customer) => {
    setEditCustomerId(customer.id)
    setCustomerForm({
      code: customer.code,
      name: customer.name,
      inactiveReason: customer.inactiveReason ?? '',
    })
    setCustomerModalOpen(true)
  }

  const saveCustomer = async () => {
    if (!customerForm.name.trim()) { showToast('Nama customer wajib diisi!', 'error'); return }
    const payload: any = { name: customerForm.name.trim() }
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
        showToast(data?.error || 'Gagal menyimpan customer.', 'error')
        return
      }
      await loadCustomers()
      await loadFromServer()
      setCustomerModalOpen(false)
      showToast(editCustomerId ? 'Customer berhasil diperbarui.' : 'Customer baru berhasil ditambahkan.')
    } catch (e) {
      console.error(e)
      showToast('Gagal menyimpan customer.', 'error')
    }
  }

  const deactivateCustomer = async (customer: Customer) => {
    const reason = prompt(`Alasan menonaktifkan ${customer.code}:`)
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
        showToast(data?.error || 'Gagal menonaktifkan customer.', 'error')
        return
      }
      await loadCustomers()
      await loadFromServer()
      showToast(`${customer.code} dinonaktifkan.`)
    } catch (e) {
      console.error(e)
      showToast('Gagal menonaktifkan customer.', 'error')
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
        showToast(data?.error || 'Gagal mengaktifkan customer.', 'error')
        return
      }
      await loadCustomers()
      await loadFromServer()
      showToast(`${customer.code} diaktifkan.`)
    } catch (e) {
      console.error(e)
      showToast('Gagal mengaktifkan customer.', 'error')
    }
  }
"""
content = content.replace("  const updateField = (k: keyof DriverForm, val: string) => setDriverForm(p => ({ ...p, [k]: val }))", "  const updateField = (k: keyof DriverForm, val: string) => setDriverForm(p => ({ ...p, [k]: val }))\n" + handlers)

# 7. Add header action
header_action = """
            {tab === 'Customer' && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode / nama..."
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-44 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveCustomers} onChange={e => setShowInactiveCustomers(e.target.checked)} className="rounded" />
                  Tampilkan nonaktif
                </label>
                {canManageUsers && <Btn onClick={openNewCustomer}>+ Tambah Customer</Btn>}
              </>
            )}
"""
content = content.replace("          </div>\n        }\n      />", header_action + "          </div>\n        }\n      />")

# 8. Update Tabs
content = content.replace("<Tabs tabs={['Armada Kendaraan','Konfigurasi Status','Cabang','Pengguna','Driver']} active={tab} onChange={setTab} />", "<Tabs tabs={['Armada Kendaraan','Konfigurasi Status','Cabang','Pengguna','Driver','Customer']} active={tab} onChange={setTab} />")

# 9. Add Customer table tab UI
customer_tab_ui = """
      {tab === 'Customer' && (
        <div>
          {customerError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{customerError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
                  {['No','Kode','Nama','Armada','Status','Aksi'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">Memuat customer...</td></tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">Tidak ada data customer ditemukan.</td></tr>
                ) : filteredCustomers.map((customer, i) => (
                  <tr key={customer.id} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${!customer.isActive ? 'opacity-50 italic' : ''} ${i%2===0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i+1}</td>
                    <td className="px-3 py-2.5 font-mono-jb font-semibold text-[11px]">{customer.code}</td>
                    <td className="px-3 py-2.5">{customer.name}</td>
                    <td className="px-3 py-2.5 text-center font-semibold">{customer.vehicleCount}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={customer.isActive ? 'green' : 'gray'}>{customer.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                      {!customer.isActive && customer.inactiveReason && <p className="text-[10px] text-gray-400 mt-0.5">{customer.inactiveReason}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      {canManageUsers ? (
                        <div className="flex gap-1.5 flex-wrap">
                          <Btn size="sm" variant="outline" onClick={() => openEditCustomer(customer)}>Edit</Btn>
                          {customer.isActive
                            ? <Btn size="sm" variant="ghost-red" onClick={() => deactivateCustomer(customer)}>Nonaktifkan</Btn>
                            : <Btn size="sm" variant="ghost-green" onClick={() => reactivateCustomer(customer)}>Aktifkan</Btn>}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Tidak bisa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-gray-400 mt-2 px-1">
            Tampil: <strong>{filteredCustomers.length}</strong> | Aktif: <strong>{customersServer.filter(c => c.isActive).length}</strong> | Nonaktif: <strong>{customersServer.filter(c => !c.isActive).length}</strong>
          </p>
        </div>
      )}
"""
content = content.replace("      {userModalOpen && (", customer_tab_ui + "\n      {userModalOpen && (")

# 10. Add Customer Modal
customer_modal = """
      {customerModalOpen && (
        <Modal title={editCustomerId ? 'Edit Customer' : 'Tambah Customer'} onClose={() => setCustomerModalOpen(false)} width={520}
          footer={<> 
            <Btn variant="outline" onClick={() => setCustomerModalOpen(false)}>Batal</Btn>
            <Btn onClick={saveCustomer}>Simpan</Btn>
          </> }
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kode Customer">
              <input className={inputCls} value={customerForm.code} onChange={e => setCustomerForm(p => ({ ...p, code: e.target.value }))} placeholder="Biarkan kosong otomatis" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Nama Customer *">
                <input className={inputCls} value={customerForm.name} onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))} />
              </FormField>
            </div>
            {editCustomerId && (
              <div className="col-span-2">
                <FormField label="Alasan Nonaktif">
                  <input className={inputCls} value={customerForm.inactiveReason} onChange={e => setCustomerForm(p => ({ ...p, inactiveReason: e.target.value }))} />
                </FormField>
              </div>
            )}
          </div>
        </Modal>
      )}
"""
content = content.replace("      {/* Branch modal */}", customer_modal + "\n      {/* Branch modal */}")

# 11. Update Vehicle Form Customer Dropdown
vehicle_customer_select = """
            <FormField label="Customer">
              <select className={selectCls} value={form.customerId || ''} onChange={e => {
                const c = customersServer.find(x => x.id === e.target.value)
                setForm(p => ({ ...p, customerId: c?.id || null, customer: c?.name || '' }))
              }}>
                <option value="">- Tanpa Customer -</option>
                {customersServer.filter(c => c.isActive || c.id === form.customerId).map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </FormField>
"""
# Replace old select
old_customer_select = """            <FormField label="Customer">
              <select className={selectCls} value={form.customer} onChange={e => f('customer', e.target.value)}>
                {CUSTOMERS.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>"""
content = content.replace(old_customer_select, vehicle_customer_select.strip('\n'))

with open('src/components/modules/MasterData.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
