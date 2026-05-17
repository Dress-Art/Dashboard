'use client'
import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {DashboardLayout} from '@/components/layout/DashboardLayout'
import type {GridItem} from '@/components/dashboard/DraggableGrid'
import {DraggableGridClient} from '@/components/dashboard/DraggableGridClient'
import dashboardConfig from '@/config/dashboard.json'
import {AnalyticsWidget} from '@/modules/analytics/AnalyticsWidget'
import {UsersTable} from '@/modules/users/UsersTable'
import {NotificationsFeed} from '@/modules/notifications/NotificationsFeed'
import {EmailsWidget} from '@/modules/emails/EmailsWidget'
import {FeedbacksWidget} from '@/modules/feedbacks/FeedbacksWidget'
import {PaymentsWidget} from '@/modules/payments/PaymentsWidget'
import {CalendarWidget} from '@/modules/calendar/CalendarWidget'
import {SubscriptionsWidget} from '@/modules/subscriptions/SubscriptionsWidget'
import {ChatsWidget} from '@/modules/chats/ChatsWidget'
import {ApisWidget} from '@/modules/apis/ApisWidget'
import {MonitoringWidget} from '@/modules/monitoring/MonitoringWidget'
import {LanguagesWidget} from '@/modules/languages/LanguagesWidget'
import {SettingsWidget} from '@/modules/settings/SettingsWidget'
import {useAuthContext} from '@/contexts/AuthContext'
import type {Role} from '@/lib/roles'
import type {DashboardConfig, DashboardModule} from '@/types/dashboard'
import type {ReactNode} from 'react'

/**
 * Page d'accueil par rôle. L'admin garde la grille de widgets ; les autres
 * professionnels sont redirigés vers leur module métier principal.
 */
const ROLE_LANDING: Partial<Record<Role, string>> = {
    couturier: '/modules/couturier',
    agent: '/modules/orders',
    livreur: '/me/deliveries',
    vendeur: '/modules/tissus',
}

/**
 * Home
 * Page d'accueil du dashboard. L'auth + le gate professionnel sont gérés par
 * DashboardLayout (cf. composant). On se concentre ici sur la composition des
 * widgets selon `dashboard.json`.
 */
function renderModule(key: DashboardModule['key']): ReactNode {
    switch (key) {
        case 'analytics':
            return <AnalyticsWidget />
        case 'users':
            return <UsersTable />
        case 'notifications':
            return <NotificationsFeed />
        case 'emails':
            return <EmailsWidget />
        case 'feedbacks':
            return <FeedbacksWidget />
        case 'payments':
            return <PaymentsWidget />
        case 'calendar':
            return <CalendarWidget />
        case 'subscriptions':
            return <SubscriptionsWidget />
        case 'chats':
            return <ChatsWidget />
        case 'apis':
            return <ApisWidget />
        case 'monitoring':
            return <MonitoringWidget />
        case 'languages':
            return <LanguagesWidget />
        case 'settings':
            return <SettingsWidget />
        default:
            return null
    }
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

    const cfg = dashboardConfig as DashboardConfig
    const items: GridItem[] = (cfg.modules || [])
        .filter((m: DashboardModule) => m.visible)
        .filter((m: DashboardModule) => {
            if (!m.roles || m.roles.length === 0) return true
            if (!role) return false
            return m.roles.includes(role)
        })
        .sort((a: DashboardModule, b: DashboardModule) => a.order - b.order)
        .map((m: DashboardModule) => ({id: m.key, content: renderModule(m.key)}))
        .filter(it => it.content !== null)

    return (
        <DashboardLayout>
            <DraggableGridClient items={items} />
        </DashboardLayout>
    )
}
