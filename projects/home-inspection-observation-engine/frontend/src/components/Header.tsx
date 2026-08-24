import { Link } from 'react-router-dom'
import logoIcon from '../assets/logo-icon.png'

type HeaderProps = {
  approvedCount?: number
  inspectionId?: string
}

export default function Header({ approvedCount, inspectionId }: HeaderProps) {
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
          <Link
            to="/profile"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
            aria-label="Profile"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
