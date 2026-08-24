import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from '../api'
import Header from '../components/Header'
import logoIcon from '../assets/logo-icon.png'

type RawObs = {
  observation_id: string
  status: string
  text_description: string | null
  audio_transcript: string | null
  photo_ids: number[] | null
  inspection_id: number | null
}

export default function RawObservationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const inspectionId = (location.state as { inspectionId?: string } | null)?.inspectionId

  const [obs, setObs] = useState<RawObs | null>(null)
  const [loading, setLoading] = useState(true)

  // Photo carousel
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [dragDelta, setDragDelta] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set())
  const [photoFullscreen, setPhotoFullscreen] = useState(false)

  // Audio player
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [waveformBars, setWaveformBars] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [audioLoading, setAudioLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Actions
  const [isProcessing, setIsProcessing] = useState(false)
  const [processComplete, setProcessComplete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backPath = inspectionId ? `/inspections/${inspectionId}` : obs?.inspection_id ? `/inspections/${obs.inspection_id}` : '/'

  useEffect(() => {
    if (!id) return
    fetch(`${API_URL}/observations/${id}`)
      .then(r => r.json())
      .then(data => { setObs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !obs) return
    setAudioLoading(true)
    fetch(`${API_URL}/observations/${id}/audio`)
      .then(async r => {
        if (!r.ok) return
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setWaveformBars(await extractWaveform(blob))
      })
      .catch(() => {})
      .finally(() => setAudioLoading(false))
  }, [id, obs?.observation_id])

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  }, [audioUrl])

  async function extractWaveform(blob: Blob): Promise<number[]> {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const tempCtx = new AudioContext()
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer)
      tempCtx.close()
      const data = audioBuffer.getChannelData(0)
      const BAR_COUNT = 40
      const step = Math.floor(data.length / BAR_COUNT)
      const peaks = Array.from({ length: BAR_COUNT }, (_, i) => {
        const chunk = data.slice(i * step, (i + 1) * step)
        return Math.sqrt(chunk.reduce((s, v) => s + v * v, 0) / chunk.length)
      })
      const max = Math.max(...peaks, 0.001)
      return peaks.map(v => v / max)
    } catch {
      return Array(40).fill(0.15)
    }
  }

  function togglePlayback() {
    const player = audioRef.current
    if (!player) return
    if (isPlaying) { player.pause(); setIsPlaying(false) }
    else { player.play().catch(() => {}); setIsPlaying(true) }
  }

  function seekToFraction(fraction: number) {
    const player = audioRef.current
    if (!player || !player.duration) return
    player.currentTime = Math.max(0, Math.min(1, fraction)) * player.duration
    setPlaybackProgress(Math.max(0, Math.min(1, fraction)))
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
      if (dragDelta < 0 && activePhotoIndex < obs.photo_ids.length - 1) setActivePhotoIndex(p => p + 1)
      else if (dragDelta > 0 && activePhotoIndex > 0) setActivePhotoIndex(p => p - 1)
    }
    setDragDelta(0)
    setIsDragging(false)
    setTouchStartX(null)
  }

  async function handleProcessNow() {
    if (!id) return
    setIsProcessing(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/observations/${id}/process`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setProcessComplete(true)
      setTimeout(() => navigate(`/review/${id}`, { state: { from: 'inspection', inspectionId: inspectionId ?? obs?.inspection_id } }), 900)
    } catch {
      setError('Processing failed. Check your connection and try again.')
      setIsProcessing(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setIsDeleting(true)
    try {
      await fetch(`${API_URL}/observations/${id}`, { method: 'DELETE' })
      navigate(backPath)
    } catch {
      setError('Delete failed. Please try again.')
      setIsDeleting(false)
    }
  }

  if (isProcessing) {
    return (
      <ProcessOverlay
        isComplete={processComplete}
        hasAudio={!!audioUrl}
        photoCount={obs?.photo_ids?.length ?? 1}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!obs) {
    return (
      <div className="min-h-screen bg-offwhite">
        <Header />
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Observation not found.</p>
        </div>
      </div>
    )
  }

  const photos = obs.photo_ids ?? []

  return (
    <div className="min-h-screen bg-offwhite">
      <Header />

      {/* Fullscreen photo overlay */}
      {photoFullscreen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex justify-end px-5 pt-5 pb-2 shrink-0">
            <button
              onClick={() => setPhotoFullscreen(false)}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden" onTouchStart={handleCarouselTouchStart} onTouchMove={handleCarouselTouchMove} onTouchEnd={handleCarouselTouchEnd}>
            {photos.map((photoId, i) => (
              <div key={photoId} className="absolute inset-0 flex items-center justify-center p-4" style={{ transform: `translateX(calc(${(i - activePhotoIndex) * 100}% + ${dragDelta}px))`, transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
                <img src={`${API_URL}/observations/${obs.observation_id}/photos/${photoId}`} alt={`Photo ${i + 1}`} className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            ))}
          </div>
          {photos.length > 1 && (
            <div className="flex justify-center gap-2 pb-6 pt-3 shrink-0">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setActivePhotoIndex(i)} className="rounded-full transition-all duration-200" style={{ width: i === activePhotoIndex ? '20px' : '8px', height: '8px', backgroundColor: i === activePhotoIndex ? 'white' : 'rgba(255,255,255,0.35)' }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8 pb-44">

        <button onClick={() => navigate(backPath)} className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium">
          ← Back to inspection
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Queued Observation</h1>
          <p className="text-sm text-slate-400 mt-1">Pending AI analysis — your captured evidence is below.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-base">{error}</div>
        )}

        {/* Photo carousel */}
        {photos.length > 0 && (
          <div className="mb-4">
            <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '4/3' }} onTouchStart={handleCarouselTouchStart} onTouchMove={handleCarouselTouchMove} onTouchEnd={handleCarouselTouchEnd}>
              {photos.map((photoId, i) => (
                <div key={photoId} className="absolute inset-0" style={{ transform: `translateX(calc(${(i - activePhotoIndex) * 100}% + ${dragDelta}px))`, transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
                  {!failedPhotos.has(photoId) ? (
                    <img src={`${API_URL}/observations/${obs.observation_id}/photos/${photoId}`} alt={`Photo ${i + 1}`} className="w-full h-full object-cover cursor-pointer active:opacity-90" onClick={() => setPhotoFullscreen(true)} onError={() => setFailedPhotos(prev => new Set(prev).add(photoId))} />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                      <p className="text-slate-400 text-sm">Photo unavailable</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 cursor-pointer" onClick={() => setPhotoFullscreen(true)}>
                {photos.length > 1 && (
                  <div className="flex justify-center gap-2 mb-2">
                    {photos.map((_, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(i) }} className="rounded-full transition-all duration-200" style={{ width: i === activePhotoIndex ? '20px' : '8px', height: '8px', backgroundColor: i === activePhotoIndex ? 'white' : 'rgba(255,255,255,0.45)' }} />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                  <span className="text-white text-sm font-semibold">
                    {photos.length > 1 ? `Photo ${activePhotoIndex + 1} of ${photos.length} · Tap to expand` : 'Tap to view full screen'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text description */}
        {obs.text_description && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Inspector Note</p>
            <p className="text-base text-slate-800 leading-relaxed">{obs.text_description}</p>
          </div>
        )}

        {/* Audio player */}
        {audioUrl && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Audio Recording</p>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => { setIsPlaying(false); setPlaybackProgress(1) }}
              onTimeUpdate={(e) => {
                const a = e.currentTarget
                if (a.duration) setPlaybackProgress(a.currentTime / a.duration)
              }}
              className="hidden"
            />
            {/* Waveform */}
            <div
              className="relative flex items-center gap-[2px] w-full cursor-pointer select-none mb-4"
              style={{ height: '56px' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                seekToFraction((e.clientX - rect.left) / rect.width)
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                const rect = e.currentTarget.getBoundingClientRect()
                seekToFraction((e.touches[0].clientX - rect.left) / rect.width)
              }}
            >
              {waveformBars.map((h, i) => {
                const isPast = (i / waveformBars.length) < playbackProgress
                return (
                  <div
                    key={i}
                    className="rounded-full flex-1 transition-colors duration-75"
                    style={{
                      height: `${Math.max(3, h * 52)}px`,
                      backgroundColor: isPast ? '#2563EB' : '#bfdbfe',
                      opacity: isPast ? (0.5 + h * 0.5) : (0.4 + h * 0.4),
                    }}
                  />
                )
              })}
              <div className="absolute top-0 bottom-0 w-0.5 rounded-full pointer-events-none" style={{ left: `${playbackProgress * 100}%`, backgroundColor: '#1d4ed8' }} />
            </div>
            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all"
                style={{ backgroundColor: '#2563EB' }}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                )}
              </button>
              <span className="text-sm text-slate-500 font-medium">
                {isPlaying ? 'Playing...' : 'Tap to play'}
              </span>
            </div>
          </div>
        )}

        {audioLoading && !audioUrl && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
            <p className="text-sm text-slate-400">Loading audio...</p>
          </div>
        )}

        {/* If only audio_transcript (no file), show it */}
        {!audioUrl && !audioLoading && obs.audio_transcript && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Audio Transcript</p>
            <p className="text-base text-slate-800 leading-relaxed italic">"{obs.audio_transcript}"</p>
          </div>
        )}

      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-100" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">
          <button
            onClick={handleProcessNow}
            disabled={isProcessing || isDeleting}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40 shadow-md cursor-pointer"
            style={{ backgroundColor: '#2563EB' }}
          >
            Process Now
          </button>
          <button
            onClick={handleDelete}
            disabled={isProcessing || isDeleting}
            className="w-full py-4 rounded-2xl text-base font-bold border-2 border-red-300 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete Observation'}
          </button>
        </div>
      </div>
    </div>
  )
}

const STEP_DELAYS = [2500, 5500, 10000, 15000]

function ProcessOverlay({ isComplete, hasAudio, photoCount }: { isComplete: boolean; hasAudio: boolean; photoCount: number }) {
  const photoLabel = photoCount > 1 ? 'Analyzing photos' : 'Analyzing photo'
  const STEPS = hasAudio
    ? ['Transcribing audio', photoLabel, 'Examining observation', 'Classifying severity', 'Generating report']
    : [photoLabel, 'Reading your notes', 'Examining observation', 'Classifying severity', 'Generating report']

  const [completedCount, setCompletedCount] = useState(0)
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setCompletedCount(c => Math.max(c, i + 1)), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (isComplete) setCompletedCount(STEPS.length)
  }, [isComplete])

  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 450)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8" style={{ backgroundColor: '#FAF9F6' }}>
      <img src={logoIcon} alt="InspectFlow" className="h-40 w-auto" style={{ mixBlendMode: 'multiply' }} />
      <div className="w-full max-w-sm overflow-hidden flex justify-center h-7">
        <span className="animate-flowing text-base font-bold tracking-[0.3em]" style={{ color: '#2563EB' }}>Flowing</span>
      </div>
      <div className="w-full max-w-sm">
        <svg viewBox="0 0 320 30" className="w-full" style={{ height: '30px' }}>
          <path d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15"
            fill="none" stroke="#bfdbfe" strokeWidth="7" strokeLinecap="round" />
          <path d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15"
            fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" className="animate-river" />
        </svg>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-5">
        {STEPS.map((label, i) => {
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
                {active ? `${label}${dots}` : label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
