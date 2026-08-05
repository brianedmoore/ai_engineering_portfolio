import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Set up your profile</h1>
        <p className="text-slate-400 text-sm text-center mb-8">This appears on your inspection reports.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Company name"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="License number (optional)"
            value={licenseNumber}
            onChange={e => setLicenseNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
