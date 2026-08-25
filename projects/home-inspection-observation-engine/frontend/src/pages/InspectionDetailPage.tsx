import { useEffect, useRef, useState } from 'react'
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
  notes: string | null
  created_at: string | null
  has_front_of_house_photo: boolean
  // System descriptors
  roof_material: string | null
  roof_estimated_age_years: number | null
  roof_layers: string | null
  hvac_system_type: string | null
  hvac_fuel_type: string | null
  hvac_estimated_age_years: number | null
  hvac_filter_condition: string | null
  water_heater_fuel_type: string | null
  water_heater_estimated_age_years: number | null
  water_heater_capacity_gallons: number | null
  electrical_panel_amperage: string | null
  electrical_panel_manufacturer: string | null
  electrical_wiring_type: string | null
  electrical_gfci_present: boolean | null
  foundation_type: string | null
  foundation_material: string | null
  plumbing_supply_material: string | null
  plumbing_drain_material: string | null
  plumbing_water_pressure_psi: number | null
  exterior_siding_material: string | null
  exterior_driveway_material: string | null
  system_profile_sources: Record<string, string> | null
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

type NotInspectedObs = {
  id: string
  system: string | null
  room_or_area: string | null
  component: string | null
  reason: string | null
  description: string | null
}

type QueueState = {
  current: number
  total: number
  label: string
  done: boolean
  itemDone: boolean
  itemKey: number
  firstReadyId: string | null
}

const SYSTEM_PROFILE_CONFIG = [
  { system: 'roof', label: 'Roof', fields: [
    { key: 'roof_material', label: 'Material', type: 'enum', options: ['Asphalt Shingle','Architectural Shingle','Metal','Tile','Wood Shake','Flat / TPO','Flat / Modified Bitumen','Built-Up','Other'] },
    { key: 'roof_estimated_age_years', label: 'Estimated Age', type: 'number', unit: 'years' },
    { key: 'roof_layers', label: 'Layers', type: 'enum', options: ['1','2','3+'] },
  ]},
  { system: 'hvac', label: 'HVAC', fields: [
    { key: 'hvac_system_type', label: 'System Type', type: 'enum', options: ['Forced Air','Heat Pump','Radiant / Hydronic','Mini-Split','Window Units','Evaporative Cooler','Other'] },
    { key: 'hvac_fuel_type', label: 'Fuel Type', type: 'enum', options: ['Natural Gas','Electric','Propane','Oil','Other'] },
    { key: 'hvac_estimated_age_years', label: 'Estimated Age', type: 'number', unit: 'years' },
    { key: 'hvac_filter_condition', label: 'Filter Condition', type: 'enum', options: ['Clean','Dirty','Missing','Not Accessible'] },
  ]},
  { system: 'water_heater', label: 'Water Heater', fields: [
    { key: 'water_heater_fuel_type', label: 'Fuel / Type', type: 'enum', options: ['Natural Gas','Electric','Propane','Tankless - Gas','Tankless - Electric','Heat Pump','Solar','Other'] },
    { key: 'water_heater_estimated_age_years', label: 'Estimated Age', type: 'number', unit: 'years' },
    { key: 'water_heater_capacity_gallons', label: 'Tank Capacity', type: 'number', unit: 'gallons' },
  ]},
  { system: 'electrical', label: 'Electrical', fields: [
    { key: 'electrical_panel_amperage', label: 'Panel Amperage', type: 'enum', options: ['60A','100A','150A','200A','400A','Unknown'] },
    { key: 'electrical_panel_manufacturer', label: 'Panel Manufacturer', type: 'string' },
    { key: 'electrical_wiring_type', label: 'Wiring Type', type: 'enum', options: ['Copper','Aluminum (pre-1972)','Aluminum (modern)','Knob & Tube','Mixed'] },
    { key: 'electrical_gfci_present', label: 'GFCI Present', type: 'boolean' },
  ]},
  { system: 'foundation', label: 'Foundation', fields: [
    { key: 'foundation_type', label: 'Foundation Type', type: 'enum', options: ['Slab','Crawl Space','Full Basement','Partial Basement','Pier & Beam','Other'] },
    { key: 'foundation_material', label: 'Material', type: 'enum', options: ['Poured Concrete','Concrete Block','Brick','Stone','Treated Wood','Other'] },
  ]},
  { system: 'plumbing', label: 'Plumbing', fields: [
    { key: 'plumbing_supply_material', label: 'Supply Pipe', type: 'enum', options: ['Copper','PEX','CPVC','Galvanized Steel','Polybutylene','Mixed'] },
    { key: 'plumbing_drain_material', label: 'Drain Pipe', type: 'enum', options: ['ABS','PVC','Cast Iron','Galvanized','Mixed'] },
    { key: 'plumbing_water_pressure_psi', label: 'Water Pressure', type: 'number', unit: 'PSI' },
  ]},
  { system: 'exterior', label: 'Exterior', fields: [
    { key: 'exterior_siding_material', label: 'Siding', type: 'enum', options: ['Vinyl','Fiber Cement','Wood','Brick','Stucco','EIFS / Synthetic Stucco','Stone','Metal','Other'] },
    { key: 'exterior_driveway_material', label: 'Driveway', type: 'enum', options: ['Concrete','Asphalt','Gravel','Paver','Other'] },
  ]},
] as const

