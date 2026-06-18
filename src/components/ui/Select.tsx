'use client'
import { ChevronDown } from 'lucide-react'

type Props = {
  value: string | number
  onChange: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export default function Select({ value, onChange, children, disabled, className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full appearance-none px-3 py-2 rounded-xl border text-[13px] font-medium transition-all bg-white cursor-pointer
          disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60
          focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        style={{ borderColor: '#D6E4DC', color: '#2C4A42' }}>
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
        <ChevronDown size={14} className="text-[#7A9E94]" />
      </div>
    </div>
  )
}
