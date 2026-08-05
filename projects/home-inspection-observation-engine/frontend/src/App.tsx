import { Routes, Route } from 'react-router-dom'
import CapturePage from './pages/CapturePage'
import ReviewPage from './pages/ReviewPage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<CapturePage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
      <Route path="/list" element={<ListPage />} />
    </Routes>
  )
}

export default App