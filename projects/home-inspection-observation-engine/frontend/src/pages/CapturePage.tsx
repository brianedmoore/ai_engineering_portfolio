export default function CapturePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">New Observation</h1>
          <p className="text-sm text-gray-500 mt-1">Add a photo and a note or recording to continue.</p>
        </div>

        <div className="flex flex-col gap-4">

          {/* Photo tile */}
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-400 transition-colors min-h-40">
            <div className="text-3xl">📷</div>
            <p className="text-sm font-medium text-gray-700">Upload a photo</p>
            <p className="text-xs text-gray-400">Tap to choose a file</p>
          </div>

          {/* Audio tile */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center gap-3">
            <button className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-700 transition-colors">
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
          className="mt-6 w-full py-3 rounded-2xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed transition-colors"
        >
          Submit Observation
        </button>

      </div>
    </div>
  )
}