import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../api'
import Header from '../components/Header'

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
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('bad_photo')
  const [rejectNotes, setRejectNotes] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [flashingField, setFlashingField] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/observations/${id}`)
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
    try {
      await fetch(`${API_URL}/observations/${obs.observation_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editingField]: value }),
      })
      setObs({ ...obs, [editingField]: value } as Observation)
      setEditedFields(prev => new Set([...prev, editingField]))
      setFlashingField(editingField)
      setTimeout(() => setFlashingField(null), 1200)
      setEditingField(null)
    } catch {
      setError('Failed to save field. Please try again.')
    }
  }

  function cancelEdit() {
    setEditingField(null)
  }

  async function handleApprove() {
    if (!obs) return
    setIsApproving(true)
    try {
      await fetch(`${API_URL}/observations/${obs.observation_id}/approve`, {
        method: 'POST',
      })
      navigate('/')
    } catch {
      setError('Failed to approve. Please try again.')
      setIsApproving(false)
    }
  }

  async function handleReject() {
    if (!obs) return
    setIsRejecting(true)
    const params = new URLSearchParams({ reason: rejectReason })
    if (rejectNotes.trim()) params.append('notes', rejectNotes.trim())
    try {
      await fetch(`${API_URL}/observations/${obs.observation_id}/reject?${params}`, {
        method: 'POST',
      })
      navigate('/')
    } catch {
      setError('Failed to reject. Please try again.')
      setIsRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite">
        <Header />
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400 text-base">Loading observation...</p>
        </div>
      </div>
    )
  }

  if (!obs) {
    return (
      <div className="min-h-screen bg-offwhite">
        <Header />
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400 text-base">Observation not found.</p>
        </div>
      </div>
    )
  }

  const severityColor = severityColors[obs.severity ?? ''] ?? 'bg-gray-100 text-gray-700'
  const ep = { editingField, editValue, onStartEdit: startEdit, onSave: saveEdit, onCancel: cancelEdit, onChange: setEditValue, flashingField, editedFields }

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">

        <button onClick={() => navigate('/')} className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium">
          ← New observation
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-base">
            {error}
          </div>
        )}

        {obs.missing_information && obs.missing_information.length > 0 && (
          <div
            className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-5 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-red-700 font-bold text-base">
                {obs.missing_information.length} field{obs.missing_information.length > 1 ? 's' : ''} need your attention
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {obs.missing_information.map((item, i) => (
                <p key={i} className="text-red-600 text-sm leading-relaxed pl-1">• {item} — Please fill this in manually.</p>
              ))}
            </div>
            <p className="text-red-400 text-sm font-semibold mt-3">Tap to review fields ↓</p>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">{obs.title ?? 'Untitled'}</h1>
          <div className="flex flex-wrap gap-2">
            {obs.room_or_area && <Chip>{obs.room_or_area}</Chip>}
            {obs.system && <Chip>{obs.system}</Chip>}
            {obs.severity && <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${severityColor}`}>{obs.severity} Severity</span>}
            {obs.safety_related && <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">⚠ Safety Issue</span>}
          </div>
        </div>

        <div className="flex flex-col gap-4">

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Summary</p>
            <TextBlock value={obs.plain_english_summary} fieldKey="plain_english_summary" {...ep} />
          </div>

          {/* Professional Description */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Description</p>
            <TextBlock value={obs.professional_report_description} fieldKey="professional_report_description" {...ep} />
          </div>

          {/* Details — all patchable fields */}
          <div ref={detailsRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Details</p>
            <div className="flex flex-col divide-y divide-slate-50">
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">AI Assessment</p>
            <div className="flex flex-col divide-y divide-slate-50">
              <Row label="Confidence"         value={`${Math.round(obs.confidence * 100)}%`} />
              <Row label="Needs Human Review" value={obs.needs_human_review ? 'Yes' : 'No'} />
              <Row label="Input Type"         value={formatInputType(obs.source_input_type)} />
              <Row label="Status"             value={obs.status} />
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] cursor-pointer disabled:opacity-40 shadow-md"
            style={{ backgroundColor: '#2C5F2E' }}
          >
            {isApproving ? 'Approving...' : 'Approve Observation'}
          </button>
          {showRejectForm ? (
            <div className="bg-white rounded-2xl border border-red-100 p-5 flex flex-col gap-4 shadow-sm">
              <p className="text-base font-semibold text-slate-800">Reason for rejection</p>
              <select
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full text-base text-slate-800 border border-slate-200 rounded-xl p-3 outline-none bg-white"
              >
                <option value="bad_photo">Bad photo</option>
                <option value="bad_audio">Bad audio</option>
                <option value="bad_text">Bad text</option>
                <option value="duplicate">Duplicate</option>
                <option value="other">Other</option>
              </select>
              {rejectReason === 'other' && (
                <textarea
                  rows={3}
                  placeholder="Describe the reason..."
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  className="w-full text-base text-slate-800 border border-slate-200 rounded-xl p-3 resize-none outline-none"
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-3 rounded-xl text-base text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || (rejectReason === 'other' && !rejectNotes.trim())}
                  className="flex-1 py-3 rounded-xl text-base font-bold bg-red-500 text-white hover:bg-red-400 disabled:opacity-40"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRejectForm(true)}
              className="w-full py-4 rounded-2xl text-base font-bold border-2 border-red-300 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Reject
            </button>
          )}
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
  flashingField: string | null
  editedFields: Set<string>
}

function TextBlock({ value, fieldKey, editingField, editValue, onStartEdit, onSave, onCancel, onChange, flashingField, editedFields }: { value: string | null | undefined; fieldKey: string } & EditProps) {
  const isEditing = editingField === fieldKey
  const isFlashing = flashingField === fieldKey
  const wasEdited = editedFields.has(fieldKey)
  if (isEditing) {
    return (
      <div className="flex flex-col gap-3">
        <textarea rows={4} value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-base text-slate-800 border border-blue-300 rounded-xl p-3 resize-none outline-none leading-relaxed" autoFocus />
        <EditActions onSave={onSave} onCancel={onCancel} />
      </div>
    )
  }
  return (
    <div className={`-m-2 p-2 rounded-xl transition-colors duration-700 ${isFlashing ? 'bg-green-100' : wasEdited ? 'bg-green-50' : 'bg-transparent'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base text-slate-800 leading-relaxed">{value ?? '—'}</p>
        <button onClick={() => onStartEdit(fieldKey, value ?? null)} className="text-slate-300 hover:text-blue-500 shrink-0 text-lg mt-0.5">✏</button>
      </div>
    </div>
  )
}

function EditableRow({ label, value, fieldKey, type = 'text', multiline = false, options = [], editingField, editValue, onStartEdit, onSave, onCancel, onChange, flashingField, editedFields }: {
  label: string; value: string | null | undefined; fieldKey: string; type?: 'text' | 'select'; multiline?: boolean; options?: string[]
} & EditProps) {
  const isEditing = editingField === fieldKey
  const isFlashing = flashingField === fieldKey
  const wasEdited = editedFields.has(fieldKey)
  return (
    <div className={`py-3.5 first:pt-0 last:pb-0 -mx-2 px-2 rounded-xl transition-colors duration-700 ${isFlashing ? 'bg-green-100' : wasEdited ? 'bg-green-50' : 'bg-transparent'}`}>
      <div className="flex justify-between items-start gap-3">
        <span className="text-sm text-slate-400 shrink-0 mt-0.5 font-medium">{label}</span>
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2">
            {type === 'select' ? (
              <select value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-base text-slate-800 border border-blue-300 rounded-xl p-2.5 outline-none bg-white">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : multiline ? (
              <textarea rows={3} value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-base text-slate-800 border border-blue-300 rounded-xl p-2.5 resize-none outline-none" autoFocus />
            ) : (
              <input type="text" value={editValue} onChange={e => onChange(e.target.value)} className="w-full text-base text-slate-800 border border-blue-300 rounded-xl p-2.5 outline-none" autoFocus />
            )}
            <EditActions onSave={onSave} onCancel={onCancel} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base text-slate-800 text-right">{value ?? '—'}</span>
            <button onClick={() => onStartEdit(fieldKey, value ?? null)} className="text-slate-300 hover:text-blue-500 text-lg">✏</button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatInputType(value: string | null | undefined): string {
  if (!value) return '—'
  const map: Record<string, string> = {
    photo_only: 'Photo only',
    text_only: 'Text only',
    photo_and_text: 'Photo + Text',
    photo_and_audio: 'Photo + Audio',
  }
  return map[value] ?? value
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-start gap-3">
      <span className="text-sm text-slate-400 shrink-0 font-medium">{label}</span>
      <span className="text-base text-slate-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="bg-slate-100 text-slate-600 text-sm font-medium px-3 py-1.5 rounded-full">{children}</span>
}

function EditActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-4 justify-end">
      <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
      <button onClick={onSave} className="text-sm text-blue-600 font-bold hover:text-blue-500">Save</button>
    </div>
  )
}
