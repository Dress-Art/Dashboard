'use server'

import {cookies} from 'next/headers'
import {I18N_CONFIG, isSupportedLocale, type LocaleCode} from '@/config/i18n'

/**
 * setLocaleAction
 * Action serveur pour définir la langue via le cookie NEXT_LOCALE.
 * Persiste 1 an. Retourne la locale effectivement appliquée.
 */
export async function setLocaleAction (formData: FormData) {
    const store = await cookies()
    const desired = formData.get('locale')?.toString() ?? ''
    const locale: LocaleCode = isSupportedLocale(desired)
        ? (desired as LocaleCode)
        : I18N_CONFIG.defaultLocale

    store.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    })

    return {ok: true as const, locale}
}
