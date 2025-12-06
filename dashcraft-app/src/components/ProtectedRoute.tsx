'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import type {GridItem} from '@/components/dashboard/DraggableGrid'
import {DraggableGridClient} from '@/components/dashboard/DraggableGridClient'
import dashboardConfig from '@/config/dashboard.json'

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

export default function Home() {
    const { user, loading } = useAuthContext()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    const cfg = dashboardConfig as DashboardConfig
    const items: GridItem[] = (cfg.modules || [])
        .filter((m: DashboardModule) => m.visible)
        .sort((a: DashboardModule, b: DashboardModule) => a.order - b.order)
        .map((m: DashboardModule) => ({id: m.key, content: renderModule(m.key)}))

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <DraggableGridClient items={items} />
            </DashboardLayout>
        </ProtectedRoute>
    )
}