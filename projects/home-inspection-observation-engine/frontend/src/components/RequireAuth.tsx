import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { token } = useAuth()
    const location = useLocation()

    if (!token) {
        return <Navigate to="/landing" state={{ from: location }} replace />
    }

    return <>{children}</>
}