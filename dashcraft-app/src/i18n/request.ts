import {getRequestConfig} from 'next-intl/server'
import {cookies} from 'next/headers'

/**
 * Charge dynamiquement les messages de traduction selon la locale courante.
 * La détection de locale est gérée par le middleware next-intl.
 */
export default getRequestConfig(async () => {
    const store = await cookies()
    const loc = store.get('NEXT_LOCALE')?.value ?? 'fr'
    try {
        const messages = (await import(`../messages/${loc}.json`)).default
        return {locale: loc, messages}
    } catch (err) {
        void err
        const messages = (await import('../messages/fr.json')).default
        return {locale: 'fr', messages}
    }
})
