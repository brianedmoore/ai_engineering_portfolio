import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

const API = import.meta.env.VITE_API_URL

export default function OnboardingPage() {
  const { token, inspector, login } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(inspector?.name ?? '')
  const [companyName, setCompanyName] = useState(inspector?.company_name ?? '')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/inspectors/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, company_name: companyName, license_number: licenseNumber }),
      })
      if (!res.ok) {
        setError('Failed to save profile. Try again.')
        return
      }
      const updated = await res.json()
      login(token!, updated)
      navigate('/', { replace: true })
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set up your profile</h1>
          <p className="text-slate-400 mt-1 text-sm">This appears on your inspection reports.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Full name *
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                required
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
                onChange={e => setCompanyName(e.target.value)}
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
                onChange={e => setLicenseNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
