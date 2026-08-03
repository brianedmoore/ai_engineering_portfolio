import { useState, useRef } from 'react'

export default function CapturePage() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New Observation</h1>
          <p className="text-sm text-gray-500 mt-1">Add a photo and a note or recording to continue.</p>
        </div>

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
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center gap-3">
            <button className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition-colors">
              <span className="text-white text-xl">🎙</span>
            </button>
            <p className="text-sm font-medium text-gray-700">Tap to record</p>
            <p className="text-xs text-gray-400 underline cursor-pointer">or upload an audio file</p>
          </div>

          {/* Text tile */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <textarea
              rows={4}
              placeholder="Describe what you found..."
              className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none"
            />
          </div>

        </div>

        {/* Submit button */}
        <button
          disabled
          className="mt-6 w-full py-3 rounded-2xl text-sm font-semibold bg-blue-600 text-white opacity-40 cursor-not-allowed transition-colors"
        >
          Submit Observation
        </button>

      </div>
    </div>
  )
}