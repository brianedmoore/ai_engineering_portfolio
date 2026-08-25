import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoIcon from '../assets/logo-icon.png'

type HeaderProps = {
  approvedCount?: number
  inspectionId?: string
}

export default function Header({ approvedCount, inspectionId }: HeaderProps) {
  const { inspector, headshotUrl, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const initials = inspector?.name
    ? inspector.name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : inspector?.email?.[0]?.toUpperCase() ?? '?'

  function handleSignOut() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logoIcon} alt="InspectFlow logo" className="h-9 w-auto" />
          <span className="font-bold text-xl tracking-tight" style={{ color: '#0F1F4E' }}>
            Inspect<span style={{ color: '#2563EB' }}>Flow</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {approvedCount !== undefined && approvedCount > 0 && (
            <Link
              to={inspectionId ? `/inspections/${inspectionId}` : '/list'}
              className="text-sm font-semibold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ backgroundColor: '#EBF2EC', color: '#2C5F2E' }}
            >
              ✓ {approvedCount} approved
            </Link>
          )}

          {/* Avatar + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(v => !v)}
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-transparent hover:ring-blue-200 active:scale-95 transition-all"
              aria-label="Account menu"
            >
              {headshotUrl ? (
                <img src={headshotUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-500">{initials}</span>
                </div>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {inspector?.name || 'Inspector'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{inspector?.email}</p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                    </svg>
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
