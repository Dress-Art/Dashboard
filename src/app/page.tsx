'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {DashboardLayout} from '@/components/layout/DashboardLayout'
import {BusinessKpiStrip} from '@/components/dashboard/BusinessKpiStrip'
import {CouturierHome} from '@/components/dashboard/CouturierHome'
import {RecentOrdersWidget} from '@/components/dashboard/widgets/RecentOrdersWidget'
import {RecentDeliveriesWidget} from '@/components/dashboard/widgets/RecentDeliveriesWidget'
import {RecentNotificationsWidget} from '@/components/dashboard/widgets/RecentNotificationsWidget'
import {UpcomingAppointmentsWidget} from '@/components/dashboard/widgets/UpcomingAppointmentsWidget'
import {useAuthContext} from '@/contexts/AuthContext'
import type {Role} from '@/lib/roles'

/**
 * Tableau de bord — adapté au rôle :
 *   - admin     : KPI globaux + 4 widgets sur toutes les tables.
 *   - couturier : KPI créateur + ses commandes récentes + ses RDV.
 *   - livreur   : redirigé vers /me/deliveries (sa vue métier).
 *   - agent     : redirigé vers /modules/orders.
 *   - vendeur   : redirigé vers /modules/tissus.
 */
const ROLE_LANDING: Partial<Record<Role, string>> = {
    livreur: '/me/deliveries',
    agent: '/modules/orders',
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
                    {loading ? 'Chargement…' : 'Redirection vers votre espace…'}
                </div>
            </DashboardLayout>
        )
    }

    if (role === 'couturier') {
        return (
            <DashboardLayout>
                <CouturierHome />
            </DashboardLayout>
        )
    }

    // Admin (et fallback pour les rôles non explicitement gérés).
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
