'use client'

import { useAuthContext } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthenticatedLayoutProps {
    children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const { user, loading } = useAuthContext()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    // Not authenticated
    if (!user) {
        return null // Redirection en cours
    }

    // Authenticated
    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    )
}