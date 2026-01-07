import {DashboardLayout} from '@/components/layout/DashboardLayout'
import type {DashboardModule} from '@/types/dashboard'
import {UsersPage} from '@/modules/users/UsersPage'
import {AgentsPage} from '@/modules/agents/AgentsPage'
import {DeliveryPage} from '@/modules/delivery/DeliveryPage'
import {CouturierModulePage} from '@/modules/couturier/CouturierModulePage'
import {NotificationsPage} from '@/modules/notifications/NotificationsPage'
import {EmailsPage} from '@/modules/emails/EmailsPage'
import {PaymentsPage} from '@/modules/payments/PaymentsPage'
import {FeedbacksPage} from '@/modules/feedbacks/FeedbacksPage'
import {CalendarPage} from '@/modules/calendar/CalendarPage'
import {SubscriptionsPage} from '@/modules/subscriptions/SubscriptionsPage'
import {ApisPage} from '@/modules/apis/ApisPage'
import {ChatsPage} from '@/modules/chats/ChatsPage'
import {MonitoringPage} from '@/modules/monitoring/MonitoringPage'
import {AnalyticsPage} from '@/modules/analytics/AnalyticsPage'
import {LanguagesPage} from '@/modules/languages/LanguagesPage'
import {SettingsPage} from '@/modules/settings/SettingsPage'
import {getTranslations} from 'next-intl/server'

interface ModulePageProps {
    params: {key: DashboardModule['key']}
}

/**
 * ModulePage
 * Route dynamique rendant la page spécifique au module. Next.js 15
 * exige d'attendre `params` avant d'utiliser ses propriétés.
 */
type AwaitedModulePageProps = {params: Promise<ModulePageProps['params']>}

/**
 * renderModulePage
 * Renvoie le composant de page correspondant à la clé du module.
 */
function renderModulePage(key: DashboardModule['key']) {
    switch (key) {
        case 'users':
            return <UsersPage />
        case 'agents':
            return <AgentsPage />
        case 'delivery':
            return <DeliveryPage />
        case 'couturier':
            return <CouturierModulePage />
        case 'notifications':
            return <NotificationsPage />
        case 'emails':
            return <EmailsPage />
        case 'feedbacks':
            return <FeedbacksPage />
        case 'payments':
            return <PaymentsPage />
        case 'subscriptions':
            return <SubscriptionsPage />
        case 'calendar':
            return <CalendarPage />
        case 'apis':
            return <ApisPage />
        case 'monitoring':
            return <MonitoringPage />
        case 'analytics':
            return <AnalyticsPage />
        case 'languages':
            return <LanguagesPage />
        case 'chats':
            return <ChatsPage />
        case 'settings':
            return <SettingsPage />
        default:
            return <div>Module non trouvé</div>
    }
}
export default async function ModulePage({params}: AwaitedModulePageProps) {
    const {key} = await params
    const t = await getTranslations('pages.generic')
    const page = renderModulePage(key)
    return (
        <DashboardLayout>
            {page ? (
                page
            ) : (
                <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                    <p className='text-sm text-white/80'>
                        {t('moduleLabel')}: {key}
                    </p>
                    <p className='text-xs text-white/60 mt-1'>
                        {t('comingSoon')}
                    </p>
                </div>
            )}
        </DashboardLayout>
    )
}

