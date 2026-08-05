import { createContext, useContext, useState } from 'react'

interface Inspector {
    id: number
    email: string
    name: string | null
    company_name: string | null
}

interface AuthContextValue {
    token: string | null
    inspector: Inspector | null
    login: (token: string, inspector: Inspector) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('token')
    )
    const [inspector, setInspector] = useState<Inspector | null>(() => {
        const stored = localStorage.getItem('inspector')
        return stored ? JSON.parse(stored) : null
    })

    function login(token: string, inspector: Inspector) {
        localStorage.setItem('token', token)
        localStorage.setItem('inspector', JSON.stringify(inspector))
        setToken(token)
        setInspector(inspector)
    }

    function logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('inspector')
        setToken(null)
        setInspector(null)
    }

    return (
        <AuthContext.Provider value={{ token, inspector, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}