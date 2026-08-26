import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !token) return
    let objectUrl: string | null = null

    fetch(`${API}/inspections/${id}/report.html`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        if (!r.ok) throw new Error(`${r.status}`)
        const html = await r.text()
        const blob = new Blob([html], { type: 'text/html' })
        objectUrl = URL.createObjectURL(blob)
        setReportUrl(objectUrl)
      })
      .catch(err => setError(`Failed to load report. ${err.message}`))
      .finally(() => setLoading(false))

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [id, token])

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => navigate(`/inspections/${id}`)}
          className="flex items-center gap-1.5 text-base text-blue-600 font-medium hover:text-blue-500"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Back
        </button>

        <span className="text-sm font-bold text-slate-700 tracking-wide">Inspection Report</span>

        <button
          onClick={handlePrint}
          disabled={!reportUrl}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ backgroundColor: '#2563EB' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          Download PDF
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
          <p className="text-slate-500 font-medium">Building your report…</p>
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-slate-700 font-semibold">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="text-blue-600 font-semibold text-sm hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      )}

      {reportUrl && (
        <iframe
          ref={iframeRef}
          src={reportUrl}
          className="flex-1 w-full border-0"
          title="Inspection Report"
        />
      )}
    </div>
  )
}
