'use client'

import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { User, Session } from '@supabase/supabase-js'
import { getUserRole, type Role } from '@/lib/roles'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    isAuthenticated: boolean
    role: Role | null
    signIn: (email: string, password: string) => Promise<unknown>
    signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<unknown>
    signOut: () => Promise<unknown>
    resetPassword: (email: string) => Promise<unknown>
    updatePassword: (newPassword: string) => Promise<unknown>
    requestPhoneOtp: (phoneE164: string) => Promise<unknown>
    verifyPhoneOtp: (phoneE164: string, token: string) => Promise<unknown>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuth()
    const role = useMemo(() => getUserRole(auth.user), [auth.user])

    return (
        <AuthContext.Provider value={{...auth, role}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuthContext() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuthContext must be used within AuthProvider')
    }
    return context
}