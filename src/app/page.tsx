'use client'
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
import type {DashboardConfig, DashboardModule} from '@/types/dashboard'
import type {ReactNode} from 'react'

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
    const cfg = dashboardConfig as DashboardConfig
    const items: GridItem[] = (cfg.modules || [])
        .filter((m: DashboardModule) => m.visible)
        .sort((a: DashboardModule, b: DashboardModule) => a.order - b.order)
        .map((m: DashboardModule) => ({id: m.key, content: renderModule(m.key)}))
        .filter(it => it.content !== null)

    return (
        <DashboardLayout>
            <DraggableGridClient items={items} />
        </DashboardLayout>
    )
}
