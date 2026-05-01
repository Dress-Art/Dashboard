/**
 * i18n configuration
 * Centralise les locales disponibles et leurs noms d'affichage.
 */

export type LocaleCode = 'fr' | 'en'

export const I18N_CONFIG = {
	defaultLocale: 'fr' as LocaleCode,
	available: ['fr', 'en'] as LocaleCode[],
	displayNames: {
		fr: 'Français',
		en: 'English',
	} as Record<LocaleCode, string>,
}

/**
 * Retourne la configuration i18n courante.
 */
export function getI18nConfig () {
	return I18N_CONFIG
}

/**
 * Vérifie si un code proposé est supporté.
 */
export function isSupportedLocale (code: string): code is LocaleCode {
	return I18N_CONFIG.available.includes(code as LocaleCode)
}

/**
 * Retourne le nom d'affichage d'une locale.
 */
export function getLocaleDisplayName (code: LocaleCode) {
	return I18N_CONFIG.displayNames[code] ?? code
}