const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: 'roof_material', label: 'Roof material' },
  { key: 'hvac_system_type', label: 'HVAC system type' },
  { key: 'hvac_fuel_type', label: 'HVAC fuel type' },
  { key: 'water_heater_fuel_type', label: 'Water heater fuel/type' },
  { key: 'electrical_panel_amperage', label: 'Electrical panel amperage' },
  { key: 'foundation_type', label: 'Foundation type' },
  { key: 'plumbing_supply_material', label: 'Plumbing supply material' },
]

const REASON_LABELS: Record<string, string> = {
  access_blocked: 'Access Blocked',
  access_locked: 'Access Locked',
  concealed_materials: 'Concealed',
  concealed_property: 'Concealed',
  safety_electrical: 'Safety Hazard',
  safety_structural: 'Safety Hazard',
  safety_environmental: 'Safety Hazard',
  conditions_seasonal: 'Seasonal',
  conditions_inoperable: 'Inoperable',
  scope_excluded: 'Out of Scope',
  scope_specialist: 'Specialist Required',
  demolished: 'Demolished',
}

const REASON_COLORS: Record<string, string> = {
  access_blocked: 'bg-amber-100 text-amber-700',
  access_locked: 'bg-amber-100 text-amber-700',
  concealed_materials: 'bg-slate-100 text-slate-600',
  concealed_property: 'bg-slate-100 text-slate-600',
  safety_electrical: 'bg-red-100 text-red-600',
  safety_structural: 'bg-red-100 text-red-600',
  safety_environmental: 'bg-red-100 text-red-600',
  conditions_seasonal: 'bg-blue-100 text-blue-600',
  conditions_inoperable: 'bg-blue-100 text-blue-600',
  scope_excluded: 'bg-purple-100 text-purple-600',
  scope_specialist: 'bg-purple-100 text-purple-600',
  demolished: 'bg-gray-100 text-gray-500',
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
  const [notInspected, setNotInspected] = useState<NotInspectedObs[]>([])
  const [notInspectedExpanded, setNotInspectedExpanded] = useState(true)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [profileEditMode, setProfileEditMode] = useState(false)
  const [profileDraft, setProfileDraft] = useState<Record<string, string | number | boolean>>({})
  const [profileSaving, setProfileSaving] = useState(false)

  const [frontOfHouseUrl, setFrontOfHouseUrl] = useState<string | null>(null)
  const frontOfHouseInputRef = useRef<HTMLInputElement>(null)

  const [detailsEditMode, setDetailsEditMode] = useState(false)
  const [addressDraft, setAddressDraft] = useState('')
  const [clientNameDraft, setClientNameDraft] = useState('')
  const [propertyTypeDraft, setPropertyTypeDraft] = useState('')
  const [inspectionDateDraft, setInspectionDateDraft] = useState('')
  const [notesDraft, setNotesDraft] = useState('')
  const [detailsSaving, setDetailsSaving] = useState(false)

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
      fetch(`${API}/inspections/${id}/not-inspected`).then(r => r.json()),
    ])
      .then(([inspectionData, observationsData, niData]) => {
        setInspection(inspectionData)
        setObservations([...observationsData].reverse())
        setNotInspected(niData)
        setLoading(false)
        if (inspectionData.has_front_of_house_photo) {
          fetch(`${API}/inspections/${id}/front-of-house-photo`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.blob())
            .then(b => setFrontOfHouseUrl(URL.createObjectURL(b)))
            .catch(() => {})
        }
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
      setQueueProcessing({ current: i + 1, total: toProcess.length, label, done: false, itemDone: false, itemKey: i, firstReadyId: null })
      try {
        const res = await fetch(`${API}/observations/${obs.observation_id}/process`, { method: 'POST' })
        if (res.ok) {
          succeeded++
          setQueueProcessing(prev => prev ? { ...prev, itemDone: true } : prev)
          await new Promise(r => setTimeout(r, 700))
        }
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
      itemDone: true,
      itemKey: toProcess.length,
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

  async function handleSaveProfile() {
    if (!id || Object.keys(profileDraft).length === 0) return
    setProfileSaving(true)
    try {
      const res = await fetch(`${API}/inspections/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileDraft),
      })
      if (res.ok) {
        const updated = await res.json()
        setInspection(updated)
        setProfileDraft({})
        setProfileEditMode(false)
      }
    } finally {
      setProfileSaving(false)
    }
  }

  async function confirmProfileField(fieldKey: string, value: unknown) {
    if (!id) return
    try {
      const res = await fetch(`${API}/inspections/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [fieldKey]: value }),
      })
      if (res.ok) setInspection(await res.json())
    } catch {}
  }

  async function declineProfileField(fieldKey: string) {
    if (!id) return
    try {
      const res = await fetch(`${API}/inspections/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [fieldKey]: null }),
      })
      if (res.ok) setInspection(await res.json())
    } catch {}
  }

  async function handleFrontOfHouseChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    const preview = URL.createObjectURL(file)
    setFrontOfHouseUrl(preview)
    const fd = new FormData()
    fd.append('file', file)
    await fetch(`${API}/inspections/${id}/front-of-house-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
  }

  async function handleSaveDetails() {
    if (!id) return
    setDetailsSaving(true)
    try {
      const res = await fetch(`${API}/inspections/${id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          address: addressDraft || null,
          client_name: clientNameDraft || null,
          property_type: propertyTypeDraft || null,
          inspection_date: inspectionDateDraft ? new Date(inspectionDateDraft).toISOString() : null,
          notes: notesDraft || null,
        }),
      })
      if (res.ok) {
        setInspection(await res.json())
        setDetailsEditMode(false)
      }
    } finally {
      setDetailsSaving(false)
    }
  }

  // SQLite returns datetimes without a timezone suffix — JS treats those as local
  // time rather than UTC. Appending Z forces correct UTC interpretation.
  function parseServerDate(dateStr: string): Date {
    const s = dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z'
    return new Date(s)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return parseServerDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return null
    return parseServerDate(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  function toDateTimeLocal(dateStr: string | null) {
    if (!dateStr) return ''
    const d = parseServerDate(dateStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
            <QueueItemSteps
              key={queueProcessing.itemKey}
              current={queueProcessing.current}
              total={queueProcessing.total}
              label={queueProcessing.label}
              itemDone={queueProcessing.itemDone}
            />
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
            {/* Front of house photo */}
            <div className="mb-4">
              <input
                ref={frontOfHouseInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFrontOfHouseChange}
              />
              {frontOfHouseUrl ? (
                <div
                  className="relative rounded-3xl overflow-hidden cursor-pointer group"
                  style={{ aspectRatio: '16/7' }}
                  onClick={() => frontOfHouseInputRef.current?.click()}
                >
                  <img src={frontOfHouseUrl} className="w-full h-full object-cover" alt="Front of house" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Change photo</span>
                  </div>
                  <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    Cover photo
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => frontOfHouseInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-3xl py-7 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-400 active:scale-[0.99] transition-all"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span className="text-sm font-semibold">Add front of house photo</span>
                  <span className="text-xs">Used on the report cover page</span>
                </button>
              )}
            </div>

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
                {inspection.inspection_date && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">Started {formatDateTime(inspection.inspection_date)}</span>
                )}
              </div>
              {observations.length > 0 && (
                <p className="text-slate-400 text-sm mt-2">
                  {approvedCount} approved · {observations.length} total observation{observations.length !== 1 ? 's' : ''}
                </p>
              )}

              {/* Inline details editor */}
              {detailsEditMode ? (
                <div className="mt-3 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Address</label>
                    <input
                      type="text"
                      value={addressDraft}
                      onChange={e => setAddressDraft(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Client name</label>
                    <input
                      type="text"
                      value={clientNameDraft}
                      onChange={e => setClientNameDraft(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Property type</label>
                    <input
                      type="text"
                      value={propertyTypeDraft}
                      onChange={e => setPropertyTypeDraft(e.target.value)}
                      placeholder="e.g. Single Family, Condo"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Inspection date</label>
                    <input
                      type="datetime-local"
                      value={inspectionDateDraft}
                      onChange={e => setInspectionDateDraft(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Notes</label>
                    <textarea
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                      placeholder="Optional"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDetails}
                      disabled={detailsSaving}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                    >
                      {detailsSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setDetailsEditMode(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold active:scale-[0.98] transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddressDraft(inspection.address)
                    setClientNameDraft(inspection.client_name ?? '')
                    setPropertyTypeDraft(inspection.property_type ?? '')
                    setInspectionDateDraft(toDateTimeLocal(inspection.inspection_date))
                    setNotesDraft(inspection.notes ?? '')
                    setDetailsEditMode(true)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors mt-3"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                  Edit details
                </button>
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

            {/* Action button */}
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

                {/* River divider between Queue and Not Inspected */}
                <div className="py-4">
                  <svg viewBox="0 0 320 24" className="w-full" style={{ height: '24px' }}>
                    <path d="M0,12 C26.7,3 53.3,21 80,12 C106.7,3 133.3,21 160,12 C186.7,3 213.3,21 240,12 C266.7,3 293.3,21 320,12"
                      fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <path d="M0,12 C26.7,3 53.3,21 80,12 C106.7,3 133.3,21 160,12 C186.7,3 213.3,21 240,12 C266.7,3 293.3,21 320,12"
                      fill="none" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" className="animate-river" />
                  </svg>
                </div>

                {/* Level 1: Not Inspected */}
                <button
                  onClick={() => setNotInspectedExpanded(e => !e)}
                  className="flex items-center justify-between w-full py-2 mb-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Not Inspected</span>
                    {notInspected.length > 0 && (
                      <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{notInspected.length}</span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-200 ${notInspectedExpanded ? 'rotate-180' : ''}`}>
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </button>

                {notInspectedExpanded && (
                  <div className="flex flex-col gap-3 mb-2">
                    {notInspected.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-3">No not-inspected items.</p>
                    ) : (
                      notInspected.map((ni) => (
                        <NotInspectedCard key={ni.id} ni={ni} />
                      ))
                    )}
                  </div>
                )}

                {/* River divider between Not Inspected and Processed */}
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

            {/* House Profile */}
            <div className="mt-8">
              <button
                onClick={() => setProfileExpanded(e => !e)}
                className="flex items-center justify-between w-full py-2 mb-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">House Profile</span>
                  {inspection && (() => {
                    const confirmed = REQUIRED_FIELDS.filter(f =>
                      (inspection as any)[f.key] != null &&
                      inspection.system_profile_sources?.[f.key] === 'confirmed'
                    ).length
                    return (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${confirmed === REQUIRED_FIELDS.length ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'}`}>
                        {confirmed}/{REQUIRED_FIELDS.length} confirmed
                      </span>
                    )
                  })()}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${profileExpanded ? 'rotate-180' : ''}`}>
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>

              {profileExpanded && inspection && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-5">
                  {SYSTEM_PROFILE_CONFIG.map(({ label, fields }) => (
                    <div key={label}>
                      <p className="text-sm font-bold text-slate-700 mb-3 pt-1">{label}</p>
                      <div className="flex flex-col gap-2">
                        {fields.map((field) => {
                          const rawVal = (inspection as any)[field.key]
                          const source = inspection.system_profile_sources?.[field.key]
                          const displayVal = rawVal != null
                            ? (field.type === 'boolean' ? (rawVal ? 'Yes' : 'No') : `${rawVal}${(field as any).unit ? ' ' + (field as any).unit : ''}`)
                            : null
                          const draftVal = profileDraft[field.key]

                          const isRequired = REQUIRED_FIELDS.some(f => f.key === field.key)
                          const isMissing = isRequired && rawVal == null

                          return (
                            <div key={field.key} className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg -mx-2 ${isMissing ? 'bg-amber-50' : ''}`}>
                              <span className="text-sm text-slate-500 shrink-0 flex items-center gap-1">
                                {field.label}
                                {isRequired && <span className={`w-1.5 h-1.5 rounded-full inline-block ${isMissing ? 'bg-amber-400' : 'bg-green-500'}`} />}
                              </span>
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                {profileEditMode ? (
                                  field.type === 'enum' ? (
                                    <select
                                      value={String(draftVal ?? rawVal ?? '')}
                                      onChange={(e) => setProfileDraft(d => ({ ...d, [field.key]: e.target.value || undefined }))}
                                      className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-800 bg-white max-w-[180px]"
                                    >
                                      <option value="">— select —</option>
                                      {(field as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  ) : field.type === 'boolean' ? (
                                    <select
                                      value={draftVal != null ? String(draftVal) : (rawVal != null ? String(rawVal) : '')}
                                      onChange={(e) => setProfileDraft(d => ({ ...d, [field.key]: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined }))}
                                      className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-800 bg-white"
                                    >
                                      <option value="">— select —</option>
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  ) : (
                                    <input
                                      type="number"
                                      value={String(draftVal ?? rawVal ?? '')}
                                      onChange={(e) => setProfileDraft(d => ({ ...d, [field.key]: e.target.value ? Number(e.target.value) : undefined }))}
                                      className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-800 bg-white w-24"
                                      placeholder={(field as any).unit ?? ''}
                                    />
                                  )
                                ) : (
                                  <>
                                    <span className={`text-sm font-medium ${displayVal ? 'text-slate-800' : 'text-slate-300'}`}>
                                      {displayVal ?? '—'}
                                    </span>
                                    {rawVal != null && source === 'inferred' && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">auto</span>
                                        <button
                                          onClick={() => confirmProfileField(field.key, rawVal)}
                                          title="Confirm this value"
                                          className="text-xs w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-700 font-bold hover:bg-green-200 active:scale-95 transition-all"
                                        >✓</button>
                                        <button
                                          onClick={() => declineProfileField(field.key)}
                                          title="Clear this value"
                                          className="text-xs w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-400 font-bold hover:bg-red-100 active:scale-95 transition-all"
                                        >✗</button>
                                      </div>
                                    )}
                                    {source === 'confirmed' && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">confirmed</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2 border-t border-slate-100">
                    {profileEditMode ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={profileSaving || Object.keys(profileDraft).length === 0}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                        >
                          {profileSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setProfileEditMode(false); setProfileDraft({}) }}
                          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold active:scale-[0.98] transition-transform"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setProfileEditMode(true)}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold active:scale-[0.98] transition-transform"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Generate Report */}
            {(() => {
              if (!inspection) return null
              const unconfirmedFields = REQUIRED_FIELDS.filter(f => {
                const val = (inspection as any)[f.key]
                const src = inspection.system_profile_sources?.[f.key]
                return val == null || src !== 'confirmed'
              })
              const canGenerate = unconfirmedFields.length === 0
              return (
                <div className="mt-6 mb-4">
                  {!canGenerate && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-3">
                      <p className="text-sm font-semibold text-amber-800 mb-1">Confirm these in House Profile before generating report:</p>
                      <ul className="text-sm text-amber-700 list-disc list-inside">
                        {unconfirmedFields.map(f => {
                          const val = (inspection as any)[f.key]
                          return (
                            <li key={f.key}>
                              {f.label}
                              {val != null && <span className="text-amber-500 ml-1">(auto-detected — tap ✓ to confirm)</span>}
                            </li>
                          )
                        })}
                      </ul>
                      <p className="text-xs text-amber-600 mt-1.5">Open House Profile above and confirm or fill each field.</p>
                    </div>
                  )}
                  <button
                    disabled={!canGenerate}
                    onClick={() => alert('Report generation coming soon!')}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] ${
                      canGenerate
                        ? 'bg-green-700 text-white shadow-md shadow-green-100 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Generate Report
                  </button>
                </div>
              )
            })()}
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

const QUEUE_STEP_DELAYS = [2000, 5000, 9000, 13000]
const QUEUE_STEPS = ['Analyzing photo', 'Reading your notes', 'Examining observation', 'Classifying severity', 'Generating report']

function QueueItemSteps({ current, total, label, itemDone }: {
  current: number
  total: number
  label: string
  itemDone: boolean
}) {
  const [completedCount, setCompletedCount] = useState(0)
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const timers = QUEUE_STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setCompletedCount(c => Math.max(c, i + 1)), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (itemDone) setCompletedCount(QUEUE_STEPS.length)
  }, [itemDone])

  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 450)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4">
      <p className="text-2xl font-extrabold text-slate-900">{current} of {total}</p>
      {label && (
        <p className="text-sm text-slate-400 text-center max-w-xs leading-relaxed line-clamp-2 -mt-2">{label}</p>
      )}
      <div className="w-full flex flex-col gap-4 mt-1">
        {QUEUE_STEPS.map((step, i) => {
          const done = i < completedCount
          const active = i === completedCount
          return (
            <div key={i} className={`flex items-center gap-4 transition-all duration-500 ${done || active ? 'opacity-100' : 'opacity-20'}`}>
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                {done ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : active ? (
                  <div className="w-5 h-5 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                )}
              </div>
              <span className={`text-base font-semibold transition-colors duration-300 ${done || active ? 'text-slate-800' : 'text-slate-300'}`}>
                {active ? `${step}${dots}` : step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NotInspectedCard({ ni }: { ni: NotInspectedObs }) {
  const reasonLabel = ni.reason ? (REASON_LABELS[ni.reason] ?? ni.reason) : null
  const reasonColor = ni.reason ? (REASON_COLORS[ni.reason] ?? 'bg-slate-100 text-slate-500') : 'bg-slate-100 text-slate-500'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center mt-0.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 text-base leading-snug truncate">
          {ni.component ?? 'Unknown component'}
        </p>
        {ni.description && (
          <p className="text-sm text-slate-400 mt-0.5 line-clamp-2 leading-snug">{ni.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {ni.room_or_area && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ni.room_or_area}</span>}
          {ni.system && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ni.system}</span>}
          {reasonLabel && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${reasonColor}`}>{reasonLabel}</span>}
        </div>
      </div>
    </div>
  )
}
