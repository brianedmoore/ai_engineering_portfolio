import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../api'
import Header from '../components/Header'

type ObsSummary = {
  observation_id: string
  title: string | null
  room_or_area: string | null
  system: string | null
  severity: string | null
  safety_related: boolean | null
  photo_ids: number[] | null
}

const severityColors: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
}

export default function ListPage() {
  const navigate = useNavigate()
  const [observations, setObservations] = useState<ObsSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/observations?status=Approved`)
      .then(r => r.json())
      .then(data => { setObservations(data); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium">
          ← New observation
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Approved Observations</h1>
          {!loading && (
            <p className="text-slate-400 mt-1 text-sm">{observations.length} observation{observations.length !== 1 ? 's' : ''} total</p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-base">No approved observations yet.</p>
            <button onClick={() => navigate('/')} className="mt-4 text-blue-600 font-semibold text-sm">
              Start your first observation →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {observations.map((obs, idx) => (
              <div
                key={obs.observation_id}
                onClick={() => navigate(`/review/${obs.observation_id}`)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform"
              >
                {/* Photo or placeholder */}
                {obs.photo_ids && obs.photo_ids.length > 0 ? (
                  <img
                    src={`${API_URL}/observations/${obs.observation_id}/photos/${obs.photo_ids[0]}`}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </div>
    </div>
  )
}
