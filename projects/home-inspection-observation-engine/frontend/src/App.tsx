import { Routes, Route } from 'react-router-dom'
import CapturePage from './pages/CapturePage'
import ReviewPage from './pages/ReviewPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CapturePage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
    </Routes>
  )
}

export default App