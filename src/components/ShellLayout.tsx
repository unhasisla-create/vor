'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useVORStore } from '@/lib/store'
import { getWITA } from '@/lib/constants'
import { getStoredUser, clearStoredUser, saveUserSession } from '@/lib/auth-client'
import type { UserSession } from '@/lib/types'
import { Skeleton } from '@/components/ui'
import {
  LayoutDashboard, Database, Table2, CalendarDays,
  BarChart3, GitCompare, ScrollText, LogOut, RefreshCw, DollarSign, AlertTriangle
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',         icon: LayoutDashboard, section: 'Menu Utama' },
  { href: '/master',    label: 'Master Data',        icon: Database },
  { href: '/actual',    label: 'Actual Operation',   icon: Table2 },
  { href: '/forecast',  label: 'Forecast Planning',  icon: CalendarDays },
  { href: '/revenue',   label: 'Revenue Evaluation', icon: DollarSign },
  { href: '/kpi',       label: 'KPI Engine',         icon: BarChart3,      section: 'Analitik' },
  { href: '/fva',       label: 'Forecast vs Actual', icon: GitCompare },
  { href: '/breakdown', label: 'Breakdown Analysis', icon: AlertTriangle },
  { href: '/audit',     label: 'Audit Trail',        icon: ScrollText,     section: 'Sistem' },
]

const ROLE_NAV: Record<string, string[]> = {
  Admin: ['/dashboard', '/master', '/actual', '/forecast', '/revenue', '/kpi', '/fva', '/breakdown', '/audit'],
  Planner: ['/dashboard', '/actual', '/forecast', '/kpi', '/fva', '/breakdown', '/audit'],
  Supervisor: ['/dashboard', '/actual', '/forecast', '/kpi', '/fva', '/breakdown', '/audit'],
  Management: ['/dashboard', '/revenue', '/kpi', '/fva', '/breakdown'],
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const initFromServer = useVORStore(s => s.initFromServer)
  const loadRevenues = useVORStore(s => s.loadRevenues)
  const isHydrated = useVORStore(s => s.isHydrated)
  const branch   = useVORStore(s => s.branch)
  const setBranch = useVORStore(s => s.setBranch)
  const [clock,  setClock]  = useState('')
  const [user,   setUser]   = useState<UserSession | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const saved = getStoredUser()
    if (saved) {
      setUser(saved)
      setBranch(saved.branch)
    }

    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) throw new Error('Unauthorized')
        const data = await res.json()
        if (data?.user) {
          saveUserSession(data.user)
          setUser(data.user)
          setBranch(data.user.branch)
          if (!isHydrated) {
            await initFromServer()
            loadRevenues().catch(() => {})
          }
        }
      })
      .catch(() => {
        clearStoredUser()
        router.push('/login')
      })
      .finally(() => setAuthLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const tick = () => {
      const w = getWITA()
      setClock(
        `${String(w.getHours()).padStart(2,'0')}:${String(w.getMinutes()).padStart(2,'0')}:${String(w.getSeconds()).padStart(2,'0')} WITA`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network issues during logout
    }
    clearStoredUser()
    setUser(null)
    router.push('/login')
  }

  const pageTitle = NAV.find(n => n.href === pathname)?.label ?? 'VOR System'
  const allowedNav = user ? NAV.filter(item => ROLE_NAV[user.role]?.includes(item.href)) : []

  const roleColor: Record<string,string> = { Admin: '#5B8F82', Planner: '#34d399', Supervisor: '#fbbf24', Management: '#a78bfa' }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F8F6' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: '#E0F0EA', border: '1px solid #B8CEBC' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B8F82" strokeWidth="1.5">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 4v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Skeleton className="w-36 h-4" />
            <Skeleton className="w-56 h-3" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-[230px] flex-shrink-0 flex flex-col fixed top-0 left-0 h-screen z-50"
        style={{ background: 'linear-gradient(180deg, #E8F0EC 0%, #DCE8E2 50%, #D2E0D9 100%)', borderRight: '1px solid #C4D8CC' }}>

        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#B8CEBC' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(91,143,130,0.15)', border: '1px solid rgba(91,143,130,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B8F82" strokeWidth="1.5">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 4v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest leading-none" style={{ color: '#7A9E94' }}>VOR System</p>
              <h1 className="text-[15px] font-bold tracking-tight leading-tight" style={{ color: '#2C4A42' }}>Dynamic Oasis</h1>
            </div>
          </div>
          <p className="text-[10px] mt-1" style={{ color: '#8FAE9F' }}>v1.05 — Vehicle Monitoring</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {allowedNav.map((item) => {
            const Icon   = item.icon
            const active = pathname === item.href
            return (
              <div key={item.href}>
                {item.section && (
                  <p className="text-[9px] uppercase tracking-[1.5px] px-2 pt-3 pb-1 mt-1"
                    style={{ color: '#8FAE9F' }}>
                    {item.section}
                  </p>
                )}
                <Link href={item.href}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg mb-0.5 text-[13px] transition-all
                    ${active
                      ? 'font-semibold'
                      : 'font-normal hover:bg-white/50'}`}
                  style={active
                    ? { background: 'rgba(91,143,130,0.2)', color: '#2C4A42', boxShadow: 'inset 3px 0 0 #5B8F82' }
                    : { color: '#4A6B60' }
                  }>
                  <Icon size={15} style={{ opacity: active ? 1 : 0.6 }} />
                  {item.label}
                </Link>
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3.5" style={{ borderTop: '1px solid #B8CEBC' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px]" style={{ color: '#8FAE9F' }}>Logged in as</p>
              <p className="text-[13px] font-semibold mt-0.5" style={{ color: '#2C4A42' }}>{user.name}</p>
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: roleColor[user.role] ?? '#5B8F82' }}>
                ● {user.role} {user.branch !== 'ALL' ? `— ${user.branch}` : '— All Branch'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg transition text-[12px]"
            style={{ color: '#7A9E94' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,143,130,0.12)'; e.currentTarget.style.color = '#2C4A42' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A9E94' }}>
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="ml-[230px] flex-1 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 backdrop-blur-sm shadow-sm"
          style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #D6E4DC' }}>
          <div className="flex items-center justify-between h-14 px-6">
            <div className="flex items-center gap-3">
              <h2 className="text-[15px] font-semibold" style={{ color: '#2C4A42' }}>{pageTitle}</h2>
              <span className="text-[11px]" style={{ color: '#C4D8CC' }}>|</span>
              <span className="text-[12px]" style={{ color: '#7A9E94' }}>{MONTH_LABEL}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono-jb text-[11px] px-3 py-1 rounded-md tabular-nums"
                style={{ color: '#5B8F82', background: '#EFF5F2', border: '1px solid #D6E4DC' }}>
                {clock || '--:--:-- WITA'}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#E0F0EA', color: '#3D6B60', border: '1px solid #B8CEBC' }}>
                {branch}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-x-auto min-w-0" style={{ background: '#F5F8F6' }}>{children}</main>

        {/* Footer */}
        <footer className="px-6 py-3" style={{ borderTop: '1px solid #D6E4DC', background: '#FAFCFB' }}>
          <p className="text-[11px]" style={{ color: '#8FAE9F' }}>
            VOR System v1.05 — Dynamic Oasis | © 2026 Vehicle Operations
          </p>
        </footer>
      </div>
    </div>
  )
}

// Month label helper - shown in topbar
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const now    = new Date()
const MONTH_LABEL = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
