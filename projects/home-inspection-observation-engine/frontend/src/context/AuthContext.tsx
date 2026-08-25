import { createContext, useContext, useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL

interface Inspector {
    id: number
    email: string
    name: string | null
    company_name: string | null
    company_address: string | null
    company_phone: string | null
    license_number: string | null
    website: string | null
    has_headshot: boolean
    has_logo: boolean
}

interface AuthContextValue {
    token: string | null
    inspector: Inspector | null
    headshotUrl: string | null
    setHeadshotUrl: (url: string | null) => void
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
    const [headshotUrl, setHeadshotUrl] = useState<string | null>(null)

    useEffect(() => {
        if (token && inspector?.has_headshot) {
            fetch(`${API}/inspectors/me/headshot`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.blob())
                .then(b => setHeadshotUrl(URL.createObjectURL(b)))
                .catch(() => {})
        } else {
            setHeadshotUrl(null)
        }
    }, [inspector?.has_headshot, token])

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
        setHeadshotUrl(null)
    }

    return (
        <AuthContext.Provider value={{ token, inspector, headshotUrl, setHeadshotUrl, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}
