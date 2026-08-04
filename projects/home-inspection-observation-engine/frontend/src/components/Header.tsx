import logoIcon from '../assets/logo-icon.png'

type HeaderProps = {
  approvedCount?: number
}

export default function Header({ approvedCount }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logoIcon} alt="InspectFlow logo" className="h-9 w-auto" />
          <span className="font-bold text-xl tracking-tight" style={{ color: '#0F1F4E' }}>
            Inspect<span style={{ color: '#2563EB' }}>Flow</span>
          </span>
        </div>
        {approvedCount !== undefined && approvedCount > 0 && (
          <span
            className="text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#EBF2EC', color: '#2C5F2E' }}
          >
            ✓ {approvedCount} approved
          </span>
        )}
      </div>
    </header>
  )
}
