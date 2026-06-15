'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveUserSession } from '@/lib/auth-client'
import { useVORStore } from '@/lib/store'

const DEMO_USERS = [
  { username: 'admin',         password: 'vor2024', role: 'Admin',      branch: 'ALL',  name: 'Admin' },
  { username: 'planner.lmks',  password: 'vor2024', role: 'Planner',    branch: 'LMKS', name: 'Planner LMKS' },
  { username: 'supervisor.lmks', password: 'vor2024', role: 'Supervisor', branch: 'LMKS', name: 'Supervisor LMKS' },
  { username: 'management',    password: 'vor2024', role: 'Management',  branch: 'ALL',  name: 'Management' },
]

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Gagal masuk. Periksa kredensial.')
        setLoading(false)
        return
      }

      saveUserSession(data.user)
      await useVORStore.getState().initFromServer()
      router.push('/dashboard')
    } catch (err) {
      setError('Gagal terhubung ke server. Coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1e2d42 50%, #243347 100%)' }}>

      {/* Background grid decoration */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-[400px] mx-4">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(91,143,130,0.15)', border: '1px solid rgba(91,143,130,0.3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5B8F82" strokeWidth="1.5">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 4v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">VOR System</h1>
          <p className="text-[13px] text-teal-300/70 mt-1">Dynamic Oasis v1.05 — Fleet Monitoring</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.05] backdrop-blur-sm rounded-2xl border border-white/10 p-8 shadow-2xl">
          <h2 className="text-[17px] font-semibold text-white mb-1">Masuk ke Sistem</h2>
          <p className="text-[12px] text-white/40 mb-6">Vehicle Operational Report System</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-white/60 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="cth: admin"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-[13px]
                  placeholder-white/25 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-[13px]
                  placeholder-white/25 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition"
              />
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-[12px]">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-[13px] transition-all mt-2
                bg-teal-600 hover:bg-teal-500 text-white border border-teal-500
                disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-[11px] text-white/40 font-medium mb-2">Akun Demo (password: vor2024)</p>
            <div className="space-y-1">
              {DEMO_USERS.map(u => (
                <button key={u.username} onClick={() => { setUsername(u.username); setPassword('vor2024') }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg
                    text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition text-left">
                  <span className="font-mono-jb">{u.username}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/20 mt-6">
          © 2026 VOR System — Fleet Operations
        </p>
      </div>
    </div>
  )
}
