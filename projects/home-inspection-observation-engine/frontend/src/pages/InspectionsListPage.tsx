import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

const API = import.meta.env.VITE_API_URL

type Inspection = {
  id: number
  address: string
  client_name: string | null
  property_type: string | null
  inspection_date: string | null
  created_at: string | null
}

export default function InspectionsListPage() {
  const { token, inspector, logout } = useAuth()
  const navigate = useNavigate()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    fetch(`${API}/inspections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setInspections([...data].reverse())
        setLoading(false)
      })
      .catch(() => {
        setFetchError(true)
        setLoading(false)
      })
  }, [token])

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Greeting + sign out */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {inspector?.name ?? 'My Inspections'}
            </h1>
            {inspector?.company_name && (
              <p className="text-slate-400 text-sm mt-0.5">{inspector.company_name}</p>
            )}
          </div>
          <button
            onClick={logout}
            className="text-slate-400 text-sm font-medium hover:text-slate-600"
          >
            Sign out
          </button>
        </div>

        {/* New Inspection button */}
        <button
          onClick={() => navigate('/inspections/new')}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base mb-6 active:scale-[0.98] transition-transform shadow-md shadow-blue-100"
        >
          + New Inspection
        </button>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <p className="text-slate-400">Couldn't load inspections. Check your connection.</p>
          </div>
        ) : inspections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-base">No inspections yet.</p>
            <p className="text-slate-400 text-sm mt-1">Tap New Inspection to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-slate-400 text-sm mb-1">
              {inspections.length} inspection{inspections.length !== 1 ? 's' : ''}
            </p>
            {inspections.map(inspection => (
              <div
                key={inspection.id}
                onClick={() => navigate(`/inspections/${inspection.id}`)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate text-base leading-snug">{inspection.address}</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {inspection.client_name ?? inspection.property_type ?? formatDate(inspection.created_at) ?? ''}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
