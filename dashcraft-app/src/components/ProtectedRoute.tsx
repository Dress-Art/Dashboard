'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
    children: React.ReactNode
    redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
    const { user, loading } = useAuthContext()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push(redirectTo)
        }
    }, [user, loading, router, redirectTo])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    if (!user) {
        return null // Redirection en cours
    }

    return <>{children}</>
}