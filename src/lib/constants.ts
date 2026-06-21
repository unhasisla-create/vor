// ─── BRANCHES ────────────────────────────────────────────────────────────────
export const BRANCHES = [
  { id: 'LMKS', name: 'Logistik Makassar', code: 'LMKS' },
  { id: 'VLIM', name: 'Vehicle Makassar', code: 'VLIM' },
  { id: 'LSBY', name: 'Logistik Surabaya', code: 'LSBY' },
  { id: 'LBDG', name: 'Logistik Bandung', code: 'LBDG' },
  { id: 'LMDN', name: 'Logistik Medan', code: 'LMDN' },
]

// ─── STATUS MASTER ────────────────────────────────────────────────────────────
export const STATUS_MASTER = [
  { code: 'UTI',   desc: 'Utilisasi',                  group: 'UTILISASI',       color: '#16a34a', isPA: true,  isUA: true,  isPROD: true,  copy: true,  fc: true,  details: 'Armada aktif dan sedang melakukan pengiriman atau tugas operasional.' },
  { code: 'C',     desc: 'Carry Over',                 group: 'UTILISASI',       color: '#15803d', isPA: true,  isUA: true,  isPROD: true,  copy: true,  fc: true,  details: 'Tugas yang dilanjutkan dari periode sebelumnya dan masih berjalan.' },
  { code: 'MB',    desc: 'Muatan Balik',               group: 'UTILISASI',       color: '#059669', isPA: true,  isUA: true,  isPROD: true,  copy: true,  fc: true,  details: 'Armada membawa muatan kembali setelah menyelesaikan tugas angkut utama.' },
  { code: 'RFU',   desc: 'Ready For Use',              group: 'READY FOR USE',   color: '#ca8a04', isPA: true,  isUA: false, isPROD: false, copy: true,  fc: true,  details: 'Armada siap digunakan dan menunggu instruksi tugas selanjutnya.' },
  { code: 'RB',    desc: 'Ready Bengkel',              group: 'READY FOR USE',   color: '#d97706', isPA: true,  isUA: false, isPROD: false, copy: true,  fc: true,  details: 'Armada berada di bengkel tetapi sudah siap digunakan kembali setelah servis ringan.' },
  { code: 'BD',    desc: 'Breakdown',                  group: 'BREAKDOWN',       color: '#dc2626', isPA: false, isUA: false, isPROD: false, copy: false, fc: true,  details: 'Armada mengalami kerusakan yang menghentikan operasional dan memerlukan perbaikan.' },
  { code: 'BDJ+1', desc: 'Breakdown Dijalan > 1 Hari', group: 'BREAKDOWN',      color: '#b91c1c', isPA: false, isUA: false, isPROD: false, copy: false, fc: true,  details: 'Kerusakan parah yang menyebabkan armada tidak bisa beroperasi lebih dari satu hari.' },
  { code: 'AM',    desc: 'Antri Muat',                 group: 'DELAY',           color: '#ea580c', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Armada menunggu antrean untuk proses pemuatan barang.' },
  { code: 'BT',    desc: 'BOP Terlambat',              group: 'DELAY',           color: '#c2410c', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Operasi tertunda karena proses BOP atau administrasi yang belum selesai.' },
  { code: 'AS',    desc: 'Antri Solar',                group: 'DELAY',           color: '#9a3412', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Armada sedang menunggu pengisian bahan bakar sebelum melanjutkan perjalanan.' },
  { code: 'BDJ-1', desc: 'Breakdown Dijalan < 1 Hari', group: 'DELAY',          color: '#b45309', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Kerusakan ringan yang memperlambat operasi selama kurang dari satu hari.' },
  { code: 'FM',    desc: 'Force Maujure',              group: 'DELAY',           color: '#7c3aed', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Keterlambatan karena kejadian di luar kendali, seperti cuaca buruk atau bencana.' },
  { code: 'BTJ',   desc: 'Buka Tutup Jalur',           group: 'DELAY',           color: '#6d28d9', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Perjalanan tertunda karena penutupan atau pembukaan ruas jalan.' },
  { code: 'AB',    desc: 'Antri Bongkar',              group: 'DELAY',           color: '#5b21b6', isPA: true,  isUA: true,  isPROD: false, copy: true,  fc: true,  details: 'Armada menunggu giliran bongkar muat di lokasi tujuan.' },
  { code: 'TAD',   desc: 'Tidak Ada Driver',           group: 'DNA (DS HO)',     color: '#db2777', isPA: true,  isUA: false, isPROD: false, copy: false, fc: true,  details: 'Armada tidak dapat beroperasi karena tidak tersedia driver.' },
  { code: 'TK',    desc: 'Tanpa Keterangan',           group: 'DNA (HC CABANG)', color: '#be185d', isPA: true,  isUA: false, isPROD: false, copy: false, fc: true,  details: 'Status tidak jelas atau belum diidentifikasi oleh cabang.' },
  { code: 'L',     desc: 'Libur',                      group: 'NWD',             color: '#2563eb', isPA: true,  isUA: true,  isPROD: true,  copy: true,  fc: true,  details: 'Armada tidak beroperasi karena periode libur atau istirahat.' },
  { code: 'AT',    desc: 'Asset Tertahan',             group: 'UNR',             color: '#6b7280', isPA: true,  isUA: false, isPROD: false, copy: true,  fc: true,  details: 'Sat aset terhambat oleh masalah administratif atau dokumen.' },
  { code: 'LNR',   desc: 'Lisensi Belum Aktif',        group: 'UNR',             color: '#4b5563', isPA: true,  isUA: false, isPROD: false, copy: true,  fc: true,  details: 'Armada tidak bisa beroperasi karena lisensi atau izin belum aktif.' },
  { code: 'KR',    desc: 'Karoseri',                   group: 'UNR',             color: '#374151', isPA: true,  isUA: false, isPROD: false, copy: true,  fc: true,  details: 'Armada sedang menjalani perbaikan bodi atau karoseri.' },
  { code: 'MT-IN', desc: 'Mutasi Masuk',               group: 'UNR',             color: '#9ca3af', isPA: true,  isUA: false, isPROD: false, copy: false, fc: false, details: 'Unit masuk dari mutasi cabang lain dan sedang dalam proses penerimaan.' },
  { code: 'MT-OUT',desc: 'Mutasi Keluar',              group: 'UNR',             color: '#d1d5db', isPA: true,  isUA: false, isPROD: false, copy: false, fc: false, details: 'Unit sedang dipindahkan ke cabang lain untuk operasional.' },
]

// ─── LOOKUP HELPERS ───────────────────────────────────────────────────────────
export function getStatusMeta(code: string) {
  return STATUS_MASTER.find(s => s.code === code) ?? null
}

export function getStatusColor(code: string): string {
  return getStatusMeta(code)?.color ?? '#e5e7eb'
}

export function getTextColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#111827'
  const r = parseInt(h.slice(0,2),16)
  const g = parseInt(h.slice(2,4),16)
  const b = parseInt(h.slice(4,6),16)
  return (r*299 + g*587 + b*114) / 1000 > 140 ? '#111827' : '#ffffff'
}

// ─── VEHICLE TYPES & CUSTOMERS ───────────────────────────────────────────────
export const VEHICLE_TYPES = [
  'BOX VAN', 'BOX VAN (COLDBOX)', 'CDE BOX', 'CDD STANDAR',
  'CDD LONG', 'CDD JUMBO', 'CDD JUMBO REFEER', 'TBONTON', 'WINGBOX', 'FUSO', 'TRONTON',
]

export const CUSTOMERS = [
  'DEPO', 'CIOMAS', 'SHOPEE', 'ALL PROJECT',
  'INDOMARET', 'ALFAMART', 'LAZADA', 'J&T', 'SICEPAT',
]

export const DRIVERS = [
  'MUH RUSLI','MARWANSYAH','HARIS LEWA','ADRIANSYA','ISMAIL SAID',
  'IMAM WAHYUDI','IMRAN COLI','M GASALIS','RUSLI TALLI','FAKHRUDDIN',
  'SYAMSUL B','BAHARUDDIN','KAMALUDDIN','NURDIN HB','ARIFUDDIN',
  'HASANUDDIN','JAMALUDDIN','SYARIFUDDIN','RAHMAT S','SUDIRMAN',
  'IRFAN MR','KHAIRUL A','ZULKIFLI','HAMZAH D','SAHARUDDIN',
  'MAHMUD A','ANWAR S','BURHANUDDIN','NASRUDDIN','WAHYU P',
]

// ─── MONTHS ───────────────────────────────────────────────────────────────────
export const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatDateObjectKey(date: Date): string {
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function getWITA(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }))
}

export function isForecastWindowOpen(): boolean {
  const h = getWITA().getHours()
  return h >= 16 || h < 12
}
