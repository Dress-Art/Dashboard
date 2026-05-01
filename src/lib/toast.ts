/**
 * Wrapper centralisé autour de sonner pour garder un seul point d'entrée
 * et homogénéiser les messages (durée, traduction d'erreurs réseau).
 */
import {toast} from 'sonner'

/**
 * Traduit les erreurs réseau / Supabase en messages utilisateur lisibles.
 * Fallback sur le message brut sinon.
 */
export function describeError(err: unknown): string {
    const e = err as {message?: string; status?: number} | null
    if (!e) return 'Erreur inconnue'
    if (e.message?.includes('Failed to fetch') || e.message?.includes('fetch')) {
        return 'Erreur de connexion réseau'
    }
    if (e.message?.includes('Unauthorized') || e.status === 401) {
        return 'Session expirée, veuillez vous reconnecter'
    }
    if (e.message?.includes('Forbidden') || e.status === 403) {
        return 'Vous n\'avez pas les permissions nécessaires'
    }
    if (err instanceof Error) return err.message
    return 'Erreur inattendue'
}

export const notify = {
    success: (message: string, description?: string) =>
        toast.success(message, {description}),
    error: (err: unknown, description?: string) =>
        toast.error(describeError(err), {description}),
    info: (message: string, description?: string) =>
        toast.info(message, {description}),
    loading: (message: string) => toast.loading(message),
    /**
     * Wrapper autour d'une promesse : toast loading → success/error automatique.
     * Usage : notify.promise(api.create(), {loading: 'Création...', success: 'Créé', error: 'Échec'})
     */
    promise: <T>(p: Promise<T>, msgs: {loading: string; success: string; error?: string}) =>
        toast.promise(p, {
            loading: msgs.loading,
            success: msgs.success,
            error: e => msgs.error ?? describeError(e),
        }),
}
