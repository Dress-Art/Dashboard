import {supabase} from './supabase'

/**
 * Client couturier — appels directs Supabase JS (RLS opérationnelle).
 * Remplace `coutureAPI.listModels / createModel / listMeasurements / createMeasurement`
 * qui pointaient sur des Edge Functions cassées (cf. CORS + table `models`
 * inexistante côté `pro-list-models`).
 *
 * Conventions :
 *   - table `modeles` : colonnes `id, professional_id, name, description, price, created_at`
 *     (cf. supabase/migrations/20260513_add_orders_professional_id.sql).
 *   - table `measurements` : créée en prod, colonnes supposées
 *     `id, client_id, name, value, unit, created_at` (+ éventuellement
 *     `professional_id`). À ajuster si le schéma diffère.
 */

export interface ModelRow {
    id: string
    professional_id: string | null
    name: string
    description: string | null
    price: number
    created_at: string
}

export interface MeasurementRow {
    id: string
    client_id: string | null
    client_name?: string | null
    name: string
    value: number
    unit: string
    created_at: string
}

interface ListModelsParams {
    search?: string
    limit?: number
}

export async function listModels(params: ListModelsParams = {}): Promise<{
    models: ModelRow[]
    total: number
}> {
    let q = supabase
        .from('modeles')
        .select('*', {count: 'exact'})
        .order('created_at', {ascending: false})
        .limit(params.limit ?? 200)

    if (params.search?.trim()) {
        q = q.ilike('name', `%${params.search.trim()}%`)
    }

    const {data, count, error} = await q
    if (error) throw error
    return {models: (data ?? []) as ModelRow[], total: count ?? 0}
}

export async function createModel(input: {
    name: string
    description?: string
    price: number
}): Promise<ModelRow> {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const {data, error} = await supabase
        .from('modeles')
        .insert({
            name: input.name,
            description: input.description ?? null,
            price: input.price,
            professional_id: user.id,
        })
        .select()
        .single()

    if (error) throw error
    return data as ModelRow
}

interface ListMeasurementsParams {
    search?: string
    limit?: number
}

export async function listMeasurements(params: ListMeasurementsParams = {}): Promise<{
    measurements: MeasurementRow[]
    total: number
}> {
    let q = supabase
        .from('measurements')
        .select('*', {count: 'exact'})
        .order('created_at', {ascending: false})
        .limit(params.limit ?? 200)

    if (params.search?.trim()) {
        q = q.ilike('name', `%${params.search.trim()}%`)
    }

    const {data, count, error} = await q
    if (error) throw error
    return {measurements: (data ?? []) as MeasurementRow[], total: count ?? 0}
}

export async function createMeasurement(input: {
    client_id: string
    name: string
    value: number
    unit: string
}): Promise<MeasurementRow> {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const {data, error} = await supabase
        .from('measurements')
        .insert({
            client_id: input.client_id,
            name: input.name,
            value: input.value,
            unit: input.unit,
            professional_id: user.id,
        })
        .select()
        .single()

    if (error) throw error
    return data as MeasurementRow
}

// =============================================================================
// Clients
// =============================================================================

export type ClientStatus = 'active' | 'inactive' | 'suspended'

export interface ClientRow {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    postal_code: string | null
    status: ClientStatus
    total_orders: number | null
    total_spent: number | null
    last_order_at: string | null
    notes: string | null
    created_at: string
}

interface ListClientsParams {
    search?: string
    limit?: number
}

export async function listClients(params: ListClientsParams = {}): Promise<{
    clients: ClientRow[]
    total: number
}> {
    let q = supabase
        .from('clients')
        .select('*', {count: 'exact'})
        .order('created_at', {ascending: false})
        .limit(params.limit ?? 200)

    if (params.search?.trim()) {
        const s = params.search.trim()
        // Recherche multi-colonnes : name, email, phone (PostgREST `or`).
        q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
    }

    const {data, count, error} = await q
    if (error) throw error
    return {clients: (data ?? []) as ClientRow[], total: count ?? 0}
}

export async function createClient(input: {
    name: string
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    postal_code?: string | null
    notes?: string | null
}): Promise<ClientRow> {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const {data, error} = await supabase
        .from('clients')
        .insert({
            name: input.name,
            email: input.email ?? null,
            phone: input.phone ?? null,
            address: input.address ?? null,
            city: input.city ?? null,
            postal_code: input.postal_code ?? null,
            notes: input.notes ?? null,
            // Le couturier devient propriétaire (champ utilisé par RLS).
            // L'agent passe par `created_by_agent_id` côté serveur si besoin.
            professional_id: user.id,
        })
        .select()
        .single()

    if (error) throw error
    return data as ClientRow
}

export async function updateClient(id: string, input: {
    name?: string
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    postal_code?: string | null
    notes?: string | null
    status?: ClientStatus
}): Promise<ClientRow> {
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) {
        if (v !== undefined) patch[k] = v
    }

    const {data, error} = await supabase
        .from('clients')
        .update(patch)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as ClientRow
}

export async function deleteClient(id: string): Promise<void> {
    const {error} = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
}
