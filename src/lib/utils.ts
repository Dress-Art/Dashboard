import {type ClassValue} from 'clsx'
import {clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'

/**
 * Concatène intelligemment des classes Tailwind.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Réduit un numéro de téléphone à ses chiffres pour comparaison naturelle.
 * Les utilisateurs entrent des formats mixtes (+22961198941, 22961198941,
 * 0061198941, 61198941) — on les compare uniquement par les digits.
 * À utiliser AVANT toute égalité ou jointure sur `customer_phone`.
 */
export function normalizePhone(phone: string | null | undefined): string {
	if (!phone) return ''
	return phone.replace(/\D/g, '')
}

/**
 * Égalité de téléphones tolérante aux préfixes/séparateurs.
 * `samePhone('+229 61 19 89 41', '0022961198941')` → vrai après normalisation
 * suffixe (les digits significatifs locaux matchent).
 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
	const na = normalizePhone(a)
	const nb = normalizePhone(b)
	if (!na || !nb) return false
	if (na === nb) return true
	// Tolérance préfixe pays : compare sur les 8 derniers digits (numéro local).
	const tail = (s: string) => s.slice(-8)
	return tail(na) === tail(nb) && tail(na).length === 8
}

/**
 * Convertit un numéro saisi par l'utilisateur en format E.164 attendu par Supabase
 * (`+229XXXXXXXX`). Tolère espaces, tirets, points, préfixes `00`, `+`, ou
 * numéro local 8 digits sans préfixe.
 *
 * Codes pays par défaut : Bénin (`229`). Pour un autre pays, passer en 2e arg.
 *
 * Exemples :
 *   '61198941'           → '+22961198941'
 *   '+229 61 19 89 41'   → '+22961198941'
 *   '0022961198941'      → '+22961198941'
 *   '22961198941'        → '+22961198941'
 *   ''                   → ''
 */
export function toE164(phone: string, defaultCountryCode = '229'): string {
	if (!phone) return ''
	const trimmed = phone.trim()
	const startsWithPlus = trimmed.startsWith('+')
	const digits = trimmed.replace(/\D/g, '')
	if (!digits) return ''
	if (startsWithPlus) return `+${digits}`
	// Préfixe international 00xxx... → on retire les 2 zéros et on ajoute +
	if (digits.startsWith('00')) return `+${digits.slice(2)}`
	// Inclut déjà le pays (ex: 22961198941, 11 chiffres pour Bénin)
	if (digits.startsWith(defaultCountryCode)) return `+${digits}`
	// Sinon on suppose un numéro local → on préfixe le pays
	return `+${defaultCountryCode}${digits}`
}
