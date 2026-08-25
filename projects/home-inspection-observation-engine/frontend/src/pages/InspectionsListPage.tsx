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
  const { token, inspector } = useAuth()
  const navigate = useNavigate()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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

  function parseServerDate(dateStr: string): Date {
    const s = dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z'
    return new Date(s)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return parseServerDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      const res = await fetch(`${API}/inspections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setInspections(prev => prev.filter(i => i.id !== id))
        setConfirmDeleteId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {inspector?.name ?? 'My Inspections'}
          </h1>
          {inspector?.company_name && (
            <p className="text-slate-400 text-sm mt-0.5">{inspector.company_name}</p>
          )}
        </div>

        <button
          onClick={() => navigate('/inspections/new')}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base mb-6 active:scale-[0.98] transition-transform shadow-md shadow-blue-100"
        >
          + New Inspection
        </button>

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
              confirmDeleteId === inspection.id ? (
                /* Confirmation state */
                <div key={inspection.id} className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-0.5 truncate">Delete this inspection?</p>
                  <p className="text-xs text-slate-400 truncate mb-4">{inspection.address}</p>
                  <p className="text-xs text-slate-400 mb-4">All observations, photos, and audio will be permanently deleted.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold active:scale-[0.98] transition-transform"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(inspection.id)}
                      disabled={deletingId === inspection.id}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                    >
                      {deletingId === inspection.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal state */
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
                      {inspection.client_name ?? inspection.property_type ?? formatDate(inspection.inspection_date ?? inspection.created_at) ?? ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(inspection.id) }}
                    className="p-2 -mr-1 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 active:scale-95 transition-all"
                    aria-label="Delete inspection"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
