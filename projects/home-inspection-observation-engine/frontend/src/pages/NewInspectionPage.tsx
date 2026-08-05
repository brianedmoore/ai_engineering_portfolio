import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

const API = import.meta.env.VITE_API_URL

export default function NewInspectionPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [address, setAddress] = useState('')
  const [clientName, setClientName] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address,
          client_name: clientName || null,
          property_type: propertyType || null,
        }),
      })
      if (!res.ok) {
        setError('Failed to create inspection. Try again.')
        return
      }
      const inspection = await res.json()
      navigate(`/inspections/${inspection.id}/capture`, { replace: true })
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
        <button
          onClick={() => navigate('/')}
          className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium"
        >
          ← Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">New Inspection</h1>
          <p className="text-slate-400 mt-1 text-sm">Address is required. Everything else can be added later.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Property Address *
              </label>
              <input
                type="text"
                placeholder="123 Main St, Springfield"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Client Name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={e => setPropertyType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
              >
                <option value="">Select type…</option>
                <option value="Single Family">Single Family</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Multi-Family">Multi-Family</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base mt-2 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md shadow-blue-100"
            >
              {loading ? 'Creating…' : 'Start Inspection'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
