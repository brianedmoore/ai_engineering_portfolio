import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../api'

export default function CapturePage() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [audioReady, setAudioReady] = useState(false)
  const canSubmit = photoPreview !== null && (text.trim().length > 0 || audioReady)
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [_audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [approvedCount, setApprovedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

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
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      setAudioReady(true)
      stream.getTracks().forEach(t => t.stop())
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioBlob(file)
    setAudioReady(true)
  }

  async function handleSubmit() {
    if (!canSubmit || !photoPreview) return
    setIsSubmitting(true)

    const observationId = crypto.randomUUID()
    const formData = new FormData()
    const photoInput = photoInputRef.current
    if (photoInput?.files?.[0]) formData.append('photos', photoInput.files[0])
    if (text.trim()) formData.append('text_description', text.trim())

    try {
      const res = await fetch(`${API_URL}/observations?observation_id=${observationId}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      navigate(`/review/${data.observation_id}`)
    } catch (err) {
      console.error('Submit failed:', err)
      setError('Submission failed. Please check your connection and try again.')
      setIsSubmitting(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Observation</h1>
            <p className="text-sm text-gray-500 mt-1">Add a photo and a note or recording to continue.</p>
          </div>
          {approvedCount > 0 && (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mt-1">
              ✓ {approvedCount} approved
            </span>
          )}
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* Photo tile */}
          <div
            onClick={() => photoInputRef.current?.click()}
            className="bg-white rounded-2xl border border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-gray-400 transition-colors min-h-40 relative"
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
                <img src={photoPreview} alt="Preview" className="w-full max-h-64 object-cover" />
                <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Photo added</span>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 h-40">
                <div className="text-3xl">📷</div>
                <p className="text-sm font-medium text-gray-700">Upload a photo</p>
                <p className="text-xs text-gray-400">Tap to choose a file</p>
              </div>
            )}
          </div>

          {/* Audio tile */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center gap-3 relative">
            {audioReady && (
              <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Audio added</span>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording() }}
              onTouchEnd={stopRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? 'bg-red-500 scale-110' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <span className="text-white text-xl">🎙</span>
            </button>
            <p className="text-sm font-medium text-gray-700">
              {isRecording ? 'Recording... release to stop' : audioReady ? 'Recording saved' : 'Hold to record'}
            </p>
            {!audioReady && (
              <p
                onClick={() => audioInputRef.current?.click()}
                className="text-xs text-gray-400 underline cursor-pointer"
              >
                or upload an audio file
              </p>
            )}
          </div>
              

          {/* Text tile */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative">
            {text.length > 0 && (
              <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Note added</span>
            )}
            <textarea
              rows={4}
              placeholder="Describe what you found..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none"
            />
          </div>

        </div>

        {/* Submit button */}
        <div className="mt-6">
          {!canSubmit && (
            <p className="text-xs text-center text-gray-400 mb-2">
              {!photoPreview ? 'Add a photo to continue' : 'Add a note or recording to continue'}
            </p>
          )}
          <button
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${
              canSubmit && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                : 'bg-blue-600 text-white opacity-40 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Submit Observation'}
          </button>
        </div>

      </div>
    </div>
  )
}
