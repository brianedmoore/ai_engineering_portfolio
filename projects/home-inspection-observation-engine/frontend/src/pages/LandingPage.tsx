import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoIcon from '../assets/logo-icon.png'

export default function LandingPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-offwhite font-sans overflow-x-hidden">

      {/* Nav */}
      <nav className="w-full px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src={logoIcon} alt="InspectFlow" className="h-9 w-auto" />
          <span className="font-bold text-xl tracking-tight" style={{ color: '#0F1F4E' }}>
            Inspect<span style={{ color: '#2563EB' }}>Flow</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-slate-500 font-medium text-sm hover:text-slate-800 transition-colors">
            Sign in
          </a>
          <a href="/register" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all">
            Create your account
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-8 text-center overflow-hidden">

        {/* Soft radial glow behind headline */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)' }}
        />

        <div className="inline-block bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8">
          AI-powered home inspection reports
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6" style={{ color: '#0F1F4E' }}>
          Inspections that flow.
        </h1>

        <p className="text-xl text-slate-400 italic mb-10 max-w-lg mx-auto leading-relaxed">
          Your report is ready before you leave the job site.
        </p>

        <a
          href="/register"
          className="inline-block bg-blue-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-blue-500 active:scale-[0.98] transition-all shadow-lg shadow-blue-100"
        >
          Create your account
        </a>

        <p className="text-slate-400 text-sm mt-4 mb-16">Free to get started. No credit card required.</p>

        {/* Animated River */}
        <div className="relative w-full mx-auto" style={{ height: '140px' }}>
          {/* River bank top */}
          <svg viewBox="0 0 900 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* River bed — soft fill */}
            <path
              d="M0,50 C112,20 225,80 337,50 C450,20 562,80 675,50 C787,20 843,65 900,50 L900,100 C843,115 787,90 675,100 C562,110 450,70 337,100 C225,130 112,80 0,100 Z"
              fill="rgba(37,99,235,0.06)"
            />
            {/* River banks — subtle outline */}
            <path
              d="M0,50 C112,20 225,80 337,50 C450,20 562,80 675,50 C787,20 843,65 900,50"
              fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1.5"
            />
            <path
              d="M0,100 C112,80 225,130 337,100 C450,70 562,110 675,100 C787,90 843,115 900,100"
              fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1.5"
            />

            {/* Flowing current lines — animated */}
            <path
              d="M0,65 C112,38 225,92 337,65 C450,38 562,92 675,65 C787,38 843,78 900,65"
              fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"
              className="animate-river-hero-1"
            />
            <path
              d="M0,75 C112,50 225,98 337,75 C450,50 562,98 675,75 C787,50 843,88 900,75"
              fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"
              className="animate-river-hero-2"
            />
            <path
              d="M0,85 C112,62 225,106 337,85 C450,62 562,106 675,85 C787,62 843,98 900,85"
              fill="none" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
              className="animate-river-hero-3"
            />
            <path
              d="M0,58 C112,32 225,85 337,58 C450,32 562,85 675,58 C787,32 843,70 900,58"
              fill="none" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" opacity="0.4"
              className="animate-river-hero-4"
            />
          </svg>

          {/* Ripple circles on the river */}
          <div className="absolute" style={{ left: '20%', top: '55%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-8 h-4 rounded-full border border-blue-300 animate-ripple" style={{ transform: 'scale(1)' }} />
            <div className="absolute inset-0 w-8 h-4 rounded-full border border-blue-200 animate-ripple-delay" />
          </div>
          <div className="absolute" style={{ left: '55%', top: '45%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-8 h-4 rounded-full border border-blue-300 animate-ripple-delay" style={{ transform: 'scale(1)' }} />
            <div className="absolute inset-0 w-8 h-4 rounded-full border border-blue-200 animate-ripple-delay-2" />
          </div>
          <div className="absolute" style={{ left: '80%', top: '60%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-6 h-3 rounded-full border border-blue-300 animate-ripple-delay-2" style={{ transform: 'scale(1)' }} />
          </div>
        </div>
      </section>

      {/* Wave into white section */}
      <div className="w-full overflow-hidden leading-none">
        <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none" style={{ height: '50px' }}>
          <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill="white" />
        </svg>
      </div>

      {/* How it works */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: '#0F1F4E' }}>
            Three steps. That's it.
          </h2>
          <p className="text-slate-400 text-base mb-16">No templates. No copy-pasting photos. No report writing.</p>

          {/* Desktop: flex row with arrows as flex children between steps */}
          <div className="hidden sm:flex items-start justify-center">

            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center text-center gap-5">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#EBF2EC' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Step 1</p>
                <h3 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: '#0F1F4E' }}>Speak</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Hold the mic and narrate what you see. Your words become the report.</p>
              </div>
            </div>

            {/* Arrow 1 — sits in the gap, vertically centered with the icon */}
            <div className="flex-shrink-0 w-14 flex items-center justify-center" style={{ paddingTop: '48px' }}>
              <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                <path d="M0,8 C8,3 16,13 24,8 L20,4 M24,8 L20,12" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" className="animate-river-hero-2" />
              </svg>
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center text-center gap-5">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#EBF4FF' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Step 2</p>
                <h3 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: '#0F1F4E' }}>Shoot</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Take photos of the defect. AI reads every photo and describes what it sees.</p>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="flex-shrink-0 w-14 flex items-center justify-center" style={{ paddingTop: '48px' }}>
              <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                <path d="M0,8 C8,3 16,13 24,8 L20,4 M24,8 L20,12" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" className="animate-river-hero-2" />
              </svg>
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center text-center gap-5">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#FEF3C7' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Step 3</p>
                <h3 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: '#0F1F4E' }}>Done</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Review the AI-generated observation, approve it, and move on.</p>
              </div>
            </div>
          </div>

          {/* Mobile: stacked */}
          <div className="flex flex-col gap-10 sm:hidden">
            {[
              { step: '1', label: 'Speak', description: 'Hold the mic and narrate what you see. Your words become the report.', bg: '#EBF2EC', icon: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
              { step: '2', label: 'Shoot', description: 'Take photos of the defect. AI reads every photo and describes what it sees.', bg: '#EBF4FF', icon: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
              { step: '3', label: 'Done', description: 'Review the AI-generated observation, approve it, and move on.', bg: '#FEF3C7', icon: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
            ].map(({ step, label, description, bg, icon }) => (
              <div key={step} className="flex flex-col items-center text-center gap-5">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-sm" style={{ backgroundColor: bg }}>{icon}</div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Step {step}</p>
                  <h3 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: '#0F1F4E' }}>{label}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated wave divider */}
      <div className="w-full overflow-hidden bg-white" style={{ height: '80px' }}>
        <svg viewBox="0 0 900 80" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,40 C150,10 300,70 450,40 C600,10 750,70 900,40 L900,80 L0,80 Z" fill="#FAF9F6" />
          <path d="M0,40 C150,10 300,70 450,40 C600,10 750,70 900,40" fill="none" stroke="rgba(37,99,235,0.12)" strokeWidth="2" className="animate-river-hero-1" />
          <path d="M0,48 C150,20 300,76 450,48 C600,20 750,76 900,48" fill="none" stroke="rgba(37,99,235,0.08)" strokeWidth="1.5" className="animate-river-hero-3" />
        </svg>
      </div>

      {/* Value props */}
      <section className="py-20 px-6 bg-offwhite">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h3 className="text-xl font-extrabold mb-3" style={{ color: '#0F1F4E' }}>Leave the job site done.</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              No more going home to hours of report writing. InspectFlow builds your report as you walk the property — observation by observation, in real time.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="text-xl font-extrabold mb-3" style={{ color: '#0F1F4E' }}>Dead simple.</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              Speak. Shoot. Done. No templates to fill out. No language to write from scratch. If you can take a photo and say what you see, you can use InspectFlow.
            </p>
          </div>

        </div>
      </section>

      {/* Final CTA with full river */}
      <section className="relative py-24 px-6 text-center overflow-hidden">

        {/* Full width animated river background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <svg viewBox="0 0 900 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0,120 C112,80 225,160 337,120 C450,80 562,160 675,120 C787,80 843,140 900,120 L900,200 C843,220 787,170 675,200 C562,230 450,160 337,200 C225,240 112,180 0,200 Z" fill="rgba(37,99,235,0.04)" />
            <path d="M0,140 C112,100 225,180 337,140 C450,100 562,180 675,140 C787,100 843,160 900,140" fill="none" stroke="rgba(37,99,235,0.10)" strokeWidth="2" className="animate-river-hero-1" />
            <path d="M0,155 C112,118 225,192 337,155 C450,118 562,192 675,155 C787,118 843,172 900,155" fill="none" stroke="rgba(37,99,235,0.07)" strokeWidth="1.5" className="animate-river-hero-2" />
            <path d="M0,168 C112,134 225,200 337,168 C450,134 562,200 675,168 C787,134 843,182 900,168" fill="none" stroke="rgba(96,165,250,0.08)" strokeWidth="1" className="animate-river-hero-3" />
          </svg>
        </div>

        <h2 className="text-4xl font-extrabold tracking-tight mb-4" style={{ color: '#0F1F4E' }}>
          Ready to let it flow?
        </h2>
        <p className="text-slate-400 text-lg italic mb-10 max-w-md mx-auto">
          Join inspectors who finish their reports before they leave the driveway.
        </p>
        <a
          href="/register"
          className="inline-block bg-blue-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-blue-500 active:scale-[0.98] transition-all shadow-lg shadow-blue-100"
        >
          Create your account
        </a>
        <p className="text-slate-400 text-sm mt-4">Free to get started. No credit card required.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="InspectFlow" className="h-7 w-auto" />
            <span className="font-bold text-base tracking-tight" style={{ color: '#0F1F4E' }}>
              Inspect<span style={{ color: '#2563EB' }}>Flow</span>
            </span>
          </div>
          <p className="text-slate-300 text-sm">© {new Date().getFullYear()} InspectFlow</p>
        </div>
      </footer>

    </div>
  )
}
