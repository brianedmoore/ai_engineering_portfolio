import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
  photo_ids: number[] | null
  image_descriptions: string[] | null
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
  const location = useLocation()
  const fromList = (location.state as { from?: string } | null)?.from === 'list'
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
  const [photoFullscreen, setPhotoFullscreen] = useState(false)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [dragDelta, setDragDelta] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<number>>(new Set())
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [flashingField, setFlashingField] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)
  const [localMissingInfo, setLocalMissingInfo] = useState<string[]>([])

  useEffect(() => {
    fetch(`${API_URL}/observations/${id}`)
      .then(r => r.json())
      .then(data => { setObs(data); setLoading(false) })
  }, [id])

  useEffect(() => {
    setLocalMissingInfo(obs?.missing_information ?? [])
  }, [obs?.observation_id])

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
      if (value) {
        const fieldKeywords: Record<string, string[]> = {
          plain_english_summary: ['summary', 'description', 'transcript'],
          professional_report_description: ['description', 'professional', 'report'],
          title: ['title'],
          room_or_area: ['room', 'area', 'location'],
          component: ['component'],
          defect_type: ['defect'],
          recommended_action: ['action', 'recommend'],
          responsible_professional: ['professional'],
          estimated_cost_range: ['cost'],
        }
        const keywords = fieldKeywords[editingField] ?? []
        if (keywords.length > 0) {
          setLocalMissingInfo(prev =>
            prev.filter(item => !keywords.some(k => item.toLowerCase().includes(k)))
          )
        }
      }
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
      navigate(fromList ? '/list' : '/')
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
      navigate(fromList ? '/list' : '/')
    } catch {
      setError('Failed to reject. Please try again.')
      setIsRejecting(false)
    }
  }

  function handleCarouselTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  function handleCarouselTouchMove(e: React.TouchEvent) {
    if (touchStartX === null) return
    setDragDelta(e.touches[0].clientX - touchStartX)
  }

  function handleCarouselTouchEnd() {
    if (obs?.photo_ids && Math.abs(dragDelta) > 50) {
      if (dragDelta < 0 && activePhotoIndex < obs.photo_ids.length - 1) {
        setActivePhotoIndex(p => p + 1)
      } else if (dragDelta > 0 && activePhotoIndex > 0) {
        setActivePhotoIndex(p => p - 1)
      }
    }
    setDragDelta(0)
    setIsDragging(false)
    setTouchStartX(null)
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
  const isAlreadyApproved = obs.status === 'Approved'
  const showActions = !isAlreadyApproved || editedFields.size > 0

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />

      {/* Fullscreen photo overlay */}
      {photoFullscreen && obs.photo_ids && obs.photo_ids.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex justify-end px-5 pt-5 pb-2 shrink-0">
            <button
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={() => setPhotoFullscreen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div
            className="flex-1 relative overflow-hidden"
            onTouchStart={handleCarouselTouchStart}
            onTouchMove={handleCarouselTouchMove}
            onTouchEnd={handleCarouselTouchEnd}
          >
            {obs.photo_ids.map((photoId, i) => (
              <div
                key={photoId}
                className="absolute inset-0 flex items-center justify-center p-4"
                style={{
                  transform: `translateX(calc(${(i - activePhotoIndex) * 100}% + ${dragDelta}px))`,
                  transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              >
                <img
                  src={`${API_URL}/observations/${obs.observation_id}/photos/${photoId}`}
                  alt={`Photo ${i + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ))}
          </div>
          <div className="px-5 py-5 shrink-0">
            {obs.photo_ids.length > 1 && (
              <div className="flex justify-center gap-2 mb-3">
                {obs.photo_ids.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoIndex(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === activePhotoIndex ? '20px' : '8px',
                      height: '8px',
                      backgroundColor: i === activePhotoIndex ? 'white' : 'rgba(255,255,255,0.35)',
                    }}
                  />
                ))}
              </div>
            )}
            {obs.image_descriptions?.[activePhotoIndex] && (
              <p className="text-white/60 text-sm text-center leading-relaxed mb-3">
                {obs.image_descriptions[activePhotoIndex]}
              </p>
            )}
            <button
              className="w-full text-white/40 text-sm py-2 active:text-white/80 transition-colors"
              onClick={() => setPhotoFullscreen(false)}
            >
              Tap to close
            </button>
          </div>
        </div>
      )}

      <div className={`max-w-lg mx-auto px-4 py-8 ${showActions ? (showRejectForm ? 'pb-96' : 'pb-44') : 'pb-8'}`}>

        <button onClick={() => navigate(fromList ? '/list' : '/')} className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium">
          {fromList ? '← Back to list' : '← New observation'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-base">
            {error}
          </div>
        )}

        {localMissingInfo.length > 0 && (
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
              <p className="text-red-700 font-bold text-base flex-1">
                {localMissingInfo.length} field{localMissingInfo.length > 1 ? 's' : ''} need your attention
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {localMissingInfo.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <p className="text-red-600 text-sm leading-relaxed pl-1 flex-1">• {item}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocalMissingInfo(prev => prev.filter((_, j) => j !== i)) }}
                    className="text-red-300 hover:text-red-500 shrink-0 mt-0.5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-red-400 text-sm font-semibold mt-3">Tap to review fields ↓</p>
          </div>
        )}

        {obs.photo_ids && obs.photo_ids.length > 0 && (
          <div className="mb-6">
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{ aspectRatio: '4/3' }}
              onTouchStart={handleCarouselTouchStart}
              onTouchMove={handleCarouselTouchMove}
              onTouchEnd={handleCarouselTouchEnd}
            >
              {obs.photo_ids.map((photoId, i) => (
                <div
                  key={photoId}
                  className="absolute inset-0"
                  style={{
                    transform: `translateX(calc(${(i - activePhotoIndex) * 100}% + ${dragDelta}px))`,
                    transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                >
                  {!failedPhotoIds.has(photoId) ? (
                    <img
                      src={`${API_URL}/observations/${obs.observation_id}/photos/${photoId}`}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover cursor-pointer active:opacity-90 transition-opacity"
                      onClick={() => setPhotoFullscreen(true)}
                      onError={() => setFailedPhotoIds(prev => new Set(prev).add(photoId))}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <p className="text-slate-400 text-sm">Photo unavailable</p>
                    </div>
                  )}
                </div>
              ))}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 cursor-pointer"
                onClick={() => setPhotoFullscreen(true)}
              >
                {obs.photo_ids.length > 1 && (
                  <div className="flex justify-center gap-2 mb-2">
                    {obs.photo_ids.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(i) }}
                        className="rounded-full transition-all duration-200"
                        style={{
                          width: i === activePhotoIndex ? '20px' : '8px',
                          height: '8px',
                          backgroundColor: i === activePhotoIndex ? 'white' : 'rgba(255,255,255,0.45)',
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                  <span className="text-white text-sm font-semibold">
                    {obs.photo_ids.length > 1 ? `Photo ${activePhotoIndex + 1} of ${obs.photo_ids.length} · Tap to expand` : 'Tap to view full screen'}
                  </span>
                </div>
              </div>
            </div>
            {obs.image_descriptions?.[activePhotoIndex] && (
              <p className="text-xs text-slate-400 mt-2 px-1 leading-relaxed line-clamp-2 italic">
                {obs.image_descriptions[activePhotoIndex]}
              </p>
            )}
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
              <ConfidenceBar value={obs.confidence} />
              <Row label="Needs Human Review" value={obs.needs_human_review ? 'Yes' : 'No'} />
              <Row label="Input Type"         value={formatInputType(obs.source_input_type)} />
              <Row label="Status"             value={obs.status} />
            </div>
          </div>

        </div>

      </div>

      {/* Sticky approve / reject bar — hidden when already approved with no edits */}
      {showActions && <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-100" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">
          {isAlreadyApproved && editedFields.size > 0 && (
            <p className="text-center text-xs text-slate-400 font-medium -mb-1">You made edits — re-approve to confirm</p>
          )}
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] cursor-pointer disabled:opacity-40 shadow-md"
            style={{ backgroundColor: '#2C5F2E' }}
          >
            {isApproving ? 'Approving...' : isAlreadyApproved && editedFields.size > 0 ? 'Re-approve' : 'Approve Observation'}
          </button>
          {showRejectForm ? (
            <div className="bg-slate-50 rounded-2xl border border-red-100 p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-800">Reason for rejection</p>
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
                  rows={2}
                  placeholder="Describe the reason..."
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  className="w-full text-base text-slate-800 border border-slate-200 rounded-xl p-3 resize-none outline-none"
                />
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowRejectForm(false)} className="flex-1 py-3 rounded-xl text-base text-slate-400 hover:text-slate-600">
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
      </div>}
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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#2C5F2E' : pct >= 55 ? '#d97706' : '#ef4444'
  const label = pct >= 80 ? 'High' : pct >= 55 ? 'Medium' : 'Low'
  return (
    <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-400 font-medium">AI Confidence</span>
        <span className="text-sm font-bold" style={{ color }}>{label} · {pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.8s ease-out' }} />
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
