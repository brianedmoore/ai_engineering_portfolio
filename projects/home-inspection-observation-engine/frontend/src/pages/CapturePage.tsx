import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { API_URL } from '../api'
import Header from '../components/Header'
import logoIcon from '../assets/logo-icon.png'

export default function CapturePage() {
  const { id: inspectionId } = useParams<{ id: string }>()
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const [text, setText] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const addMoreInputRef = useRef<HTMLInputElement>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [searchParams] = useSearchParams()
  const isNIMode = searchParams.get('type') === 'not-inspected'
  const canSubmit = isNIMode
    ? (text.trim().length > 0 || audioReady)
    : (photoPreviews.length > 0 && (text.trim().length > 0 || audioReady))
  const navigate = useNavigate()
  const [captureMode, setCaptureMode] = useState<'generate' | 'queue' | null>(null)
  const isSubmitting = captureMode !== null
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
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
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isSubmitComplete, setIsSubmitComplete] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/observations?status=Approved`)
      .then(r => r.json())
      .then(data => setApprovedCount(data.length))
  }, [])

  useEffect(() => {
    if (!isRecording) { setRecordingSeconds(0); return }
    const interval = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRecording])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    photoPreviews.forEach(url => URL.revokeObjectURL(url))
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)))
    setPhotoFiles(files)
    setActivePreviewIndex(0)
    e.target.value = ''
  }

  function handleAddMore(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    setPhotoFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index])
    const next = photoPreviews.filter((_, i) => i !== index)
    setPhotoPreviews(next)
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setActivePreviewIndex(prev => Math.min(prev, Math.max(0, next.length - 1)))
  }

  async function startRecording() {
    setAudioError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setAudioError('Microphone access denied. Allow microphone access in your browser settings, or use a text note instead.')
      } else if (name === 'NotFoundError') {
        setAudioError('No microphone found. Use a text note instead.')
      } else {
        setAudioError('Could not access microphone. Use a text note instead.')
      }
      return
    }
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

  async function handleGenerateNow() {
    if (!canSubmit) return
    setCaptureMode('generate')
    setIsSubmitComplete(false)

    const observationId = crypto.randomUUID()

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
          setCaptureMode(null)
          return
        }
      } catch {
        setError('Could not transcribe your audio. Please re-record clearly or switch to a text note.')
        setCaptureMode(null)
        return
      }
    }

    const formData = new FormData()
    photoFiles.forEach(f => formData.append('photos', f))
    if (text.trim()) formData.append('text_description', text.trim())
    if (audioTranscript) formData.append('audio_transcript', audioTranscript)
    if (inspectionId) formData.append('inspection_id', inspectionId)

    try {
      const res = await fetch(`${API_URL}/observations?observation_id=${observationId}`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detail = errData.detail ?? 'Something went wrong processing your observation.'
        setError(`${detail} Your photos and notes are intact — tap Submit to try again.`)
        setCaptureMode(null)
        setIsSubmitComplete(false)
        return
      }
      const data = await res.json()
      setIsSubmitComplete(true)
      setTimeout(() => navigate(`/review/${data.observation_id}`), 900)
    } catch (err) {
      console.error('Generate now failed:', err)
      setError('Could not reach the server. Check your connection and tap Submit to try again.')
      setCaptureMode(null)
      setIsSubmitComplete(false)
    }
  }

  async function handleAddToQueue() {
    if (!canSubmit) return
    setCaptureMode('queue')
    setIsSubmitComplete(false)

    const observationId = crypto.randomUUID()
    const formData = new FormData()
    photoFiles.forEach(f => formData.append('photos', f))
    if (text.trim()) formData.append('text_description', text.trim())
    if (audioBlob) formData.append('audio_file', audioBlob, 'recording.webm')
    if (inspectionId) formData.append('inspection_id', inspectionId)

    try {
      const res = await fetch(`${API_URL}/observations/raw?observation_id=${observationId}`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detail = errData.detail ?? 'Something went wrong saving your observation.'
        setError(`${detail} Your photos and notes are intact — tap Add to Queue to try again.`)
        setCaptureMode(null)
        setIsSubmitComplete(false)
        return
      }
      setIsSubmitComplete(true)
      setTimeout(() => navigate(`/inspections/${inspectionId}`), 700)
    } catch (err) {
      console.error('Add to queue failed:', err)
      setError('Could not reach the server. Check your connection and tap Add to Queue to try again.')
      setCaptureMode(null)
      setIsSubmitComplete(false)
    }
  }

  async function handleSubmitNotInspected() {
    if (!canSubmit) return
    setCaptureMode('generate')
    setIsSubmitComplete(false)

    const notInspectedId = crypto.randomUUID()
    const formData = new FormData()
    formData.append('not_inspected_id', notInspectedId)
    if (inspectionId) formData.append('inspection_id', inspectionId)
    if (text.trim()) formData.append('text_description', text.trim())
    if (audioBlob) formData.append('audio_file', audioBlob, 'recording.webm')
    photoFiles.forEach(f => formData.append('photos', f))

    try {
      const res = await fetch(`${API_URL}/observations/not-inspected`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(errData.detail ?? 'Something went wrong. Please try again.')
        setCaptureMode(null)
        setIsSubmitComplete(false)
        return
      }
      setIsSubmitComplete(true)
      setTimeout(() => navigate(`/inspections/${inspectionId}`), 900)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setCaptureMode(null)
      setIsSubmitComplete(false)
    }
  }


  return (
    <div className="min-h-screen bg-offwhite">
      {isSubmitting && <LoadingOverlay mode={captureMode!} isComplete={isSubmitComplete} hasAudio={audioReady} photoCount={photoPreviews.length} isNotInspected={isNIMode} />}
      <Header approvedCount={approvedCount} inspectionId={inspectionId} />
      <div className="max-w-lg mx-auto px-4 py-8">

        {inspectionId && (
          <button
            onClick={() => navigate(`/inspections/${inspectionId}`)}
            className="text-base text-blue-600 mb-6 flex items-center gap-1 hover:text-blue-500 font-medium"
          >
            ← Back to inspection
          </button>
        )}

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            onClick={() => { navigate(`/inspections/${inspectionId}/capture`) }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isNIMode ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}
          >
            Observation
          </button>
          <button
            onClick={() => navigate(`/inspections/${inspectionId}/capture?type=not-inspected`)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isNIMode ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}
          >
            Not Inspected
          </button>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isNIMode ? 'Not Inspected' : 'New Observation'}
          </h1>
          <p className="text-base text-slate-400 mt-1.5 italic">
            {isNIMode
              ? 'Describe why this component couldn\'t be inspected.'
              : <>Add a <span className="text-blue-700 font-bold not-italic">photo</span> and a <span className="text-sky-400 font-bold not-italic">note or recording</span> to continue.</>
            }
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-base">
            {error}
          </div>
        )}

        <div className="flex flex-col">

          {/* Photo tile */}
          <div
            onClick={photoPreviews.length === 0 ? () => photoInputRef.current?.click() : undefined}
            className={`bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden transition-all active:scale-[0.98] min-h-52 relative ${photoPreviews.length === 0 ? 'cursor-pointer hover:border-blue-400' : ''}`}
          >
            {/* Hidden inputs */}
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
            <input ref={addMoreInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddMore} />

            {photoPreviews.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 h-52">
                {isNIMode && photoPreviews.length === 0 && (
                  <span className="absolute top-3 left-3 text-xs font-bold bg-white/80 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                    Optional
                  </span>
                )}
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <p className="text-base font-semibold text-slate-700">Add photos</p>
                <p className="text-sm text-slate-400">Tap to choose one or more</p>
              </div>
            )}

            {photoPreviews.length === 1 && (
              <>
                <img src={photoPreviews[0]} alt="Preview" className="w-full max-h-72 object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(0) }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-95 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3">
                  <span className="text-sm font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(44,95,46,0.88)', color: 'white' }}>
                    ✓ Photo added
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); addMoreInputRef.current?.click() }}
                    className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm border border-white/60 flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add more
                  </button>
                </div>
              </>
            )}

            {photoPreviews.length >= 2 && (
              <div className="p-5 pb-4 flex flex-col gap-4">
                {/* Card fan */}
                <div className="relative mx-8" style={{ aspectRatio: '4/3' }}>
                  {photoPreviews.map((url, i) => {
                    const n = photoPreviews.length
                    const rel = (i - activePreviewIndex + n) % n
                    const cardStyles = [
                      { transform: 'rotate(0deg) translate(0px,0px)', zIndex: 30, opacity: 1, shadow: '0 8px 24px rgba(0,0,0,0.18)' },
                      { transform: 'rotate(4deg) translate(14px,5px)', zIndex: 20, opacity: 1, shadow: '0 4px 12px rgba(0,0,0,0.12)' },
                      { transform: 'rotate(8deg) translate(26px,9px)', zIndex: 10, opacity: 0.8, shadow: '0 2px 8px rgba(0,0,0,0.08)' },
                    ]
                    const cs = cardStyles[Math.min(rel, 2)]
                    const isHidden = rel >= 3
                    return (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-xl overflow-hidden transition-all duration-300 select-none"
                        style={{ transform: cs.transform, zIndex: cs.zIndex, opacity: isHidden ? 0 : cs.opacity, boxShadow: cs.shadow, pointerEvents: isHidden ? 'none' : 'auto' }}
                        onClick={() => rel === 0 ? setActivePreviewIndex((activePreviewIndex + 1) % n) : setActivePreviewIndex(i)}
                      >
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
                        {rel === 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-95 transition-all"
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Controls */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#EBF2EC', color: '#2C5F2E' }}>
                    ✓ {photoPreviews.length} photos · {activePreviewIndex + 1}/{photoPreviews.length}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); addMoreInputRef.current?.click() }}
                    className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add photo
                  </button>
                </div>
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
                        {/* Button with pulse rings */}
                        <div className="relative flex items-center justify-center">
                          {isRecording && (
                            <>
                              <div className="absolute w-20 h-20 rounded-full bg-red-400 animate-recording-pulse" />
                              <div className="absolute w-20 h-20 rounded-full bg-red-400 animate-recording-pulse-delay" />
                            </>
                          )}
                          <button
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                            onTouchEnd={stopRecording}
                            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
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
                        </div>
                        {isRecording ? (
                          <>
                            <div className="flex items-end justify-center gap-[3px] w-full" style={{ height: '40px' }}>
                              {Array.from({ length: 20 }, (_, i) => (
                                <div key={i} className="rounded-full w-2.5 animate-waveform" style={{ height: '40px', backgroundColor: '#2563EB', animationDelay: `${i * 0.05}s` }} />
                              ))}
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-2xl font-bold tabular-nums" style={{ color: '#dc2626' }}>
                                {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                              </span>
                              <span className="text-sm text-slate-400 font-medium">Release to stop</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-base font-semibold text-slate-700">Hold to record</p>
                        )}
                        {audioError && (
                          <p className="text-sm text-red-500 font-medium text-center px-2">{audioError}</p>
                        )}
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
                      placeholder={isNIMode ? 'Describe why it couldn\'t be inspected...' : 'Describe what you found...'}
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
        <div className="mt-6 flex flex-col gap-3">
          {isNIMode ? (
            <>
              {!canSubmit && (
                <p className="text-sm text-center text-slate-400">
                  Add a <span className="text-sky-400 font-bold">note or recording</span> to continue
                </p>
              )}
              <button
                disabled={!canSubmit || isSubmitting}
                onClick={handleSubmitNotInspected}
                style={!canSubmit ? {
                  background: 'repeating-linear-gradient(-45deg, #f1f5f9 0px, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
                } : {}}
                className={`w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all active:scale-[0.97] ${
                  canSubmit && !isSubmitting
                    ? 'bg-indigo-600 text-white cursor-pointer shadow-md shadow-indigo-200'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                Submit Not Inspected
              </button>
              {canSubmit && (
                <p className="text-xs text-center text-slate-400">Photos are optional for not-inspected items.</p>
              )}
            </>
          ) : (
            <>
              {!canSubmit && (
                <p className="text-sm text-center text-slate-400">
                  {photoPreviews.length === 0
                    ? <>Add a <span className="text-blue-700 font-bold">photo</span> to continue</>
                    : <>Add a <span className="text-sky-400 font-bold">note or recording</span> to continue</>
                  }
                </p>
              )}
              <button
                disabled={!canSubmit || isSubmitting}
                onClick={handleGenerateNow}
                style={!canSubmit ? {
                  background: 'repeating-linear-gradient(-45deg, #f1f5f9 0px, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
                } : {}}
                className={`w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all active:scale-[0.97] ${
                  canSubmit && !isSubmitting
                    ? 'bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-200'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                Generate Now
              </button>
              <button
                disabled={!canSubmit || isSubmitting}
                onClick={handleAddToQueue}
                style={!canSubmit ? {
                  background: 'repeating-linear-gradient(-45deg, #f1f5f9 0px, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
                } : {}}
                className={`w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all active:scale-[0.97] ${
                  canSubmit && !isSubmitting
                    ? 'bg-sky-500 text-white cursor-pointer shadow-md shadow-sky-200'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                Add to Queue
              </button>
              {canSubmit && (
                <div className="flex flex-col gap-1 px-2">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-blue-700">Generate Now</span> — AI processes immediately, review right away.
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-sky-500">Add to Queue</span> — Save now, process all at once when done walking the house.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}

const STEP_DELAYS = [2500, 5500, 10000, 15000]

function LoadingOverlay({ mode, isComplete, hasAudio, photoCount, isNotInspected }: { mode: 'generate' | 'queue'; isComplete: boolean; hasAudio: boolean; photoCount: number; isNotInspected?: boolean }) {
  if (isNotInspected) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#FAF9F6' }}>
        {isComplete ? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <div className="w-8 h-8 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin" />
        )}
        <p className="text-base font-semibold text-slate-700">
          {isComplete ? 'Saved' : 'Classifying...'}
        </p>
      </div>
    )
  }

  if (mode === 'queue') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#FAF9F6' }}>
        {isComplete ? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2C5F2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <div className="w-8 h-8 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
        )}
        <p className="text-base font-semibold text-slate-700">
          {isComplete ? 'Added to queue' : 'Saving...'}
        </p>
      </div>
    )
  }

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
        <span className="animate-flowing text-base font-bold tracking-[0.3em]" style={{ color: '#2563EB' }}>
          Flowing
        </span>
      </div>

      <div className="w-full max-w-sm">
        <svg viewBox="0 0 320 30" className="w-full" style={{ height: '30px' }}>
          <path
            d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15"
            fill="none" stroke="#bfdbfe" strokeWidth="7" strokeLinecap="round"
          />
          <path
            d="M0,15 C26.7,4 53.3,26 80,15 C106.7,4 133.3,26 160,15 C186.7,4 213.3,26 240,15 C266.7,4 293.3,26 320,15"
            fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"
            className="animate-river"
          />
        </svg>
      </div>

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
