import type {IconName} from '@/lib/icons'

export type DashboardKey =
    | 'analytics'
    | 'users'
    | 'agents'
    | 'delivery'
    | 'notifications'
    | 'emails'
    | 'feedbacks'
    | 'payments'
    | 'calendar'
    | 'subscriptions'
    | 'chats'
    | 'apis'
    | 'monitoring'
    | 'languages'
    | 'settings'

export interface DashboardModule {
    key: 'users' | 'agents' | 'delivery' | 'notifications' | 'emails' | 'payments' | 'feedbacks' | 'calendar' | 'subscriptions' | 'apis' | 'chats' | 'monitoring' | 'analytics' | 'languages' | 'settings'
    icon: IconName
    title: string
    description: string
    visible: boolean
    order: number
    category?: 'core' | 'business' | 'communication' | 'admin'
}

export interface DashboardConfig {
    modules: DashboardModule[]
}
