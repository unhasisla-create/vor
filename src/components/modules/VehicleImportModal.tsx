'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Modal, Btn, showToast } from '@/components/ui'
import { Download, UploadCloud, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  branches: { id: string; code: string; name: string }[]
  vehicleTypes: { name: string; isActive: boolean }[]
  customers: { id: string; code: string; name: string; isActive: boolean }[]
  drivers: { id: string; code: string; name: string; isActive: boolean }[]
}

type PreviewRow = {
  index: number
  nopol: string
  type: string
  branchCode: string
  tonase: number
  kubikasi: number
  chassisNumber: string
  revenueTarget: number
  customerInput: string
  driverInput: string
  isValid: boolean
  errors: string[]
  // Mapped DB ids
  branchId?: string
  customerId?: string | null
  driverId?: string | null
  customerStr: string
  driverStr: string
}

export default function VehicleImportModal({ isOpen, onClose, onSuccess, branches, vehicleTypes, customers, drivers }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showConfirmPartial, setShowConfirmPartial] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const downloadTemplate = () => {
    const instructions = [
      ['INSTRUCTIONS (PLEASE READ)'],
      ['1. Fill the "Data" sheet.'],
      ['2. Do not change the column headers.'],
      ['3. Required fields: License Plate, Type, Branch Code.'],
      [''],
      ['--- FIELD GUIDE ---'],
      ['License Plate: Nomor polisi (WAJIB)'],
      ['Type: Tipe kendaraan (WAJIB) - lihat daftar tipe valid di bawah'],
      ['Branch Code: Kode cabang (WAJIB) - lihat daftar kode cabang di bawah'],
      ['Chassis Number: Nomor rangka kendaraan (opsional)'],
      ['Revenue Target: Target revenue unit ini dalam Rp (opsional)'],
      [''],
      ['--- VALID VALUES REFERENCE ---'],
      ['Valid Branch Codes:', branches.map(b => b.code).join(', ')],
      ['Valid Vehicle Types:', vehicleTypes.filter(v => v.isActive).map(v => v.name).join(', ')],
      ['Valid Customer Codes:', customers.filter(c => c.isActive).map(c => c.code).join(', ')],
      ['Valid Driver Codes:', drivers.filter(d => d.isActive).map(d => d.code).join(', ')],
    ]

    const dataHeaders = [
      ['License Plate', 'Type', 'Branch Code', 'Tonnage', 'Cubic', 'Chassis Number', 'Revenue Target', 'Customer (Name or Code)', 'Driver (Name or Code)'],
      ['DD 1234 XY', vehicleTypes.find(v => v.isActive)?.name || 'BOX VAN', branches[0]?.code || 'LMKS', 1, 7, '', 50000000, '', '']
    ]

    const wb = XLSX.utils.book_new()
    
    const wsData = XLSX.utils.aoa_to_sheet(dataHeaders)
    wsData['!cols'] = [{wch: 15}, {wch: 20}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}]
    
    const wsRef = XLSX.utils.aoa_to_sheet(instructions)
    wsRef['!cols'] = [{wch: 30}, {wch: 60}]

    XLSX.utils.book_append_sheet(wb, wsData, 'Data')
    XLSX.utils.book_append_sheet(wb, wsRef, 'Instructions')

    XLSX.writeFile(wb, 'Vehicle_Import_Template.xlsx')
  }

  const validateRow = (row: any): PreviewRow => {
    const nopol = String(row.nopol || '').trim()
    const type = String(row.type || '').trim()
    const branchCode = String(row.branchCode || '').trim()
    const tonase = Number(row.tonase) || 1
    const kubikasi = Number(row.kubikasi) || 7
    const chassisNumber = String(row.chassisNumber || '').trim()
    const revenueTarget = Number(row.revenueTarget) || 0
    const customerInput = String(row.customerInput || '').trim()
    const driverInput = String(row.driverInput || '').trim()

    const errors: string[] = []
    let branchId = ''
    let customerId = null
    let driverId = null
    let customerStr = ''
    let driverStr = ''

    if (!nopol) errors.push('License Plate missing')
    
    if (!type) errors.push('Type missing')
    else if (!vehicleTypes.some(v => v.name === type && v.isActive)) errors.push(`Invalid/Inactive Type: ${type}`)
    
    if (!branchCode) errors.push('Branch Code missing')
    else {
      const b = branches.find(b => b.code === branchCode)
      if (!b) errors.push(`Invalid Branch Code: ${branchCode}`)
      else branchId = b.id
    }

    if (customerInput) {
      const matches = customers.filter(x => x.isActive && (x.code.toLowerCase() === customerInput.toLowerCase() || x.name.toLowerCase() === customerInput.toLowerCase()))
      if (matches.length === 0) errors.push(`Customer not found: ${customerInput}`)
      else if (matches.length > 1) errors.push(`Multiple customers found for "${customerInput}". Please use Code.`)
      else { customerId = matches[0].id; customerStr = matches[0].name }
    }

    if (driverInput) {
      const matches = drivers.filter(x => x.isActive && (x.code.toLowerCase() === driverInput.toLowerCase() || x.name.toLowerCase() === driverInput.toLowerCase()))
      if (matches.length === 0) errors.push(`Driver not found: ${driverInput}`)
      else if (matches.length > 1) errors.push(`Multiple drivers found for "${driverInput}". Please use Code.`)
      else { driverId = matches[0].id; driverStr = matches[0].name }
    }

    return {
      index: row.index,
      nopol, type, branchCode, tonase, kubikasi, chassisNumber, revenueTarget, customerInput, driverInput,
      isValid: errors.length === 0,
      errors,
      branchId, customerId, driverId, customerStr, driverStr
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setIsProcessing(true)
    setPreview([])
    setShowConfirmPartial(false)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
        
        const parsedRows: PreviewRow[] = rows.map((row, idx) => {
          return validateRow({
            index: idx + 2,
            nopol: row['License Plate'] || row['nopol'],
            type: row['Type'] || row['type'],
            branchCode: row['Branch Code'] || row['branchId'],
            tonase: row['Tonnage'] || row['tonase'],
            kubikasi: row['Cubic'] || row['kubikasi'],
            chassisNumber: row['Chassis Number'] || row['chassisNumber'],
            revenueTarget: row['Revenue Target'] || row['revenueTarget'],
            customerInput: row['Customer (Name or Code)'] || row['Customer Code'] || row['customerId'],
            driverInput: row['Driver (Name or Code)'] || row['Driver Code'] || row['driverId'],
          })
        })

        const cleanedRows = parsedRows.filter(r => r.nopol || r.type || r.branchCode)
        setPreview(cleanedRows)
      } catch (err) {
        console.error(err)
        showToast('Failed to parse Excel file. Make sure it matches the template.', 'error')
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      showToast('Error reading file.', 'error')
      setIsProcessing(false)
    }
    reader.readAsBinaryString(uploadedFile)
  }

  const updateRow = (index: number, field: keyof PreviewRow, value: string) => {
    setPreview(prev => prev.map(r => {
      if (r.index === index) {
        const updated = { ...r, [field]: value }
        return validateRow(updated)
      }
      return r
    }))
    // Reset partial confirm state if they edit
    setShowConfirmPartial(false)
  }

  const confirmImport = () => {
    const validCount = preview.filter(r => r.isValid).length
    const invalidCount = preview.length - validCount

    if (invalidCount > 0 && !showConfirmPartial) {
      setShowConfirmPartial(true)
      return
    }

    handleImport()
  }

  const handleImport = async () => {
    const validRows = preview.filter(r => r.isValid)
    if (validRows.length === 0) {
      showToast('No valid rows to import!', 'error')
      return
    }

    setIsUploading(true)
    try {
      const payload = validRows.map(r => ({
        nopol: r.nopol,
        type: r.type,
        tonase: r.tonase,
        kubikasi: r.kubikasi,
        chassisNumber: r.chassisNumber,
        revenueTarget: r.revenueTarget,
        branchId: r.branchId,
        customerId: r.customerId,
        driverId: r.driverId
      }))

      const res = await fetch('/api/admin/vehicles/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles: payload })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      showToast(`Successfully imported ${data.imported} vehicles!`)
      onSuccess()
      onClose()
    } catch (e: any) {
      console.error(e)
      showToast(e.message || 'Failed to import vehicles', 'error')
    } finally {
      setIsUploading(false)
      setShowConfirmPartial(false)
    }
  }

  const validCount = preview.filter(r => r.isValid).length
  const invalidCount = preview.length - validCount

  const renderTypeCell = (row: PreviewRow) => {
    const isError = !row.type || !vehicleTypes.some(v => v.name === row.type && v.isActive)
    if (isError) {
      return (
        <select 
          className="text-[11px] p-1 border border-red-400 rounded bg-red-50 text-red-900 outline-none w-full min-w-[100px] cursor-pointer"
          value={row.type}
          onChange={(e) => updateRow(row.index, 'type', e.target.value)}
        >
          <option value="">-- Fix Type --</option>
          {vehicleTypes.filter(v => v.isActive).map(v => (
            <option key={v.name} value={v.name}>{v.name}</option>
          ))}
        </select>
      )
    }
    return row.type
  }

  const renderBranchCell = (row: PreviewRow) => {
    const isError = !row.branchCode || !branches.some(b => b.code === row.branchCode)
    if (isError) {
      return (
        <select 
          className="text-[11px] p-1 border border-red-400 rounded bg-red-50 text-red-900 outline-none w-full min-w-[100px] cursor-pointer"
          value={row.branchCode}
          onChange={(e) => updateRow(row.index, 'branchCode', e.target.value)}
        >
          <option value="">-- Fix Branch --</option>
          {branches.map(b => (
            <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
          ))}
        </select>
      )
    }
    return row.branchCode
  }

  const renderCustomerCell = (row: PreviewRow) => {
    const hasError = row.errors.some(e => e.includes('Customer'))
    if (hasError) {
      return (
        <select 
          className="text-[11px] p-1 border border-red-400 rounded bg-red-50 text-red-900 outline-none w-full min-w-[120px] cursor-pointer"
          value=""
          onChange={(e) => updateRow(row.index, 'customerInput', e.target.value)}
        >
          <option value="">-- Fix Customer --</option>
          {customers.filter(c => c.isActive).map(c => (
            <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
          ))}
        </select>
      )
    }
    return row.customerInput || <span className="text-slate-300">-</span>
  }

  const renderDriverCell = (row: PreviewRow) => {
    const hasError = row.errors.some(e => e.includes('Driver'))
    if (hasError) {
      return (
        <select 
          className="text-[11px] p-1 border border-red-400 rounded bg-red-50 text-red-900 outline-none w-full min-w-[120px] cursor-pointer"
          value=""
          onChange={(e) => updateRow(row.index, 'driverInput', e.target.value)}
        >
          <option value="">-- Fix Driver --</option>
          {drivers.filter(d => d.isActive).map(d => (
            <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
          ))}
        </select>
      )
    }
    return row.driverInput || <span className="text-slate-300">-</span>
  }

  return (
    <Modal title="Import Vehicles from Excel" onClose={onClose} width={800}
      footer={
        <div className="flex w-full justify-between items-center relative">
          <div className="flex flex-col">
            <p className="text-[12px] text-gray-500">
              {preview.length > 0 ? (
                <>Valid: <strong className="text-green-600">{validCount}</strong> | Invalid: <strong className="text-red-500">{invalidCount}</strong></>
              ) : 'Upload an Excel file to see preview'}
            </p>
            {showConfirmPartial && invalidCount > 0 && (
              <p className="text-[11px] text-amber-600 flex items-center mt-1 font-medium animate-pulse">
                <AlertTriangle size={12} className="mr-1" />
                {invalidCount} invalid rows will be skipped.
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Btn variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Btn>
            <Btn 
              onClick={confirmImport} 
              disabled={validCount === 0 || isUploading}
              className={showConfirmPartial ? "bg-amber-500 hover:bg-amber-600 text-white border-none" : ""}
            >
              {isUploading ? 'Importing...' : showConfirmPartial ? 'Proceed Anyways' : 'Confirm Import'}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Actions Bar */}
        <div className="flex items-center gap-3 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-teal-900 mb-1">Step 1: Download Template</h3>
            <p className="text-[11px] text-teal-700/80">Get the structured Excel template with all valid codes.</p>
          </div>
          <Btn onClick={downloadTemplate} variant="outline" className="bg-white border-teal-200 text-teal-700 hover:bg-teal-50">
            <Download size={14} className="mr-1.5" /> Download Template
          </Btn>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-[#2C4A42] mb-1">Step 2: Upload Data</h3>
            <p className="text-[11px] text-[#5B8F82]">Upload your filled template for validation.</p>
          </div>
          <div>
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Btn onClick={() => fileInputRef.current?.click()} className="bg-[#2C4A42] hover:bg-slate-700">
              <UploadCloud size={14} className="mr-1.5" /> Select Excel File
            </Btn>
          </div>
        </div>

        {/* Preview Table */}
        {isProcessing && <div className="py-8 text-center text-sm text-gray-500">Processing file...</div>}
        
        {!isProcessing && preview.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-2 flex flex-col">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-[12px] font-semibold text-[#3D6B60]">Data Preview</h4>
              <span className="text-[11px] text-[#5B8F82]">{preview.length} rows detected</span>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-[#5B8F82]">
                    <th className="px-3 py-2 font-medium border-b w-10">Row</th>
                    <th className="px-3 py-2 font-medium border-b w-12">Status</th>
                    <th className="px-3 py-2 font-medium border-b">Plate No</th>
                    <th className="px-3 py-2 font-medium border-b">Type</th>
                    <th className="px-3 py-2 font-medium border-b">Branch</th>
                    <th className="px-3 py-2 font-medium border-b">Chassis No</th>
                    <th className="px-3 py-2 font-medium border-b text-right">Revenue Tgt</th>
                    <th className="px-3 py-2 font-medium border-b">Customer Input</th>
                    <th className="px-3 py-2 font-medium border-b">Driver Input</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i} className={`hover:bg-slate-50 ${!row.isValid ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 text-[#7A9E94]">{row.index}</td>
                      <td className="px-3 py-2">
                        {row.isValid ? (
                          <div className="flex items-center text-green-600"><CheckCircle2 size={14} /></div>
                        ) : (
                          <div className="group relative flex items-center text-red-500 cursor-help">
                            <XCircle size={14} />
                            <div className="absolute left-6 top-0 hidden group-hover:block bg-red-900 text-white p-2 rounded text-[10px] whitespace-nowrap z-20 shadow-xl">
                              {row.errors.map((e, ei) => <div key={ei}>• {e}</div>)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono-jb font-medium">
                        {!row.nopol ? <span className="text-red-500 italic">Missing</span> : row.nopol}
                      </td>
                      <td className="px-3 py-2">{renderTypeCell(row)}</td>
                      <td className="px-3 py-2">{renderBranchCell(row)}</td>
                      <td className="px-3 py-2 text-[11px] text-[#5B8F82]">{row.chassisNumber || '-'}</td>
                      <td className="px-3 py-2 text-right">{row.revenueTarget ? row.revenueTarget.toLocaleString('id-ID') : '-'}</td>
                      <td className="px-3 py-2">{renderCustomerCell(row)}</td>
                      <td className="px-3 py-2">{renderDriverCell(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
