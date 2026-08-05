import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoIcon from '../assets/logo-icon.png'

const API = import.meta.env.VITE_API_URL

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError('Invalid email or password')
        return
      }
      const { access_token } = await res.json()
      const meRes = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const inspector = await meRes.json()
      login(access_token, inspector)
      navigate(from, { replace: true })
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-offwhite flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <img src={logoIcon} alt="InspectFlow logo" className="h-10 w-auto" />
        <span className="font-bold text-2xl tracking-tight" style={{ color: '#0F1F4E' }}>
          Inspect<span style={{ color: '#2563EB' }}>Flow</span>
        </span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h1 className="text-xl font-extrabold text-slate-900 mb-6">Sign in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform mt-1"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-slate-400 text-sm text-center mt-6">
        No account?{' '}
        <a href="/register" className="text-blue-600 font-semibold">Create one</a>
      </p>
    </div>
  )
}
