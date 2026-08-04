import { Routes, Route } from 'react-router-dom'
import CapturePage from './pages/CapturePage'
import ReviewPage from './pages/ReviewPage'
import ListPage from './pages/ListPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CapturePage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
      <Route path="/list" element={<ListPage />} />
    </Routes>
  )
}

export default App