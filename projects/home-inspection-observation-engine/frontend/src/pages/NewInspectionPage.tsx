import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className="min-h-screen bg-slate-950 p-6">
      <button
        onClick={() => navigate('/')}
        className="text-slate-400 text-sm mb-8 flex items-center gap-1 hover:text-slate-300"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-2">New Inspection</h1>
      <p className="text-slate-400 text-sm mb-8">Address is required. Everything else can be added later.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1.5 block">
            Property Address *
          </label>
          <input
            type="text"
            placeholder="123 Main St, Springfield"
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1.5 block">
            Client Name
          </label>
          <input
            type="text"
            placeholder="Jane Smith"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1.5 block">
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select type...</option>
            <option value="Single Family">Single Family</option>
            <option value="Condo">Condo</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Multi-Family">Multi-Family</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-semibold text-base mt-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Creating...' : 'Start Inspection'}
        </button>
      </form>
    </div>
  )
}
