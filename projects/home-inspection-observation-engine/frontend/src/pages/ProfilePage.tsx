import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

const API = import.meta.env.VITE_API_URL

const IconEmail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IconPhone = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.28-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IconGlobe = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/><path d="M2 12h20"/>
  </svg>
)
const IconPin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconBadge = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 9h20"/>
  </svg>
)
const IconPencil = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
)
const IconShield = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

export default function ProfilePage() {
  const { token, inspector, headshotUrl, setHeadshotUrl, login, logout } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Edit-mode form state
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [website, setWebsite] = useState('')
  const [standards, setStandards] = useState('')
  const [editHeadshotPreview, setEditHeadshotPreview] = useState<string | null>(null)
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null)
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const headshotInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (inspector?.has_logo && token) {
      fetch(`${API}/inspectors/me/logo`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(b => setLogoUrl(URL.createObjectURL(b)))
        .catch(() => {})
    }
  }, [])

  function startEditing() {
    setName(inspector?.name ?? '')
    setCompanyName(inspector?.company_name ?? '')
    setCompanyAddress(inspector?.company_address ?? '')
    setCompanyPhone(inspector?.company_phone ?? '')
    setLicenseNumber(inspector?.license_number ?? '')
    setWebsite(inspector?.website ?? '')
    setStandards(inspector?.standards_complied_with ?? '')
    setEditHeadshotPreview(headshotUrl)
    setEditLogoPreview(logoUrl)
    setHeadshotFile(null)
    setLogoFile(null)
    setError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setError(null)
    setHeadshotFile(null)
    setLogoFile(null)
  }

  function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHeadshotFile(file)
    setEditHeadshotPreview(URL.createObjectURL(file))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setEditLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/inspectors/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name || null,
          company_name: companyName || null,
          company_address: companyAddress || null,
          company_phone: companyPhone || null,
          license_number: licenseNumber || null,
          website: website || null,
          standards_complied_with: standards || null,
        }),
      })
      if (!res.ok) { setError('Failed to save. Try again.'); return }
      const updated = await res.json()

      if (headshotFile && editHeadshotPreview) {
        const fd = new FormData()
        fd.append('file', headshotFile)
        await fetch(`${API}/inspectors/me/headshot`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        })
        updated.has_headshot = true
        setHeadshotUrl(editHeadshotPreview)
      }
      if (logoFile && editLogoPreview) {
        const fd = new FormData()
        fd.append('file', logoFile)
        await fetch(`${API}/inspectors/me/logo`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        })
        updated.has_logo = true
        setLogoUrl(editLogoPreview)
      }

      login(token!, updated)
      setIsEditing(false)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const initials = inspector?.name
    ? inspector.name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : inspector?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium"
        >
          ← Back
        </button>

        {isEditing ? (
          /* ── EDIT MODE ──────────────────────────────────────────────── */
          <form onSubmit={handleSave}>
            {/* Photo uploads */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-5">Photos</p>
              <div className="flex gap-8 items-start">
                {/* Headshot */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => headshotInputRef.current?.click()}
                    className="w-24 h-24 rounded-full overflow-hidden bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors relative group"
                  >
                    {editHeadshotPreview
                      ? <img src={editHeadshotPreview} className="w-full h-full object-cover" alt="" />
                      : <span className="text-2xl font-bold text-blue-300">{initials}</span>}
                    <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">Change</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Headshot</span>
                  <input ref={headshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeadshotChange} />
                </div>

                {/* Logo */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors relative group"
                  >
                    {editLogoPreview
                      ? <img src={editLogoPreview} className="w-full h-full object-contain p-2" alt="" />
                      : <span className="text-3xl text-slate-400">+</span>}
                    <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">Change</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Company logo</span>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              </div>
            </div>

            {/* Text fields */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4 flex flex-col gap-4">
              {([
                { label: 'Full name', value: name, set: setName, placeholder: 'Jane Smith' },
                { label: 'Company name', value: companyName, set: setCompanyName, placeholder: 'Smith Home Inspections' },
                { label: 'Company phone', value: companyPhone, set: setCompanyPhone, placeholder: '(555) 000-0000' },
                { label: 'Company address', value: companyAddress, set: setCompanyAddress, placeholder: '123 Main St, Atlanta, GA 30301' },
                { label: 'Website', value: website, set: setWebsite, placeholder: 'https://smithinspections.com' },
                { label: 'License number', value: licenseNumber, set: setLicenseNumber, placeholder: 'Optional' },
              ] as const).map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
                  />
                </div>
              ))}

              <div>
                <label className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5 block">Inspection standard</label>
                <select
                  value={standards}
                  onChange={e => setStandards(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 text-base"
                >
                  <option value="">None selected</option>
                  <option value="ASHI Standards of Practice, October 2022">ASHI Standards of Practice, October 2022</option>
                  <option value="InterNACHI Standards of Practice, January 2023">InterNACHI Standards of Practice, January 2023</option>
                  <option value="ASHI and InterNACHI Standards of Practice">ASHI and InterNACHI Standards of Practice</option>
                </select>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-base active:scale-[0.98] transition-transform"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ── VIEW MODE ──────────────────────────────────────────────── */
          <>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm mb-4">
              {/* Banner — logo lives here, big */}
              <div className="relative rounded-t-3xl overflow-hidden h-36 bg-gradient-to-br from-blue-100 via-blue-50 to-slate-200">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    className="w-full h-full object-contain"
                    style={{ mixBlendMode: 'multiply' }}
                    alt="Company logo"
                  />
                )}
                {/* Edit icon — top right of banner */}
                <button
                  onClick={startEditing}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-slate-200/80 flex items-center justify-center hover:bg-white transition-colors text-slate-600"
                  aria-label="Edit profile"
                >
                  <IconPencil />
                </button>
              </div>

              {/* Avatar — overlaps banner, z-10 so it paints above the relative-positioned banner */}
              <div className="px-5">
                <div className="-mt-11 mb-3 inline-block relative z-10">
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg bg-blue-100">
                    {headshotUrl
                      ? <img src={headshotUrl} className="w-full h-full object-cover" alt="Headshot" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-400">{initials}</span>
                        </div>}
                  </div>
                </div>

                {/* Name + company */}
                <div className="mb-4">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {inspector?.name || inspector?.email}
                  </h1>
                  {inspector?.company_name && (
                    <p className="text-slate-500 text-sm mt-0.5">{inspector.company_name}</p>
                  )}
                </div>

                {/* Info rows */}
                <div className="space-y-3 pb-5">
                  <InfoRow icon={<IconEmail />} value={inspector?.email ?? ''} />
                  {inspector?.company_phone && (
                    <InfoRow icon={<IconPhone />} value={inspector.company_phone} />
                  )}
                  {inspector?.website && (
                    <InfoRow
                      icon={<IconGlobe />}
                      value={inspector.website.replace(/^https?:\/\//, '')}
                      href={inspector.website.startsWith('http') ? inspector.website : `https://${inspector.website}`}
                    />
                  )}
                  {inspector?.company_address && (
                    <InfoRow icon={<IconPin />} value={inspector.company_address} />
                  )}
                  {inspector?.license_number && (
                    <InfoRow icon={<IconBadge />} value={`Lic. ${inspector.license_number}`} />
                  )}
                  {inspector?.standards_complied_with && (
                    <InfoRow icon={<IconShield />} value={inspector.standards_complied_with} />
                  )}
                </div>
              </div>

              {/* Edit Profile — full-width, Instagram-style, inside card bottom */}
              <div className="px-5 pb-5">
                <button
                  onClick={startEditing}
                  className="w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Edit profile
                </button>
              </div>
            </div>

            {/* Sign out — separate card, large tap target, toned down */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <button
                onClick={() => { logout(); navigate('/login', { replace: true }) }}
                className="w-full py-4 rounded-2xl text-slate-500 font-semibold text-base border border-slate-200 hover:text-red-500 hover:border-red-200 hover:bg-red-50 active:scale-[0.98] transition-all"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, value, href }: { icon: React.ReactNode; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="truncate">{value}</span>
      )}
    </div>
  )
}
