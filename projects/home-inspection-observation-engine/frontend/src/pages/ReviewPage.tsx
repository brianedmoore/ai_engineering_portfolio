import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

type Observation = {
  observation_id: string
  status: string
  title: string | null
  room_or_area: string | null
  system: string | null
  component: string | null
  defect_type: string | null
  severity: string | null
  safety_related: boolean | null
  professional_report_description: string | null
  plain_english_summary: string | null
  recommended_action: string | null
  responsible_professional: string | null
  estimated_cost_range: string | null
  confidence: number
  needs_human_review: boolean
  missing_information: string[] | null
  source_input_type: string | null
}

const severityColors: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
}

export default function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [obs, setObs] = useState<Observation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`http://localhost:8000/observations/${id}`)
      .then(r => r.json())
      .then(data => { setObs(data); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading observation...</p>
      </div>
    )
  }

  if (!obs) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Observation not found.</p>
      </div>
    )
  }

  const severityColor = severityColors[obs.severity ?? ''] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <button
          onClick={() => navigate('/')}
          className="text-sm text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500"
        >
          ← New observation
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{obs.title ?? 'Untitled'}</h1>
          <div className="flex flex-wrap gap-2">
            {obs.room_or_area && <Chip>{obs.room_or_area}</Chip>}
            {obs.system && <Chip>{obs.system}</Chip>}
            {obs.severity && <span className={`text-xs font-bold px-3 py-1 rounded-full ${severityColor}`}>{obs.severity} Severity</span>}
            {obs.safety_related && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">⚠ Safety Issue</span>}
          </div>
        </div>

        <div className="flex flex-col gap-4">

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Summary</p>
            <p className="text-sm text-gray-800 leading-relaxed">{obs.plain_english_summary ?? '—'}</p>
          </div>

          {/* Professional Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Professional Description</p>
            <p className="text-sm text-gray-800 leading-relaxed">{obs.professional_report_description ?? '—'}</p>
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Details</p>
            <div className="flex flex-col gap-3">
              <Field label="Component" value={obs.component} />
              <Field label="Defect Type" value={obs.defect_type} />
              <Field label="Recommended Action" value={obs.recommended_action} />
              <Field label="Responsible Professional" value={obs.responsible_professional} />
              <Field label="Estimated Cost" value={obs.estimated_cost_range} />
            </div>
          </div>

          {/* AI Assessment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI Assessment</p>
            <div className="flex flex-col gap-3">
              <Field label="Confidence" value={`${Math.round(obs.confidence * 100)}%`} />
              <Field label="Needs Human Review" value={obs.needs_human_review ? 'Yes' : 'No'} />
              <Field label="Input Type" value={obs.source_input_type} />
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button className="w-full py-3 rounded-2xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer">
            Approve Observation
          </button>
          <button className="w-full py-3 rounded-2xl text-sm font-semibold border border-red-300 text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
            Reject
          </button>
        </div>

      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{children}</span>
  )
}