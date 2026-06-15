'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Modal, Btn, showToast } from '@/components/ui'
import { Download, UploadCloud, CheckCircle2, XCircle } from 'lucide-react'
import type { Vehicle } from '@/lib/types'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  vehicles: Vehicle[]
  date: string
  branchId: string
}

type PreviewRow = {
  index: number
  date: string
  nopol: string
  typeUnit: string
  vehicleBranch: string
  achRevenue: number
  bop: number
  isValid: boolean
  errors: string[]
}

export default function RevenueImportModal({ isOpen, onClose, onSuccess, vehicles, date, branchId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const findVehicle = (nopol: string) =>
    vehicles.find(x => x.nopol.toLowerCase() === nopol.trim().toLowerCase())

  const validateRow = (row: Partial<PreviewRow>): PreviewRow => {
    const errors: string[] = []
    const vehicle = findVehicle(row.nopol || '')
    const typeUnit = vehicle?.type ?? ''
    const vehicleBranch = vehicle?.branchId ?? ''

    if (!row.date) errors.push('Date wajib diisi')
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.push('Format Date harus YYYY-MM-DD')

    if (!row.nopol) errors.push('License Plate wajib diisi')
    else if (!vehicle) errors.push(`Kendaraan dengan nopol "${row.nopol}" tidak ditemukan`)
    else if (branchId !== 'ALL' && vehicleBranch !== branchId) errors.push(`Nopol "${row.nopol}" milik cabang ${vehicleBranch}, bukan cabang terpilih`)

    return {
      index: row.index!,
      date: row.date || date,
      nopol: row.nopol || '',
      typeUnit,
      vehicleBranch,
      achRevenue: row.achRevenue || 0,
      bop: row.bop || 0,
      isValid: errors.length === 0,
      errors
    }
  }

  const downloadTemplate = () => {
    const instructions = [
      ['INSTRUCTIONS (PLEASE READ)'],
      [''],
      [`Tanggal Default: ${date}`],
      [''],
      ['1. Fill the "Data" sheet.'],
      ['2. Do not change the column headers.'],
      ['3. Date format: YYYY-MM-DD. Kosongkan untuk memakai tanggal default.'],
      ['4. License Plate WAJIB milik cabang yang sedang dipilih.'],
      ['5. Actual Revenue dan BOP optional (0 jika kosong).'],
      ['6. Type Unit akan terisi otomatis dari data kendaraan.'],
      ['7. Target Per Unit diambil otomatis dari Master Data.'],
      [''],
      ['--- FIELD GUIDE ---'],
      ['Date: Tanggal pencatatan revenue'],
      ['License Plate: Nomor polisi kendaraan (WAJIB)'],
      ['Actual Revenue: Realisasi pendapatan (Rp)'],
      ['BOP: Biaya Operasional (Rp)'],
    ]

    const dataHeaders = [
      ['Date', 'License Plate', 'Actual Revenue', 'BOP'],
      [date, vehicles[0]?.nopol || 'DD 1234 XY', 4500000, 500000]
    ]

    const wb = XLSX.utils.book_new()
    const wsData = XLSX.utils.aoa_to_sheet(dataHeaders)
    wsData['!cols'] = [{wch: 15}, {wch: 22}, {wch: 18}, {wch: 18}]
    const wsRef = XLSX.utils.aoa_to_sheet(instructions)
    wsRef['!cols'] = [{wch: 30}, {wch: 60}]

    XLSX.utils.book_append_sheet(wb, wsData, 'Data')
    XLSX.utils.book_append_sheet(wb, wsRef, 'Instructions')
    XLSX.writeFile(wb, `Revenue_Import_${date}.xlsx`)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setIsProcessing(true)
    setPreview([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })

        const parsedRows = rows.map((row, idx) => {
          let rowDate = String(row['Date'] || '').trim()
          if (!rowDate) rowDate = date
          if (!isNaN(Number(rowDate)) && Number(rowDate) > 30000) {
             const d = new Date(Math.round((Number(rowDate) - 25569) * 86400 * 1000))
             rowDate = d.toISOString().split('T')[0]
          }
          return validateRow({
            index: idx + 2,
            date: rowDate,
            nopol: String(row['License Plate'] || row['nopol'] || '').trim(),
            achRevenue: Number(row['Actual Revenue']) || 0,
            bop: Number(row['BOP']) || 0,
          })
        })

        const cleanedRows = parsedRows.filter(r => r.nopol)
        setPreview(cleanedRows)
      } catch (err) {
        showToast('Gagal membaca file Excel. Pastikan format sesuai template.', 'error')
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      showToast('Error membaca file.', 'error')
      setIsProcessing(false)
    }
    reader.readAsBinaryString(uploadedFile)
  }

  const updateRow = (index: number, field: keyof PreviewRow, val: any) => {
    setPreview(prev => prev.map(r => {
      if (r.index !== index) return r
      const updated = { ...r, [field]: val }
      return validateRow(updated)
    }))
  }

  const handleImport = async () => {
    const validRows = preview.filter(r => r.isValid)
    if (validRows.length === 0) {
      showToast('Tidak ada data valid untuk diimport!', 'error')
      return
    }

    setIsUploading(true)
    try {
      const payload = validRows.map(r => {
        const veh = findVehicle(r.nopol)
        return {
          date: r.date,
          branchId: branchId === 'ALL' ? r.vehicleBranch : branchId,
          nopol: r.nopol,
          typeUnit: r.typeUnit,
          targetPerUnit: veh?.revenueTarget || 0,
          achRevenue: r.achRevenue,
          bop: r.bop,
        }
      })

      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: payload })
      })

      const data = await res.json()
      if (!res.ok) {
        const msg = data.details ? data.details.join('; ') : data.error
        throw new Error(msg || 'Import gagal')
      }

      showToast(`Berhasil import ${data.results.length} data revenue!`)
      onSuccess()
      onClose()
    } catch (e: any) {
      showToast(e.message || 'Gagal import data revenue', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const validCount = preview.filter(r => r.isValid).length
  const invalidCount = preview.length - validCount
  const allowPartialImport = validCount > 0 && invalidCount > 0

  return (
    <Modal title="Import Revenue dari Excel" onClose={onClose} width={1000}
      footer={
        <div className="flex w-full justify-between items-center">
          <p className="text-[12px] text-gray-500">
            {preview.length > 0 ? (
              <>Valid: <strong className="text-green-600">{validCount}</strong> | Invalid: <strong className="text-red-500">{invalidCount}</strong></>
            ) : 'Upload file Excel untuk melihat preview'}
          </p>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={onClose}>Batal</Btn>
            <Btn onClick={handleImport} disabled={validCount === 0 || isUploading}
                 className={allowPartialImport ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white' : ''}>
              {isUploading ? 'Mengimport...' : allowPartialImport ? 'Import Sebagian (Skip Invalid)' : 'Konfirmasi Import'}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-teal-900 mb-1">Langkah 1: Download Template</h3>
            <p className="text-[11px] text-teal-700/80">Download template Excel dengan format yang sudah ditentukan.</p>
          </div>
          <Btn onClick={downloadTemplate} variant="outline" className="bg-white border-teal-200 text-teal-700 hover:bg-teal-50">
            <Download size={14} className="mr-1.5" /> Download Template
          </Btn>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-[#2C4A42] mb-1">Langkah 2: Upload Data</h3>
            <p className="text-[11px] text-[#5B8F82]">Upload file Excel yang sudah diisi untuk divalidasi dan diedit secara inline.</p>
          </div>
          <div>
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Btn onClick={() => fileInputRef.current?.click()} className="bg-[#2C4A42] hover:bg-slate-700">
              <UploadCloud size={14} className="mr-1.5" /> Pilih File Excel
            </Btn>
          </div>
        </div>

        {isProcessing && <div className="py-8 text-center text-sm text-gray-500">Memproses file...</div>}

        {!isProcessing && preview.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-2 flex flex-col">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-[12px] font-semibold text-[#3D6B60]">Preview Data & Inline Edit</h4>
              <span className="text-[11px] text-[#5B8F82]">{preview.length} baris terdeteksi</span>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[340px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-[#5B8F82]">
                    <th className="px-3 py-2 font-medium border-b w-10">Row</th>
                    <th className="px-3 py-2 font-medium border-b w-10">St</th>
                    <th className="px-2 py-2 font-medium border-b">Tanggal</th>
                    <th className="px-2 py-2 font-medium border-b">Nopol</th>
                    <th className="px-3 py-2 font-medium border-b">Type Unit</th>
                    <th className="px-3 py-2 font-medium border-b">Cabang</th>
                    <th className="px-2 py-2 font-medium border-b text-right">Ach Revenue</th>
                    <th className="px-2 py-2 font-medium border-b text-right">BOP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i} className={`hover:bg-slate-50 ${!row.isValid ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 text-[#7A9E94] text-center">{row.index}</td>
                      <td className="px-3 py-2">
                        {row.isValid ? (
                          <div className="flex justify-center text-green-600"><CheckCircle2 size={14} /></div>
                        ) : (
                          <div className="group relative flex justify-center text-red-500 cursor-help">
                            <XCircle size={14} />
                            <div className="absolute left-6 top-0 hidden group-hover:block bg-red-900 text-white p-2 rounded text-[10px] whitespace-nowrap z-20 shadow-xl max-w-[260px]">
                              {row.errors.map((e, ei) => <div key={ei}>• {e}</div>)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1 min-w-[110px]">
                        <input type="date" value={row.date} onChange={e => updateRow(row.index, 'date', e.target.value)}
                          className={`w-full bg-white border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-teal-500 ${row.errors.some(e=>e.includes('Date')) ? 'border-red-400 bg-red-50/50' : 'border-slate-200'}`} />
                      </td>
                      <td className="px-1 py-1 min-w-[100px]">
                        <input type="text" value={row.nopol} onChange={e => updateRow(row.index, 'nopol', e.target.value)}
                          className={`w-full bg-white border rounded px-2 py-1 text-[11px] font-mono-jb focus:ring-1 focus:ring-teal-500 ${row.errors.some(e=>e.includes('Nopol')||e.includes('License')||e.includes('cabang')) ? 'border-red-400 bg-red-50/50' : 'border-slate-200'}`} />
                      </td>
                      <td className="px-3 py-2 text-[#4A6B60]">{row.typeUnit || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.vehicleBranch === branchId || branchId === 'ALL' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {row.vehicleBranch || '-'}
                        </span>
                      </td>
                      <td className="px-1 py-1 min-w-[110px]">
                        <input type="number" value={row.achRevenue} onChange={e => updateRow(row.index, 'achRevenue', +e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-right focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="px-1 py-1 min-w-[110px]">
                        <input type="number" value={row.bop} onChange={e => updateRow(row.index, 'bop', +e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-right focus:ring-1 focus:ring-teal-500" />
                      </td>
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
