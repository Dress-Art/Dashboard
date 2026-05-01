import type {User} from '@supabase/supabase-js'

/**
 * Rôles applicatifs DressArt. Stockés dans `auth.users.app_metadata.role`
 * pour ne pas être modifiables par l'utilisateur (à l'inverse de `user_metadata`).
 */
export type Role = 'admin' | 'couturier' | 'agent' | 'livreur' | 'vendeur' | 'client'

export const ROLES: readonly Role[] = ['admin', 'couturier', 'agent', 'livreur', 'vendeur', 'client'] as const

/**
 * Rôles professionnels autorisés à accéder au dashboard.
 * Les `client` sont des comptes marketplace — pas d'accès au dashboard.
 * Les comptes sans rôle non plus.
 */
export const PROFESSIONAL_ROLES: readonly Role[] = ['admin', 'couturier', 'agent', 'livreur', 'vendeur'] as const

export const ROLE_LABELS_FR: Record<Role, string> = {
    admin: 'Administrateur',
    couturier: 'Couturier',
    agent: 'Agent',
    livreur: 'Livreur',
    vendeur: 'Vendeur de tissus',
    client: 'Client',
}

/**
 * Lit le rôle depuis `app_metadata.role` (source de vérité serveur, immutable
 * côté user). Fallback sur `user_metadata.role` (legacy) puis `null` quand
 * non défini — un compte sans rôle n'a pas accès au dashboard.
 */
export function getUserRole(user: User | null | undefined): Role | null {
    if (!user) return null
    const fromApp = user.app_metadata?.role as Role | undefined
    if (fromApp && (ROLES as readonly string[]).includes(fromApp)) return fromApp
    const fromUser = user.user_metadata?.role as Role | undefined
    if (fromUser && (ROLES as readonly string[]).includes(fromUser)) return fromUser
    return null
}

/** Vrai si le rôle de `user` figure dans `allowed`. */
export function hasRole(user: User | null | undefined, allowed: readonly Role[]): boolean {
    const role = getUserRole(user)
    if (!role) return false
    return (allowed as readonly string[]).includes(role)
}

/** Vrai si le rôle est un rôle professionnel (= droit d'accéder au dashboard). */
export function isProfessionalRole(role: Role | null | undefined): boolean {
    if (!role) return false
    return (PROFESSIONAL_ROLES as readonly string[]).includes(role)
}
