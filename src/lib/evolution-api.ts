/**
 * Evolution API (https://evolution-api.com) — client HTTP server-only.
 *
 * Remplace MsgFlash : passerelle WhatsApp open-source basée sur Baileys.
 * Multi-instance, auth par header `apikey`.
 *
 * Env requises :
 *   - EVOLUTION_API_URL     (ex: https://evo.dressart.studio)
 *   - EVOLUTION_API_KEY     (clé globale)
 *   - EVOLUTION_INSTANCE    (nom de l'instance connectée, ex: dressart-main)
 *
 * ⚠️ Ce module ne doit JAMAIS être importé côté client : la clé API est
 * sensible. Toujours appeler depuis un server action / route handler.
 */

interface EvolutionConfig {
    baseUrl: string
    apiKey: string
    instance: string
}

function getConfig(): EvolutionConfig | null {
    const baseUrl = process.env.EVOLUTION_API_URL
    const apiKey = process.env.EVOLUTION_API_KEY
    const instance = process.env.EVOLUTION_INSTANCE

    if (!baseUrl || !apiKey || !instance) return null
    return {baseUrl: baseUrl.replace(/\/$/, ''), apiKey, instance}
}

export function normalizePhoneForEvolution(phone: string, defaultCountryCode = '229'): string {
    let digits = phone.replace(/[^\d+]/g, '')
    if (digits.startsWith('+')) digits = digits.slice(1)
    if (digits.startsWith('00')) digits = digits.slice(2)
    if (digits.startsWith('0')) digits = defaultCountryCode + digits.slice(1)
    if (!digits.startsWith(defaultCountryCode) && digits.length <= 10) {
        digits = defaultCountryCode + digits
    }
    return digits
}

export interface SendResult {
    success: boolean
    error?: string
    skipped?: string
}

export async function sendWhatsAppText(to: string, text: string): Promise<SendResult> {
    const config = getConfig()
    if (!config) return {success: false, skipped: 'evolution_not_configured'}
    if (!to || !text) return {success: false, skipped: 'missing_to_or_text'}

    const url = `${config.baseUrl}/message/sendText/${config.instance}`
    const number = normalizePhoneForEvolution(to)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: config.apiKey,
            },
            body: JSON.stringify({number, textMessage: text}),
        })

        if (!res.ok) {
            const body = await res.text().catch(() => '')
            return {success: false, error: `evolution_${res.status}: ${body.slice(0, 200)}`}
        }

        return {success: true}
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : 'unknown_error'}
    }
}

export async function sendWhatsAppMedia(
    to: string,
    media: string,
    options: {caption?: string; mediatype?: 'image' | 'video' | 'document'} = {},
): Promise<SendResult> {
    const config = getConfig()
    if (!config) return {success: false, skipped: 'evolution_not_configured'}
    if (!to || !media) return {success: false, skipped: 'missing_to_or_media'}

    const url = `${config.baseUrl}/message/sendMedia/${config.instance}`
    const number = normalizePhoneForEvolution(to)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: config.apiKey,
            },
            body: JSON.stringify({
                number,
                mediatype: options.mediatype ?? 'image',
                media,
                caption: options.caption ?? '',
            }),
        })

        if (!res.ok) {
            const body = await res.text().catch(() => '')
            return {success: false, error: `evolution_${res.status}: ${body.slice(0, 200)}`}
        }

        return {success: true}
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : 'unknown_error'}
    }
}
