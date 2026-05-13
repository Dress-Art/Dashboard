'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'

/**
 * Server action : liste les users avec `role = 'livreur'` pour la modale
 * d'assignation côté admin DeliveryPage.
 *
 * Lecture admin sur `auth.users` → service role obligatoire. Le check
 * d'identité passe par la session de l'appelant.
 *
 * Seuls les admins peuvent obtenir cette liste — un livreur ou couturier
 * n'a pas à connaître les autres livreurs disponibles.
 */
export interface DriverEntry {
    id: string
    name: string
    email: string
    phone: string | null
}

export interface ListDriversResult {
    success: boolean
    error?: string
    drivers: DriverEntry[]
}

export async function listDriversForAssignment(): Promise<ListDriversResult> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', drivers: []}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return {success: false, error: 'forbidden', drivers: []}
    }

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase.auth.admin.listUsers({page: 1, perPage: 500})
    if (error) {
        console.error('[listDriversForAssignment]', error)
        return {success: false, error: 'list_failed', drivers: []}
    }

    const drivers: DriverEntry[] = data.users
        .filter(u => {
            const appRole = (u.app_metadata as {role?: string} | null)?.role
            const userRole = (u.user_metadata as {role?: string} | null)?.role
            return appRole === 'livreur' || userRole === 'livreur'
        })
        .map(u => {
            const name = (u.user_metadata as {name?: string} | null)?.name
            return {
                id: u.id,
                name: name || u.email || u.phone || u.id,
                email: u.email ?? '',
                phone: u.phone ?? null,
            }
        })

    return {success: true, drivers}
}
