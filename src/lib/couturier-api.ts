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
 *   - table `mesures` : créée en prod, colonnes supposées
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
        .from('mesures')
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
        .from('mesures')
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
