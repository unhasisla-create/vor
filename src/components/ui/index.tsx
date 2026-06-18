'use client'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastItem { id: number; msg: string; type: 'success' | 'error' }
let _addToast: ((msg: string, type?: 'success' | 'error') => void) | null = null

export function showToast(msg: string, type: 'success' | 'error' = 'success') {
  _addToast?.(msg, type)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  useEffect(() => {
    _addToast = (msg, type = 'success') => {
      const id = ++counter.current
      setToasts(p => [...p, { id, msg, type }])
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2800)
    }
    return () => { _addToast = null }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`toast-enter flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl
          text-white text-[13px] font-medium max-w-[340px]
          ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
  footer?: React.ReactNode
}

export function Modal({ title, onClose, children, width = 500, footer }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100"
        style={{ width, maxWidth: '95vw' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-br from-slate-50 to-white">
          <h3 className="text-[16px] font-bold text-[#1E3A33] tracking-tight">{title}</h3>
          <button onClick={onClose}
            className="text-[#7A9E94] hover:text-[#4A6B60] hover:bg-slate-100 rounded-lg p-1.5 transition-all duration-200 flex-shrink-0">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 bg-white">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
export function ConfirmModal({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title="Konfirmasi Aksi" onClose={onCancel} width={420}
      footer={
        <>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-[#3D6B60] text-[12px] font-medium hover:bg-slate-50 transition-all duration-200 hover:border-slate-400">Batal</button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-lg bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700 shadow-sm hover:shadow-md transition-all duration-200">Ya, Lanjutkan</button>
        </>
      }>
      <p className="text-[13px] text-[#4A6B60] leading-relaxed">{msg}</p>
    </Modal>
  )
}

// ── Inline reusable classes (via style) ────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled = false, className = '', size = 'md' }:
  { children: React.ReactNode; onClick?: () => void; variant?: string; disabled?: boolean; className?: string; size?: string }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed'
  const sz = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'
  const variants: Record<string, string> = {
    primary:      'bg-teal-600 text-white hover:bg-teal-700 border border-teal-700',
    success:      'bg-green-600 text-white hover:bg-green-700 border border-green-700',
    danger:       'bg-red-600 text-white hover:bg-red-700 border border-red-700',
    outline:      'bg-white text-[#3D6B60] border border-slate-300 hover:bg-slate-50',
    'ghost-blue': 'bg-transparent text-teal-600 border border-teal-500 hover:bg-teal-50',
    'ghost-green':'bg-transparent text-green-600 border border-green-500 hover:bg-green-50',
    'ghost-red':  'bg-transparent text-red-600 border border-red-400 hover:bg-red-50',
    purple:       'bg-purple-600 text-white hover:bg-purple-700 border border-purple-700',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sz} ${variants[variant] ?? variants.outline} ${className}`}>
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'teal' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-teal-50 text-teal-700 border border-teal-200',
    green:  'bg-green-50 text-green-700 border border-green-200',
    red:    'bg-red-50 text-red-700 border border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    gray:   'bg-gray-100 text-[#4A6B60] border border-gray-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[color] ?? colors.blue}`}>
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
      {children}
    </div>
  )
}

export function KpiCard({ label, value, sub, color = '#3b82f6' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/0 to-slate-100/50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: color }} />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <p className="text-[11px] text-[#5B8F82] font-bold uppercase tracking-wider mb-2">{label}</p>
        <div>
          <p className="text-[28px] font-black tracking-tight leading-none mb-1 drop-shadow-sm" style={{ color }}>{value}</p>
          {sub && <p className="text-[11px] text-[#7A9E94] font-medium">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1E3A33]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-[#5B8F82]">{subtitle}</p>}
      </div>
      {actions && <div className="w-full flex items-center justify-end gap-2 flex-wrap lg:w-auto">{actions}</div>}
    </div>
  )
}

// ── InfoBox ───────────────────────────────────────────────────────────────────
export function InfoBox({ children, type = 'teal' }: { children: React.ReactNode; type?: string }) {
  const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    blue:   { bg: 'bg-teal-50', border: 'border-l-4 border-l-teal-500', text: 'text-teal-800', icon: 'ℹ️' },
    green:  { bg: 'bg-green-50', border: 'border-l-4 border-l-green-500', text: 'text-green-800', icon: '✓' },
    red:    { bg: 'bg-red-50', border: 'border-l-4 border-l-red-500', text: 'text-red-800', icon: '⚠️' },
    yellow: { bg: 'bg-yellow-50', border: 'border-l-4 border-l-yellow-500', text: 'text-yellow-800', icon: '⚡' },
  }
  const style = styles[type] ?? styles.blue
  return (
    <div className={`flex gap-3.5 px-4 py-3.5 rounded-xl mb-4 ${style.bg} border border-slate-200 ${style.border} text-[12px] ${style.text}`}>
      <span className="flex-shrink-0 text-base leading-none">{style.icon}</span>
      {children}
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────────────────────────
export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#3D6B60] mb-2 tracking-tight">{label}</label>
      {children}
    </div>
  )
}

export const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-[13px] text-[#1E3A33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-slate-400 transition-all duration-200'
export const selectCls = inputCls + ' appearance-none'

// ── FilterPopup ──────────────────────────────────────────────────────────────
export { default as FilterPopup } from './FilterPopup'

// ── Styled Select ────────────────────────────────────────────────────────────
export { default as Select } from './Select'

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
  )
}

export function SkeletonTable({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }, (_, j) => (
            <td key={j} className="px-3 py-3">
              <Skeleton className={j === 0 ? 'w-16 h-4' : j === 3 ? 'w-48 h-4' : 'w-20 h-4'} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <Skeleton className="w-24 h-3 mb-3" />
      <Skeleton className="w-32 h-7 mb-2" />
      <Skeleton className="w-20 h-3" />
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-slate-200 mb-5">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-all -mb-px
            ${active === t ? 'text-teal-600 border-teal-600' : 'text-[#5B8F82] border-transparent hover:text-[#3D6B60]'}`}>
          {t}
        </button>
      ))}
    </div>
  )
}
