import re
import sys

def patch_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add VehicleType types and states
    content = content.replace("type Customer =", """type VehicleTypeData = {
  id: string
  code: string
  name: string
  isActive: boolean
  inactiveReason: string | null
  vehicleCount: number
}

type Customer =""")
    
    content = content.replace("const [customerError, setCustomerError] = useState('')", """const [customerError, setCustomerError] = useState('')

  const [vehicleTypesServer, setVehicleTypesServer] = useState<VehicleTypeData[]>([])
  const [vehicleTypeModalOpen, setVehicleTypeModalOpen] = useState(false)
  const [editVehicleTypeId, setEditVehicleTypeId] = useState<string | null>(null)
  const [vehicleTypeForm, setVehicleTypeForm] = useState({ code: '', name: '', inactiveReason: '' })
  const [showInactiveVehicleTypes, setShowInactiveVehicleTypes] = useState(false)
  const [vehicleTypeLoading, setVehicleTypeLoading] = useState(false)
  const [vehicleTypeError, setVehicleTypeError] = useState('')
""")

    # 2. Add loadVehicleTypes
    load_vt_code = """  const loadVehicleTypes = async () => {
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

  const loadCustomers = async () => {"""
    content = content.replace("  const loadCustomers = async () => {", load_vt_code)

    # 3. Update useEffect
    content = content.replace("if (tab === 'Driver' || tab === 'Vehicle Fleet' || tab === 'Customer') {", 
                              "if (tab === 'Driver' || tab === 'Vehicle Fleet' || tab === 'Customer' || tab === 'Vehicle Type') {")
    content = content.replace("loadCustomers()\n    }", "loadCustomers()\n      loadVehicleTypes()\n    }")

    # 4. Filtered Vehicle Types
    filtered_vt_code = """  const filteredCustomers = useMemo("""
    new_filtered = """  const filteredVehicleTypes = useMemo(
    () => vehicleTypesServer.filter(v =>
      (showInactiveVehicleTypes ? true : v.isActive) &&
      (v.code.toLowerCase().includes(search.toLowerCase()) || v.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [vehicleTypesServer, showInactiveVehicleTypes, search]
  )

  const filteredCustomers = useMemo("""
    content = content.replace(filtered_vt_code, new_filtered)

    # 5. Handlers for VehicleType
    handlers_vt = """  const openNewVehicleType = () => {
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

  const openNewCustomer = () => {"""
    content = content.replace("  const openNewCustomer = () => {", handlers_vt)

    # 6. Top action bar
    top_action_vt = """            {tab === 'Vehicle Type' && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code / name..."
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-[12px] w-44 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showInactiveVehicleTypes} onChange={e => setShowInactiveVehicleTypes(e.target.checked)} className="rounded" />
                  Show inactive
                </label>
                {canManageUsers && <Btn onClick={openNewVehicleType}>+ Add Vehicle Type</Btn>}
              </>
            )}
            {tab === 'Customer' && ("""
    content = content.replace("{tab === 'Customer' && (", top_action_vt)

    # 7. Tabs
    content = content.replace("['Vehicle Fleet', 'Status Configuration', 'Branch', 'Driver', 'Customer', 'User']", 
                              "['Vehicle Fleet', 'Status Configuration', 'Branch', 'Driver', 'Vehicle Type', 'Customer', 'User']")

    # 8. Table UI
    table_vt = """      {tab === 'Vehicle Type' && (
        <div>
          {vehicleTypeError && (
            <p className="text-[12px] text-red-600 mb-3 px-1">{vehicleTypeError}</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
                  {['No','Code','Name','Fleet','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-medium whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleTypeLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">Loading vehicle types...</td></tr>
                ) : filteredVehicleTypes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gray-400">No vehicle type data found.</td></tr>
                ) : filteredVehicleTypes.map((vt, i) => (
                  <tr key={vt.id} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${!vt.isActive ? 'opacity-50 italic' : ''} ${i%2===0 ? 'bg-white' : 'bg-slate-50/50'}`}>
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
                        <div className="flex gap-1.5 flex-wrap">
                          <Btn size="sm" variant="outline" onClick={() => openEditVehicleType(vt)}>Edit</Btn>
                          {vt.isActive
                            ? <Btn size="sm" variant="ghost-red" onClick={() => deactivateVehicleType(vt)}>Deactivate</Btn>
                            : <Btn size="sm" variant="ghost-green" onClick={() => reactivateVehicleType(vt)}>Activate</Btn>}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">No access</span>
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

      {tab === 'Customer' && ("""
    content = content.replace("{tab === 'Customer' && (", table_vt)

    # 9. Modal UI
    modal_vt = """      {vehicleTypeModalOpen && (
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

      {customerModalOpen && ("""
    content = content.replace("{customerModalOpen && (", modal_vt)

    # 10. Dropdown update for Vehicle Fleet form
    dropdown_old = """              <select className={selectCls} value={form.type} onChange={e => f('type', e.target.value)}>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>"""
    dropdown_new = """              <select className={selectCls} value={form.type} onChange={e => f('type', e.target.value)}>
                {vehicleTypesServer.filter(vt => vt.isActive || vt.name === form.type).map(vt => (
                  <option key={vt.id} value={vt.name}>{vt.name}</option>
                ))}
                {/* Fallback for hardcoded types not in DB yet */
                 VEHICLE_TYPES.filter(vt => !vehicleTypesServer.some(v => v.name === vt)).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>"""
    content = content.replace(dropdown_old, dropdown_new)

    # TRANSLATIONS
    translations = [
        ("Gagal memuat data cabang dari database.", "Failed to load branch data."),
        ("Gagal terhubung ke server.", "Failed to connect to server."),
        ("Gagal memuat driver.", "Failed to load drivers."),
        ("Gagal memuat customer.", "Failed to load customers."),
        ("Nama driver wajib diisi!", "Driver name is required!"),
        ("Gagal menyimpan driver.", "Failed to save driver."),
        ("Driver berhasil diperbarui.", "Driver updated successfully."),
        ("Driver baru berhasil ditambahkan.", "New driver added successfully."),
        ("Alasan menonaktifkan", "Reason for deactivating"),
        ("Gagal menonaktifkan driver.", "Failed to deactivate driver."),
        ("dinonaktifkan.", "deactivated."),
        ("Gagal mengaktifkan driver.", "Failed to activate driver."),
        ("diaktifkan.", "activated."),
        ("Nama customer wajib diisi!", "Customer name is required!"),
        ("Gagal menyimpan customer.", "Failed to save customer."),
        ("Customer berhasil diperbarui.", "Customer updated successfully."),
        ("Customer baru berhasil ditambahkan.", "New customer added successfully."),
        ("Gagal menonaktifkan customer.", "Failed to deactivate customer."),
        ("Gagal mengaktifkan customer.", "Failed to activate customer."),
        ("Nomor polisi wajib diisi!", "License plate is required!"),
        ("Kendaraan berhasil diperbarui.", "Vehicle updated successfully."),
        ("Kendaraan baru ditambahkan.", "New vehicle added."),
        ("Username wajib diisi!", "Username is required!"),
        ("Role wajib dipilih!", "Role is required!"),
        ("Password wajib diisi untuk pengguna baru!", "Password is required for new users!"),
        ("Gagal menyimpan pengguna.", "Failed to save user."),
        ("Pengguna berhasil diperbarui.", "User updated successfully."),
        ("Pengguna baru berhasil ditambahkan.", "New user added successfully."),
        ('placeholder="Cari nopol / driver..."', 'placeholder="Search plate / driver..."'),
        ("Tampilkan nonaktif", "Show inactive"),
        ("+ Tambah Kendaraan", "+ Add Vehicle"),
        ("Tampilkan cabang nonaktif", "Show inactive branches"),
        ("+ Tambah Cabang", "+ Add Branch"),
        ("Tampilkan pengguna nonaktif", "Show inactive users"),
        ("+ Tambah Pengguna", "+ Add User"),
        ("+ Tambah Driver", "+ Add Driver"),
        ('placeholder="Cari kode / nama..."', 'placeholder="Search code / name..."'),
        ("+ Tambah Customer", "+ Add Customer"),
        ("'No','Nopol','Tipe','Ton','Kubik','Customer','Driver','Cabang','Status','Aksi'", "'No','Plate No','Type','Ton','Cubic','Customer','Driver','Branch','Status','Action'"),
        ("'Aktif' : 'Nonaktif'", "'Active' : 'Inactive'"),
        ("Nonaktifkan</Btn>", "Deactivate</Btn>"),
        ("Aktifkan</Btn>", "Activate</Btn>"),
        ("Tidak ada data kendaraan ditemukan.", "No vehicle data found."),
        ("Tampil:", "Showing:"),
        ("Aktif:", "Active:"),
        ("Nonaktif:", "Inactive:"),
        ("'Kode','Status','Group Status','Description','Warna','PA','UA','Prod'", "'Code','Status','Group Status','Description','Color','PA','UA','Prod'"),
        ("'No','Kode','Nama Cabang','Armada Aktif','Status','Aksi'", "'No','Code','Branch Name','Active Fleet','Status','Action'"),
        ("Memuat data cabang dari database...", "Loading branch data..."),
        ("Tidak ada data cabang ditemukan.", "No branch data found."),
        (" unit</td>", " units</td>"),
        ("Nonaktifkan cabang ini?", "Deactivate this branch?"),
        ("Gagal menonaktifkan", "Failed to deactivate"),
        ("Aktifkan kembali cabang ini?", "Reactivate this branch?"),
        ("Gagal mengaktifkan cabang", "Failed to activate branch"),
        ("'No','Username','Nama','Role','Cabang','Status','Aksi'", "'No','Username','Name','Role','Branch','Status','Action'"),
        ("Memuat pengguna...", "Loading users..."),
        ("Tidak ada pengguna ditemukan.", "No users found."),
        ("Akun Anda", "Your Account"),
        ("Nonaktifkan pengguna", "Deactivate user"),
        ("Aktifkan kembali pengguna", "Reactivate user"),
        ("'No','Kode','Nama','Cabang','Telepon','Armada','Status','Aksi'", "'No','Code','Name','Branch','Phone','Fleet','Status','Action'"),
        ("Memuat driver...", "Loading drivers..."),
        ("Tidak ada data driver ditemukan.", "No driver data found."),
        ("Tidak bisa", "No access"),
        ("'No','Kode','Nama','Armada','Status','Aksi'", "'No','Code','Name','Fleet','Status','Action'"),
        ("Memuat customer...", "Loading customers..."),
        ("Tidak ada data customer ditemukan.", "No customer data found."),
        ("'Edit Pengguna' : 'Tambah Pengguna'", "'Edit User' : 'Add User'"),
        ("Batal</Btn>", "Cancel</Btn>"),
        ("Simpan</Btn>", "Save</Btn>"),
        ('label="Nama"', 'label="Name"'),
        ('label="Cabang"', 'label="Branch"'),
        ("'Edit Driver' : 'Tambah Driver'", "'Edit Driver' : 'Add Driver'"),
        ('label="Kode Driver"', 'label="Driver Code"'),
        ('placeholder="Biarkan kosong untuk kode otomatis"', 'placeholder="Leave blank for auto-code"'),
        ('label="Nama Driver *"', 'label="Driver Name *"'),
        ('label="Telepon"', 'label="Phone"'),
        ('label="Alasan Nonaktif"', 'label="Inactive Reason"'),
        ("'Edit Customer' : 'Tambah Customer'", "'Edit Customer' : 'Add Customer'"),
        ('label="Kode Customer"', 'label="Customer Code"'),
        ('placeholder="Biarkan kosong otomatis"', 'placeholder="Leave blank for auto-code"'),
        ('label="Nama Customer *"', 'label="Customer Name *"'),
        ("'Edit Cabang' : 'Tambah Cabang'", "'Edit Branch' : 'Add Branch'"),
        ("'Kode dan Nama wajib'", "'Code and Name are required'"),
        ("Gagal memperbarui cabang", "Failed to update branch"),
        ("Gagal menambah cabang", "Failed to add branch"),
        ('label="Kode cabang"', 'label="Branch Code"'),
        ('label="Nama cabang"', 'label="Branch Name"'),
        ("'Edit Kendaraan' : 'Tambah Kendaraan Baru'", "'Edit Vehicle' : 'Add New Vehicle'"),
        ('label="Nomor Polisi *"', 'label="License Plate *"'),
        ('placeholder="cth: DD 8124 SA"', 'placeholder="e.g. DD 8124 SA"'),
        ('label="Tipe Kendaraan"', 'label="Vehicle Type"'),
        ('label="Tonase (ton)"', 'label="Tonnage (ton)"'),
        ('label="Kubikasi (m³)"', 'label="Cubic (m³)"'),
        ('- Tanpa Customer -', '- No Customer -'),
        ('- Tanpa Driver -', '- No Driver -'),
    ]

    for old, new in translations:
        content = content.replace(old, new)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    patch_file(sys.argv[1])
