import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import logoIcon from '../assets/logo-icon.png'

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
  text_description: string | null
  audio_transcript: string | null
}

type QueueState = {
  current: number
  total: number
  label: string
  done: boolean
  firstReadyId: string | null
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
  const [processMessage, setProcessMessage] = useState<string | null>(null)
  const [queueProcessing, setQueueProcessing] = useState<QueueState | null>(null)

  const [queueExpanded, setQueueExpanded] = useState(true)
  const [processedExpanded, setProcessedExpanded] = useState(true)
  const [readyExpanded, setReadyExpanded] = useState(true)
  const [acceptedExpanded, setAcceptedExpanded] = useState(true)
  const [rejectedExpanded, setRejectedExpanded] = useState(true)

  function loadObservations(): Promise<ObsSummary[]> {
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
    if (!id || queueProcessing) return
    const toProcess = observations.filter(o => o.status === 'Raw')
    if (toProcess.length === 0) return

    let succeeded = 0

    for (let i = 0; i < toProcess.length; i++) {
      const obs = toProcess[i]
      const label = obs.text_description ?? obs.audio_transcript ?? `Observation ${i + 1}`
      setQueueProcessing({ current: i + 1, total: toProcess.length, label, done: false, firstReadyId: null })
      try {
        const res = await fetch(`${API}/observations/${obs.observation_id}/process`, { method: 'POST' })
        if (res.ok) succeeded++
      } catch { /* count as failed */ }
    }

    const updated = await loadObservations()
    const updatedReversed = [...updated].reverse()
    setObservations(updatedReversed)

    const firstReady = updatedReversed.find(o => o.status === 'Ready for Review') ?? null

    setQueueProcessing({
      current: toProcess.length,
      total: toProcess.length,
      label: '',
      done: true,
      firstReadyId: firstReady?.observation_id ?? null,
    })

    const failed = toProcess.length - succeeded
    setProcessMessage(
      failed > 0
        ? `${succeeded} processed · ${failed} failed`
        : `${succeeded} observation${succeeded !== 1 ? 's' : ''} processed`
    )

    // Brief checkmark, then auto-navigate to first ready observation
    setTimeout(() => {
      setQueueProcessing(null)
      if (firstReady) {
        navigate(`/review/${firstReady.observation_id}`, { state: { from: 'inspection', inspectionId: id } })
      }
    }, 1200)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const rawObservations = observations.filter(o => o.status === 'Raw')
  const readyObservations = observations.filter(o => o.status === 'Ready for Review')
  const acceptedObservations = observations.filter(o => o.status === 'Approved')
  const rejectedObservations = observations.filter(o => o.status === 'Rejected' || o.status === 'Needs Revision')
  const rawCount = rawObservations.length
  const approvedCount = acceptedObservations.length

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />

      {/* Queue processing overlay */}
      {queueProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8" style={{ backgroundColor: '#FAF9F6' }}>
          <img src={logoIcon} alt="InspectFlow" className="h-40 w-auto" style={{ mixBlendMode: 'multiply' }} />
          <div className="w-full max-w-sm overflow-hidden flex justify-center h-7">
            <span className="animate-flowing text-base font-bold tracking-[0.3em]" style={{ color: '#2563EB' }}>Flowing</span>
          </div>
          <div className="w-full max-w-sm">
            <svg viewBox="0 0 320 30" className="w-full" style={{ height: '30px' }}>
              <path d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15" fill="none" stroke="#bfdbfe" strokeWidth="7" strokeLinecap="round" />
              <path d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" className="animate-river" />
            </svg>
          </div>

          {queueProcessing.done ? (
            <div className="flex flex-col items-center gap-3">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p className="text-xl font-bold text-slate-900 text-center">
                {queueProcessing.total} observation{queueProcessing.total !== 1 ? 's' : ''} ready
              </p>
              <p className="text-sm text-slate-400">Starting review...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
              <p className="text-2xl font-extrabold text-slate-900">
                {queueProcessing.current} of {queueProcessing.total}
              </p>
              {queueProcessing.label && (
                <p className="text-sm text-slate-400 text-center max-w-xs leading-relaxed line-clamp-2">
                  {queueProcessing.label}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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

            {/* Run AI Analysis button */}
            {rawCount > 0 && (
              <div className="mb-4">
                <button
                  onClick={handleProcessQueue}
                  disabled={!!queueProcessing}
                  className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] shadow-md bg-amber-500 text-white cursor-pointer shadow-amber-100 hover:bg-amber-400 disabled:opacity-50"
                >
                  Run AI Analysis · {rawCount} queued
                </button>
                {processMessage && (
                  <p className="text-center text-sm mt-2 text-slate-500">{processMessage}</p>
                )}
              </div>
            )}

            {/* Add Observation button */}
            <button
              onClick={() => navigate(`/inspections/${id}/capture`)}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base mb-6 active:scale-[0.98] transition-transform shadow-md shadow-blue-100"
            >
              + Add Observation
            </button>

            {/* Observations — three sections */}
            {observations.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-base">No observations yet.</p>
                <p className="text-slate-400 text-sm mt-1">Tap Add Observation to get started.</p>
              </div>
            ) : (
              <div className="flex flex-col">

                {/* Level 1: Queue */}
                <button
                  onClick={() => setQueueExpanded(e => !e)}
                  className="flex items-center justify-between w-full py-2 mb-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Queue</span>
                    {rawObservations.length > 0 && (
                      <span className="bg-amber-100 text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full">{rawObservations.length}</span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-200 ${queueExpanded ? 'rotate-180' : ''}`}>
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </button>

                {queueExpanded && (
                  <div className="flex flex-col gap-3 mb-2">
                    {rawObservations.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-3">Nothing queued.</p>
                    ) : (
                      rawObservations.map((obs) => (
                        <ObsCard
                          key={obs.observation_id}
                          obs={obs}
                          obsNumber={observations.indexOf(obs) + 1}
                          totalCount={observations.length}
                          failedPhotos={failedPhotos}
                          onFailPhoto={(pid) => setFailedPhotos(prev => new Set(prev).add(pid))}
                          onClick={() => navigate(`/observations/${obs.observation_id}/raw`, { state: { inspectionId: id } })}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* River divider between Queue and Processed */}
                <div className="py-4">
                  <svg viewBox="0 0 320 24" className="w-full" style={{ height: '24px' }}>
                    <path d="M0,12 C26.7,3 53.3,21 80,12 C106.7,3 133.3,21 160,12 C186.7,3 213.3,21 240,12 C266.7,3 293.3,21 320,12"
                      fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <path d="M0,12 C26.7,3 53.3,21 80,12 C106.7,3 133.3,21 160,12 C186.7,3 213.3,21 240,12 C266.7,3 293.3,21 320,12"
                      fill="none" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" className="animate-river" />
                  </svg>
                </div>

                {/* Level 1: Processed (parent for Ready + Completed) */}
                <button
                  onClick={() => setProcessedExpanded(e => !e)}
                  className="flex items-center justify-between w-full py-2 mb-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processed</span>
                    {(readyObservations.length + acceptedObservations.length + rejectedObservations.length) > 0 && (
                      <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                        {readyObservations.length + acceptedObservations.length + rejectedObservations.length}
                      </span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-200 ${processedExpanded ? 'rotate-180' : ''}`}>
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </button>

                {processedExpanded && (
                  <div className="pl-3 border-l-2 border-slate-100 flex flex-col gap-0 mb-2">

                    {/* Level 2: Ready for Review */}
                    <button
                      onClick={() => setReadyExpanded(e => !e)}
                      className="flex items-center justify-between w-full py-2 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ready for Review</span>
                        {readyObservations.length > 0 && (
                          <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{readyObservations.length}</span>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-200 ${readyExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </button>

                    {readyExpanded && (
                      <div className="flex flex-col gap-3 mb-4">
                        {readyObservations.length === 0 ? (
                          <p className="text-slate-400 text-sm py-2">None ready yet.</p>
                        ) : (
                          readyObservations.map((obs) => (
                            <ObsCard
                              key={obs.observation_id}
                              obs={obs}
                              obsNumber={observations.indexOf(obs) + 1}
                              totalCount={observations.length}
                              failedPhotos={failedPhotos}
                              onFailPhoto={(pid) => setFailedPhotos(prev => new Set(prev).add(pid))}
                              onClick={() => navigate(`/review/${obs.observation_id}`, { state: { from: 'inspection', inspectionId: id } })}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Thin divider */}
                    <div className="border-t border-slate-100 mb-3" />

                    {/* Level 2: Accepted */}
                    <button
                      onClick={() => setAcceptedExpanded(e => !e)}
                      className="flex items-center justify-between w-full py-2 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accepted</span>
                        {acceptedObservations.length > 0 && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{acceptedObservations.length}</span>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-200 ${acceptedExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </button>

                    {acceptedExpanded && (
                      <div className="flex flex-col gap-3 mb-4">
                        {acceptedObservations.length === 0 ? (
                          <p className="text-slate-400 text-sm py-2">No accepted observations yet.</p>
                        ) : (
                          acceptedObservations.map((obs) => (
                            <ObsCard
                              key={obs.observation_id}
                              obs={obs}
                              obsNumber={observations.indexOf(obs) + 1}
                              totalCount={observations.length}
                              failedPhotos={failedPhotos}
                              onFailPhoto={(pid) => setFailedPhotos(prev => new Set(prev).add(pid))}
                              onClick={() => navigate(`/review/${obs.observation_id}`, { state: { from: 'inspection', inspectionId: id } })}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Thin divider */}
                    <div className="border-t border-slate-100 mb-3" />

                    {/* Level 2: Rejected */}
                    <button
                      onClick={() => setRejectedExpanded(e => !e)}
                      className="flex items-center justify-between w-full py-2 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected</span>
                        {rejectedObservations.length > 0 && (
                          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{rejectedObservations.length}</span>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-200 ${rejectedExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </button>

                    {rejectedExpanded && (
                      <div className="flex flex-col gap-3 pb-4">
                        {rejectedObservations.length === 0 ? (
                          <p className="text-slate-400 text-sm py-2">No rejected observations.</p>
                        ) : (
                          rejectedObservations.map((obs) => (
                            <ObsCard
                              key={obs.observation_id}
                              obs={obs}
                              obsNumber={observations.indexOf(obs) + 1}
                              totalCount={observations.length}
                              failedPhotos={failedPhotos}
                              onFailPhoto={(pid) => setFailedPhotos(prev => new Set(prev).add(pid))}
                              onClick={() => navigate(`/review/${obs.observation_id}`, { state: { from: 'inspection', inspectionId: id } })}
                            />
                          ))
                        )}
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function ObsCard({ obs, obsNumber, totalCount, failedPhotos, onFailPhoto, onClick }: {
  obs: ObsSummary
  obsNumber: number
  totalCount: number
  failedPhotos: Set<string>
  onFailPhoto: (id: string) => void
  onClick: () => void
}) {
  const API = import.meta.env.VITE_API_URL
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
    'Raw': 'bg-amber-50 text-amber-500',
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform"
    >
      {obs.photo_ids && obs.photo_ids.length > 0 && !failedPhotos.has(obs.observation_id) ? (
        <img
          src={`${API}/observations/${obs.observation_id}/photos/${obs.photo_ids[0]}`}
          alt=""
          className="w-16 h-16 rounded-xl object-cover shrink-0"
          onError={() => onFailPhoto(obs.observation_id)}
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-slate-900 truncate text-base leading-snug">
            {obs.title ?? (obs.status === 'Raw' ? 'Pending AI analysis' : 'Untitled')}
          </p>
          <span className="text-xs text-slate-300 shrink-0 mt-0.5">#{totalCount - obsNumber + 1}</span>
        </div>
        {obs.status === 'Raw' && (obs.text_description || obs.audio_transcript) && (
          <p className="text-sm text-slate-400 mt-0.5 line-clamp-2 leading-snug">
            {obs.text_description ?? obs.audio_transcript}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {obs.room_or_area && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{obs.room_or_area}</span>}
          {obs.system && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{obs.system}</span>}
          {obs.severity && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityColors[obs.severity] ?? 'bg-slate-100 text-slate-500'}`}>{obs.severity}</span>}
          {obs.safety_related && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">⚠ Safety</span>}
          {obs.status && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[obs.status] ?? 'bg-slate-100 text-slate-500'}`}>{obs.status}</span>}
        </div>
      </div>

      <div className="flex items-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>
    </div>
  )
}
