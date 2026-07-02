'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveUserSession } from '@/lib/auth-client'
import { useVORStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
        {/* Brand */}
        <div className="px-5 py-6 border-b flex items-center justify-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <img
            src="/logo-vor-white.svg"
            alt="VOR Logo"
            className="w-full max-w-[260px] h-auto"
          />
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/10 border border-white/15 text-white text-[13px]
                    placeholder-white/25 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition">
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
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
        </div>

        <p className="text-center text-[11px] text-white/20 mt-6">
          © 2026 VOR System — Fleet Operations
        </p>
      </div>
    </div>
  )
}
