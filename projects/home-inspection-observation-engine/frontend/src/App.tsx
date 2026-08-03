import { Routes, Route } from 'react-router-dom'
import CapturePage from './pages/CapturePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CapturePage />} />
    </Routes>
  )
}

export default App