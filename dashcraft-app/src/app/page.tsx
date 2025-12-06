'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
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
import {useEffect, useState} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

/**
 * Home
 * Page d'accueil du dashboard.
 * Récupère la configuration centrale et rend les widgets dans une grille
 * drag-and-drop via `DraggableGrid`.
 */
export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            setLoading(false)

            if (!session?.user) {
                router.push('/login')
            }
        }

        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null)
                if (!session?.user) {
                    router.push('/login')
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    if (!user) {
        return null
    }

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

    const cfg = dashboardConfig as DashboardConfig
    const items: GridItem[] = (cfg.modules || [])
        .filter((m: DashboardModule) => m.visible)
        .sort((a: DashboardModule, b: DashboardModule) => a.order - b.order)
        .map((m: DashboardModule) => ({id: m.key, content: renderModule(m.key)}))

    return (
        <DashboardLayout>
            <DraggableGridClient items={items} />
        </DashboardLayout>
    )
}
