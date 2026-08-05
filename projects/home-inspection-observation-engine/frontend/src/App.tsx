import { Routes, Route } from 'react-router-dom'
import CapturePage from './pages/CapturePage'
import ReviewPage from './pages/ReviewPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import InspectionsListPage from './pages/InspectionsListPage'
import NewInspectionPage from './pages/NewInspectionPage'
import InspectionDetailPage from './pages/InspectionDetailPage'
import ProfilePage from './pages/ProfilePage'
import LandingPage from './pages/LandingPage'
import { RequireAuth } from './components/RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<RequireAuth><InspectionsListPage /></RequireAuth>} />
      <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/inspections/new" element={<RequireAuth><NewInspectionPage /></RequireAuth>} />
      <Route path="/inspections/:id" element={<RequireAuth><InspectionDetailPage /></RequireAuth>} />
      <Route path="/inspections/:id/capture" element={<RequireAuth><CapturePage /></RequireAuth>} />
      <Route path="/review/:id" element={<RequireAuth><ReviewPage /></RequireAuth>} />
    </Routes>
  )
}

export default App