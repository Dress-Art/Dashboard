import 'server-only'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, type Role} from '@/lib/roles'

/**
 * Erreur HTTP typée pour les routes API.
 */
export class HttpError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message?: string,
    ) {
        super(message ?? code)
        this.name = 'HttpError'
    }
}

interface SessionContext {
    userId: string
    role: Role
}

/**
 * Récupère la session authentifiée + le rôle pro depuis Supabase.
 * Lève HttpError(401) si pas de session.
 */
export async function getProSession(): Promise<SessionContext> {
    const supabase = await createSupabaseServerClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
        throw new HttpError(401, 'NOT_AUTHENTICATED')
    }
    const role = getUserRole(user)
    if (!role) {
        throw new HttpError(403, 'NO_ROLE')
    }
    return {userId: user.id, role}
}

interface OrderForGuard {
    id: string
    couturier_id: string | null
    agent_id: string | null
    couturier_confection_completed_at: string | null
}

/**
 * Garde d'autorisation pour le one-click "Lancer la livraison".
 * Spec §6.6 verbatim : ownership couturier OU affiliation agent OU admin,
 * + pré-condition `couturier_confection_completed_at IS NOT NULL`,
 * + anti-doublon (un seul shipment par order).
 *
 * Lève HttpError() avec un code stable pour mapping côté front.
 */
export async function assertCanLaunchDelivery(
    session: SessionContext,
    order: OrderForGuard,
): Promise<void> {
    if (!order.couturier_confection_completed_at) {
        throw new HttpError(409, 'CONFECTION_NOT_COMPLETED')
    }

    // Anti-doublon : un seul shipment Tassi par commande.
    // Service role pour bypass les RLS (l'auth a déjà été vérifiée via la session).
    const supabase = createSupabaseServiceClient()
    const {data: existing} = await supabase
        .from('tassi_shipments')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle()
    if (existing) {
        throw new HttpError(409, 'SHIPMENT_ALREADY_EXISTS')
    }

    switch (session.role) {
        case 'admin':
            return
        case 'couturier':
            if (order.couturier_id !== session.userId) {
                throw new HttpError(403, 'NOT_YOUR_ORDER')
            }
            return
        case 'agent':
            if (order.agent_id !== session.userId) {
                throw new HttpError(403, 'CLIENT_NOT_AFFILIATED')
            }
            return
        default:
            throw new HttpError(403, 'FORBIDDEN_ROLE')
    }
}
