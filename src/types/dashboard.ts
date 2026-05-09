import type {IconName} from '@/lib/icons'
import type {Role} from '@/lib/roles'

export type DashboardKey =
    | 'analytics'
    | 'users'
    | 'orders'
    | 'delivery'
    | 'couturier'
    | 'tissus'
    | 'tassi'
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
    key: DashboardKey
    icon: IconName
    title?: string
    description?: string
    visible: boolean
    order: number
    category?: 'core' | 'business' | 'communication' | 'admin'
    /**
     * Rôles autorisés à voir ce module dans la sidebar.
     * Si absent, tous les rôles authentifiés y ont accès (équivaut à `ROLES`).
     */
    roles?: Role[]
}

export interface DashboardConfig {
    modules: DashboardModule[]
}
