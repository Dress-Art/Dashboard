import type {IconName} from '@/lib/icons'

export type DashboardKey =
	| 'analytics'
	| 'users'
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
	visible: boolean
	order: number
}

export interface DashboardConfig {
	modules: DashboardModule[]
}
