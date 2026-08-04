import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../api'
import Header from '../components/Header'
import logoIcon from '../assets/logo-icon.png'

export default function CapturePage() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [audioReady, setAudioReady] = useState(false)
  const canSubmit = photoPreview !== null && (text.trim().length > 0 || audioReady)
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioInputRef = useRef<HTMLInputElement>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null)
  const [waveformBars, setWaveformBars] = useState<number[]>([])
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitComplete, setIsSubmitComplete] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/observations?status=Approved`)
      .then(r => r.json())
      .then(data => setApprovedCount(data.length))
  }, [])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    audioChunksRef.current = []
    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      setAudioReady(true)
      stream.getTracks().forEach(t => t.stop())
      const url = URL.createObjectURL(blob)
      setRecordedBlobUrl(url)
      setWaveformBars(await extractWaveform(blob))
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioBlob(file)
    setAudioReady(true)
    const url = URL.createObjectURL(file)
    setRecordedBlobUrl(url)
    setWaveformBars(await extractWaveform(file))
  }

  function clearRecording() {
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl)
    setAudioBlob(null)
    setAudioReady(false)
    setRecordedBlobUrl(null)
    setWaveformBars([])
    setIsPlayingBack(false)
    setPlaybackProgress(0)
  }

  function togglePlayback() {
    const player = audioPlayerRef.current
    if (!player) return
    if (isPlayingBack) {
      player.pause()
      setIsPlayingBack(false)
    } else {
      player.play().catch(() => {})
      setIsPlayingBack(true)
    }
  }

  function seekToFraction(fraction: number) {
    const player = audioPlayerRef.current
    if (!player || !player.duration) return
    const clamped = Math.max(0, Math.min(1, fraction))
    player.currentTime = clamped * player.duration
    setPlaybackProgress(clamped)
  }

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    seekToFraction((e.clientX - rect.left) / rect.width)
  }

  function handleWaveformTouch(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    seekToFraction((e.touches[0].clientX - rect.left) / rect.width)
  }

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

  async function handleSubmit() {
    if (!canSubmit || !photoPreview) return
    setIsSubmitting(true)
    setIsSubmitComplete(false)

    const observationId = crypto.randomUUID()

    // Transcribe audio first if present
    let audioTranscript = ''
    if (audioBlob) {
      try {
        const transcribeForm = new FormData()
        transcribeForm.append('file', audioBlob, 'recording.webm')
        const transcribeRes = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: transcribeForm })
        if (!transcribeRes.ok) throw new Error(`status ${transcribeRes.status}`)
        const transcribeData = await transcribeRes.json()
        audioTranscript = transcribeData.transcript?.trim() ?? ''
        if (!audioTranscript) {
          setError('No speech detected in your recording. Please re-record in a quieter environment, or add a text note instead.')
          setIsSubmitting(false)
          return
        }
      } catch {
        setError('Could not transcribe your audio. Please re-record clearly or switch to a text note.')
        setIsSubmitting(false)
        return
      }
    }

    const formData = new FormData()
    const photoInput = photoInputRef.current
    if (photoInput?.files?.[0]) formData.append('photos', photoInput.files[0])
    if (text.trim()) formData.append('text_description', text.trim())
    if (audioTranscript) formData.append('audio_transcript', audioTranscript)

    try {
      const res = await fetch(`${API_URL}/observations?observation_id=${observationId}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setIsSubmitComplete(true)
      setTimeout(() => navigate(`/review/${data.observation_id}`), 900)
    } catch (err) {
      console.error('Submit failed:', err)
      setError('Submission failed. Please check your connection and try again.')
      setIsSubmitting(false)
      setIsSubmitComplete(false)
    }
  }


  return (
    <div className="min-h-screen bg-offwhite">
      {isSubmitting && <LoadingOverlay isComplete={isSubmitComplete} hasAudio={audioReady} />}
      <Header approvedCount={approvedCount} />
      <div className="max-w-lg mx-auto px-4 py-8">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">New Observation</h1>
          <p className="text-base text-slate-400 mt-1.5 italic">
            Add a <span className="text-blue-700 font-bold not-italic">photo</span> and a <span className="text-sky-400 font-bold not-italic">note or recording</span> to continue.
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-base">
            {error}
          </div>
        )}

        <div className="flex flex-col">

          {/* Photo tile — step 1, always required */}
          <div
            onClick={() => photoInputRef.current?.click()}
            className="bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98] min-h-52 relative"
          >
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Preview" className="w-full max-h-72 object-cover" />
                <span
                  className="absolute top-3 right-3 text-white text-sm font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#2C5F2E' }}
                >
                  ✓ Photo added
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click() }}
                  className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Retake
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 h-52">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <p className="text-base font-semibold text-slate-700">Upload a photo</p>
                <p className="text-sm text-slate-400">Tap to choose a file</p>
              </div>
            )}
          </div>

          {/* Connector: dashed line dropping from photo to the bracket bar below */}
          <div className="py-1" style={{ paddingLeft: '10px' }}>
            <div className="h-5 border-l-2 border-dashed border-sky-300 opacity-50" />
          </div>

          {/* Audio + Text outer box — contains both tiles, bracket bar on left shows they're siblings */}
          <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="flex">

              {/* Left bracket column: dashed vertical bar */}
              <div className="w-5 shrink-0 relative">
                <div className="absolute border-l-2 border-dashed border-sky-300 opacity-50" style={{ left: '10px', top: '12px', bottom: '12px' }} />
              </div>

              {/* Tiles column */}
              <div className="flex-1 pr-3 pt-3 pb-3 flex flex-col gap-3">

                {/* Audio tile — horizontal connector branches from bracket bar */}
                <div className="relative">
                  <div className="absolute border-t-2 border-dashed border-sky-300 opacity-50" style={{ left: '-10px', width: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <div className="bg-sky-50 rounded-2xl border border-sky-200 overflow-hidden relative">
                    <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                    <audio
                      ref={audioPlayerRef}
                      src={recordedBlobUrl ?? undefined}
                      onEnded={() => { setIsPlayingBack(false); setPlaybackProgress(1) }}
                      onTimeUpdate={(e) => {
                        const a = e.currentTarget
                        if (a.duration) setPlaybackProgress(a.currentTime / a.duration)
                      }}
                      className="hidden"
                    />
                    {audioReady ? (
                      <div className="px-5 py-5 flex flex-col gap-4">
                        {/* Scrubable waveform with playhead */}
                        <div
                          className="relative flex items-center gap-[2px] w-full cursor-pointer select-none"
                          style={{ height: '56px' }}
                          onClick={handleWaveformClick}
                          onTouchMove={handleWaveformTouch}
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
                          {/* Playhead */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 rounded-full pointer-events-none"
                            style={{ left: `${playbackProgress * 100}%`, backgroundColor: '#1d4ed8' }}
                          />
                        </div>
                        {/* Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={togglePlayback}
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all"
                            style={{ backgroundColor: '#2563EB' }}
                          >
                            {isPlayingBack ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <polygon points="5,3 19,12 5,21"/>
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">Recording saved</span>
                            <span className="text-xs text-slate-400">Tap play to review</span>
                          </div>
                          <button onClick={clearRecording} className="text-sm font-semibold text-red-400 hover:text-red-500 active:scale-95 transition-all">
                            Re-record
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-8 flex flex-col items-center justify-center gap-4">
                        <button
                          onMouseDown={startRecording}
                          onMouseUp={stopRecording}
                          onMouseLeave={stopRecording}
                          onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                          onTouchEnd={stopRecording}
                          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                            isRecording
                              ? 'bg-red-500 scale-110 shadow-red-200'
                              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-200'
                          }`}
                        >
                          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="2" width="6" height="11" rx="3"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                          </svg>
                        </button>
                        {isRecording && (
                          <div className="flex items-end justify-center gap-[3px] w-full" style={{ height: '40px' }}>
                            {Array.from({ length: 20 }, (_, i) => (
                              <div key={i} className="rounded-full w-2.5 animate-waveform" style={{ height: '40px', backgroundColor: '#2563EB', animationDelay: `${i * 0.05}s` }} />
                            ))}
                          </div>
                        )}
                        <p className="text-base font-semibold text-slate-700">
                          {isRecording ? 'Recording — release to stop' : 'Hold to record'}
                        </p>
                        <p onClick={() => audioInputRef.current?.click()} className="text-sm text-slate-400 underline cursor-pointer hover:text-slate-600">
                          or upload an audio file
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* OR coin */}
                <div className="flex items-center justify-center -my-1">
                  <span className="bg-white border border-slate-200 text-slate-400 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm tracking-widest">
                    OR
                  </span>
                </div>

                {/* Text tile — horizontal connector branches from bracket bar */}
                <div className="relative">
                  <div className="absolute border-t-2 border-dashed border-sky-300 opacity-50" style={{ left: '-10px', width: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <div className="bg-sky-50 rounded-2xl border border-sky-200 p-5 flex flex-col gap-3">
                    {text.length > 0 && (
                      <div className="flex justify-end">
                        <span
                          className="text-white text-sm font-bold px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: '#2C5F2E' }}
                        >
                          ✓ Note added
                        </span>
                      </div>
                    )}
                    <textarea
                      rows={5}
                      placeholder="Describe what you found..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full text-base text-slate-800 placeholder-slate-400 resize-none outline-none leading-relaxed bg-transparent"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Submit */}
        <div className="mt-6">
          {!canSubmit && (
            <p className="text-sm text-center mb-3 text-slate-400">
              {!photoPreview
                ? <>Add a <span className="text-blue-700 font-bold">photo</span> to continue</>
                : <>Add a <span className="text-sky-400 font-bold">note or recording</span> to continue</>
              }
            </p>
          )}
          <button
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            style={!canSubmit ? {
              background: 'repeating-linear-gradient(-45deg, #f1f5f9 0px, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
            } : {}}
            className={`w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all active:scale-[0.97] ${
              canSubmit && !isSubmitting
                ? 'bg-blue-700 text-white hover:bg-blue-600 cursor-pointer shadow-md shadow-blue-200'
                : 'text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {canSubmit ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
              <span>Submit Observation</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  )
}

const STEP_DELAYS = [2500, 5500, 10000, 15000]

function LoadingOverlay({ isComplete, hasAudio }: { isComplete: boolean; hasAudio: boolean }) {
  const STEPS = hasAudio
    ? ['Transcribing audio', 'Analyzing photo', 'Identifying defects', 'Classifying severity', 'Generating report']
    : ['Analyzing photo', 'Reading your notes', 'Identifying defects', 'Classifying severity', 'Generating report']
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

      {/* "Flowing" marquee */}
      <div className="w-full max-w-sm overflow-hidden flex justify-center h-7">
        <span className="animate-flowing text-base font-bold tracking-[0.3em]" style={{ color: '#2563EB' }}>
          Flowing
        </span>
      </div>

      {/* River animation */}
      <div className="w-full max-w-sm">
        <svg viewBox="0 0 320 30" className="w-full" style={{ height: '30px' }}>
          {/* River channel — soft fill */}
          <path
            d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15"
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Flowing current — animated dashes */}
          <path
            d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-river"
          />
        </svg>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm flex flex-col gap-5">
        {STEPS.map((label, i) => {
          const done = i < completedCount
          const active = i === completedCount
          return (
            <div
              key={i}
              className={`flex items-center gap-4 transition-all duration-500 ${done || active ? 'opacity-100' : 'opacity-20'}`}
            >
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
              <span className={`text-base font-semibold transition-colors duration-300 ${
                done ? 'text-slate-800' : active ? 'text-slate-800' : 'text-slate-300'
              }`}>
                {active ? `${label}${dots}` : label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
