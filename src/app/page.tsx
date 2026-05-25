'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {DashboardLayout} from '@/components/layout/DashboardLayout'
import {BusinessKpiStrip} from '@/components/dashboard/BusinessKpiStrip'
import {RecentOrdersWidget} from '@/components/dashboard/widgets/RecentOrdersWidget'
import {RecentDeliveriesWidget} from '@/components/dashboard/widgets/RecentDeliveriesWidget'
import {RecentNotificationsWidget} from '@/components/dashboard/widgets/RecentNotificationsWidget'
import {UpcomingAppointmentsWidget} from '@/components/dashboard/widgets/UpcomingAppointmentsWidget'
import {useAuthContext} from '@/contexts/AuthContext'
import type {Role} from '@/lib/roles'

/**
 * Tableau de bord admin.
 *
 * Les rôles non-admin sont redirigés vers leur module métier principal.
 * Pour l'admin, on affiche :
 *   1. La frise KPI (revenue, comptages, livraisons en cours)
 *   2. Quatre widgets temps réel branchés sur les vraies tables
 *      (orders, deliveries, notifications_log, orders.appointment_date).
 *
 * La grille draggable des widgets mock (Analytics, Users, Notifications,
 * Emails, Payments, Calendar, Chats…) a été retirée : ces écrans existent
 * déjà comme pages dédiées avec vraies données, pas besoin de doublons
 * sur la home.
 */
const ROLE_LANDING: Partial<Record<Role, string>> = {
    couturier: '/modules/couturier',
    agent: '/modules/orders',
    livreur: '/me/deliveries',
    vendeur: '/modules/tissus',
}

export default function Home() {
    const router = useRouter()
    const {role, loading} = useAuthContext()

    const landing = role ? ROLE_LANDING[role] : undefined

    useEffect(() => {
        if (loading) return
        if (landing) router.replace(landing)
    }, [loading, landing, router])

    if (loading || landing) {
        return (
            <DashboardLayout>
                <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                    Redirection vers votre espace…
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <BusinessKpiStrip />

                <div className="grid gap-4 lg:grid-cols-2">
                    <RecentOrdersWidget />
                    <RecentDeliveriesWidget />
                    <UpcomingAppointmentsWidget />
                    <RecentNotificationsWidget />
                </div>
            </div>
        </DashboardLayout>
    )
}
