import {NextResponse, type NextRequest} from 'next/server'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import {listTransactions} from '@/lib/fedapay'
import type {FedaPayStatus} from '@/lib/fedapay-types'

/**
 * GET /api/payments
 *
 * Proxy serveur qui interroge FedaPay (clé secrète côté serveur uniquement)
 * et retourne les transactions normalisées au client.
 *
 * Auth : session Supabase requise, rôle admin uniquement (les paiements
 * agrégés ne concernent pas couturiers/livreurs).
 *
 * Query params optionnels :
 *   - status : FedaPayStatus
 *   - page   : 1-indexed
 *   - perPage: défaut 25, max 100
 */
export async function GET(request: NextRequest) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) {
        return NextResponse.json({error: 'unauthorized'}, {status: 401})
    }
    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return NextResponse.json({error: 'forbidden'}, {status: 403})
    }

    const {searchParams} = new URL(request.url)
    const status = (searchParams.get('status') ?? undefined) as FedaPayStatus | undefined
    const page = Number(searchParams.get('page') ?? '') || undefined
    const perPage = Number(searchParams.get('perPage') ?? '') || undefined

    try {
        const result = await listTransactions({status, page, perPage})
        return NextResponse.json(result)
    } catch (err) {
        return NextResponse.json(
            {error: err instanceof Error ? err.message : 'fedapay_failed', transactions: [], total: 0},
            {status: 502},
        )
    }
}
