import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

const API = import.meta.env.VITE_API_URL

export default function ProfilePage() {
  const { token, inspector, login, logout } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(inspector?.name ?? '')
  const [companyName, setCompanyName] = useState(inspector?.company_name ?? '')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)
    try {
      const res = await fetch(`${API}/inspectors/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, company_name: companyName, license_number: licenseNumber || null }),
      })
      if (!res.ok) {
        setError('Failed to save. Try again.')
        return
      }
      const updated = await res.json()
      login(token!, updated)
      setSaved(true)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium"
        >
          ← Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Profile</h1>
          <p className="text-slate-400 mt-1 text-sm">{inspector?.email}</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Full name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => { setName(e.target.value); setSaved(false) }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Company name
              </label>
              <input
                type="text"
                placeholder="Smith Home Inspections"
                value={companyName}
                onChange={e => { setCompanyName(e.target.value); setSaved(false) }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                License number
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={licenseNumber}
                onChange={e => { setLicenseNumber(e.target.value); setSaved(false) }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {saved && <p className="text-green-700 text-sm font-medium">Profile saved.</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <p className="text-slate-500 text-sm mb-4">Signing out will clear your session on this device.</p>
          <button
            onClick={handleLogout}
            className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold text-base border border-red-100 active:scale-[0.98] transition-transform"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
