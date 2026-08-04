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

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High']
const SYSTEM_OPTIONS = ['Roofing', 'Exterior', 'Structure', 'Electrical', 'Plumbing', 'HVAC', 'Interior', 'Insulation and Ventilation', 'Appliances', 'Site and Grounds', 'Garage', 'Other']
const RESPONSIBLE_OPTIONS = ['Homeowner/DIY', 'Handyman', 'Plumber', 'Electrician', 'HVAC Technician', 'Roofer', 'Structural Engineer', 'Foundation Contractor', 'General Contractor', 'Appliance Technician', 'Pest Control Professional', 'Mold/Water Mitigation Professional', 'Qualified Specialist', 'Further Evaluation Recommended']
const COST_OPTIONS = ['$0-$100', '$100-$300', '$300-$750', '$750-$2,500', '$2,500+', 'Unknown']
const BOOL_OPTIONS = ['Yes', 'No']

export default function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [obs, setObs] = useState<Observation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    fetch(`http://localhost:8000/observations/${id}`)
      .then(r => r.json())
      .then(data => { setObs(data); setLoading(false) })
  }, [id])

  function startEdit(field: string, currentValue: string | boolean | null) {
    setEditingField(field)
    if (typeof currentValue === 'boolean') {
      setEditValue(currentValue ? 'Yes' : 'No')
    } else {
      setEditValue(currentValue ?? '')
    }
  }

  async function saveEdit() {
    if (!editingField || !obs) return
    const value: string | boolean | null =
      editingField === 'safety_related' ? editValue === 'Yes' : editValue || null
    await fetch(`http://localhost:8000/observations/${obs.observation_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [editingField]: value }),
    })
    setObs({ ...obs, [editingField]: value } as Observation)
    setEditingField(null)
  }

  function cancelEdit() {
    setEditingField(null)
  }

  async function handleApprove() {
    if (!obs) return
    setIsApproving(true)
    await fetch(`http://localhost:8000/observations/${obs.observation_id}/approve`, {
      method: 'POST',
    })
    setObs({ ...obs, status: 'Approved' })
    setIsApproving(false)
  }

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
  const ep = { editingField, editValue, onStartEdit: startEdit, onSave: saveEdit, onCancel: cancelEdit, onChange: setEditValue }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <button onClick={() => navigate('/')} className="text-sm text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500">
          ← New observation
        </button>

        {/* Header — reflects live obs state, updates when fields are saved */}
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
            <TextBlock value={obs.plain_english_summary} fieldKey="plain_english_summary" {...ep} />
          </div>

          {/* Professional Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Professional Description</p>
            <TextBlock value={obs.professional_report_description} fieldKey="professional_report_description" {...ep} />
          </div>

          {/* Details — all patchable fields */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Details</p>
            <div className="flex flex-col divide-y divide-gray-50">
              <EditableRow label="Title"                    value={obs.title}                   fieldKey="title"                    {...ep} />
              <EditableRow label="Room / Area"              value={obs.room_or_area}             fieldKey="room_or_area"             {...ep} />
              <EditableRow label="System"                   value={obs.system}                   fieldKey="system"        type="select" options={SYSTEM_OPTIONS}      {...ep} />
              <EditableRow label="Component"                value={obs.component}                fieldKey="component"                {...ep} />
              <EditableRow label="Defect Type"              value={obs.defect_type}              fieldKey="defect_type"              {...ep} />
              <EditableRow label="Severity"                 value={obs.severity}                 fieldKey="severity"      type="select" options={SEVERITY_OPTIONS}     {...ep} />
              <EditableRow label="Safety Issue"             value={obs.safety_related === null ? null : obs.safety_related ? 'Yes' : 'No'} fieldKey="safety_related" type="select" options={BOOL_OPTIONS} {...ep} />
              <EditableRow label="Recommended Action"       value={obs.recommended_action}       fieldKey="recommended_action"       multiline {...ep} />
              <EditableRow label="Responsible Professional" value={obs.responsible_professional} fieldKey="responsible_professional" type="select" options={RESPONSIBLE_OPTIONS} {...ep} />
              <EditableRow label="Estimated Cost"           value={obs.estimated_cost_range}     fieldKey="estimated_cost_range"    type="select" options={COST_OPTIONS} {...ep} />
            </div>
          </div>

          {/* AI Assessment — read only */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI Assessment</p>
            <div className="flex flex-col divide-y divide-gray-50">
              <Row label="Confidence"         value={`${Math.round(obs.confidence * 100)}%`} />
              <Row label="Needs Human Review" value={obs.needs_human_review ? 'Yes' : 'No'} />
              <Row label="Input Type"         value={obs.source_input_type} />
              <Row label="Status"             value={obs.status} />
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          {obs.status === 'Approved' ? (
            <div className="flex flex-col gap-3">
              <div className="w-full py-3 rounded-2xl text-sm font-semibold bg-green-100 text-green-700 text-center">
                ✓ Observation Approved
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-2xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Start Next Observation
              </button>
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full py-3 rounded-2xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-40"
            >
              {isApproving ? 'Approving...' : 'Approve Observation'}
            </button>
          )}
          <button className="w-full py-3 rounded-2xl text-sm font-semibold border border-red-300 text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
            Reject
          </button>
        </div>

      </div>
    </div>
  )
}

type EditProps = {
  editingField: string | null
  editValue: string
  onStartEdit: (field: string, value: string | boolean | null) => void
  onSave: () => void
  onCancel: () => void
  onChange: (value: string) => void
}

function TextBlock({ value, fieldKey, editingField, editValue, onStartEdit, onSave, onCancel, onChange }: { value: string | null | undefined; fieldKey: string } & EditProps) {
  const isEditing = editingField === fieldKey
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea rows={4} value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-sm text-gray-800 border border-blue-300 rounded-lg p-2 resize-none outline-none" autoFocus />
        <EditActions onSave={onSave} onCancel={onCancel} />
      </div>
    )
  }
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm text-gray-800 leading-relaxed">{value ?? '—'}</p>
      <button onClick={() => onStartEdit(fieldKey, value ?? null)} className="text-gray-300 hover:text-blue-400 shrink-0 text-base">✏</button>
    </div>
  )
}

function EditableRow({ label, value, fieldKey, type = 'text', multiline = false, options = [], editingField, editValue, onStartEdit, onSave, onCancel, onChange }: {
  label: string; value: string | null | undefined; fieldKey: string; type?: 'text' | 'select'; multiline?: boolean; options?: string[]
} & EditProps) {
  const isEditing = editingField === fieldKey
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex justify-between items-start gap-3">
        <span className="text-xs text-gray-400 shrink-0 mt-1">{label}</span>
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2">
            {type === 'select' ? (
              <select value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-sm text-gray-800 border border-blue-300 rounded-lg p-2 outline-none bg-white">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : multiline ? (
              <textarea rows={3} value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-sm text-gray-800 border border-blue-300 rounded-lg p-2 resize-none outline-none" autoFocus />
            ) : (
              <input type="text" value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-sm text-gray-800 border border-blue-300 rounded-lg p-2 outline-none" autoFocus />
            )}
            <EditActions onSave={onSave} onCancel={onCancel} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-800 text-right">{value ?? '—'}</span>
            <button onClick={() => onStartEdit(fieldKey, value ?? null)} className="text-gray-300 hover:text-blue-400 text-base">✏</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0 flex justify-between items-start gap-3">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{children}</span>
}

function EditActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-3 justify-end">
      <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      <button onClick={onSave} className="text-xs text-blue-600 font-semibold hover:text-blue-500">Save</button>
    </div>
  )
}
