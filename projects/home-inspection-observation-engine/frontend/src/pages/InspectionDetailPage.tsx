import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

type ObsSummary = {
  observation_id: string
  title: string | null
  room_or_area: string | null
  system: string | null
  severity: string | null
  safety_related: boolean | null
  status: string | null
  photo_ids: number[] | null
}

const severityColors: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
}

const statusColors: Record<string, string> = {
  'Approved': 'bg-green-100 text-green-700',
  'Ready for Review': 'bg-blue-100 text-blue-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Needs Revision': 'bg-amber-100 text-amber-700',
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [observations, setObservations] = useState<ObsSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [processMessage, setProcessMessage] = useState<string | null>(null)

  function loadObservations() {
    return fetch(`${API}/observations?inspection_id=${id}`).then(r => r.json())
  }

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`${API}/inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      loadObservations(),
    ])
      .then(([inspectionData, observationsData]) => {
        setInspection(inspectionData)
        setObservations([...observationsData].reverse())
        setLoading(false)
      })
      .catch(() => {
        setFetchError(true)
        setLoading(false)
      })
  }, [id, token])

  async function handleProcessQueue() {
    if (!id || isProcessing) return
    setIsProcessing(true)
    setProcessMessage(null)
    try {
      const res = await fetch(`${API}/inspections/${id}/process-queue`, { method: 'POST' })
      const data = await res.json()
      const succeeded = data.results?.filter((r: { success: boolean }) => r.success).length ?? 0
      const failed = data.results?.filter((r: { success: boolean }) => !r.success).length ?? 0
      setProcessMessage(
        failed > 0
          ? `${succeeded} processed · ${failed} failed`
          : `${succeeded} observation${succeeded !== 1 ? 's' : ''} processed`
      )
      const updated = await loadObservations()
      setObservations([...updated].reverse())
    } catch {
      setProcessMessage('Processing failed. Check your connection and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const approvedCount = observations.filter(o => o.status === 'Approved').length

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">

        <button
          onClick={() => navigate('/')}
          className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium"
        >
          ← All inspections
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <p className="text-slate-400">Couldn't load inspection. Check your connection.</p>
          </div>
        ) : inspection ? (
          <>
            {/* Inspection header */}
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">{inspection.address}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {inspection.client_name && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{inspection.client_name}</span>
                )}
                {inspection.property_type && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{inspection.property_type}</span>
                )}
                {inspection.created_at && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{formatDate(inspection.created_at)}</span>
                )}
              </div>
              {observations.length > 0 && (
                <p className="text-slate-400 text-sm mt-2">
                  {approvedCount} approved · {observations.length} total observation{observations.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Add Observation button */}
            <button
              onClick={() => navigate(`/inspections/${id}/capture`)}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base mb-6 active:scale-[0.98] transition-transform shadow-md shadow-blue-100"
            >
              + Add Observation
            </button>

            {/* Observations */}
            {observations.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-base">No observations yet.</p>
                <p className="text-slate-400 text-sm mt-1">Tap Add Observation to get started.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {observations.map((obs, idx) => (
                  <div
                    key={obs.observation_id}
                    onClick={() => navigate(`/review/${obs.observation_id}`, { state: { from: 'inspection', inspectionId: id } })}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    {/* Thumbnail */}
                    {obs.photo_ids && obs.photo_ids.length > 0 && !failedPhotos.has(obs.observation_id) ? (
                      <img
                        src={`${API}/observations/${obs.observation_id}/photos/${obs.photo_ids[0]}`}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                        onError={() => setFailedPhotos(prev => new Set(prev).add(obs.observation_id))}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900 truncate text-base leading-snug">{obs.title ?? 'Untitled'}</p>
                        <span className="text-xs text-slate-300 shrink-0 mt-0.5">#{observations.length - idx}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {obs.room_or_area && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{obs.room_or_area}</span>
                        )}
                        {obs.system && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{obs.system}</span>
                        )}
                        {obs.severity && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityColors[obs.severity] ?? 'bg-slate-100 text-slate-500'}`}>
                            {obs.severity}
                          </span>
                        )}
                        {obs.safety_related && (
                          <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">⚠ Safety</span>
                        )}
                        {obs.status && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[obs.status] ?? 'bg-slate-100 text-slate-500'}`}>
                            {obs.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="flex items-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9,18 15,12 9,6"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
