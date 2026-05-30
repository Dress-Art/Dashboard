import {supabase} from './supabase'

/**
 * Client couturier — appels directs Supabase JS (RLS opérationnelle).
 *
 * Conventions schéma DressArt (cf. DDL prod) :
 *   - `modeles` : colonnes `nom`, `description`, `prix_base`, `image_url`,
 *     `professional_id` (FK -> professional_profiles.id), `categorie`.
 *   - `measurements` : 1 row par auth.users (UNIQUE user_id). 14 colonnes
 *     dédiées (longueur_pantalon, ceinture, …, ventre) + `extra_fields`
 *     jsonb pour les mesures personnalisées, + `unit` unique sur la ligne.
 *   - `clients` : carnet d'adresses du couturier (id, professional_id,
 *     user_id, name, email, phone, address, city, postal_code, notes,
 *     status). `user_id` pointe sur auth.users → c'est par lui qu'on
 *     accède aux measurements.
 */

// =============================================================================
// Helpers — résolution professional_profiles.id du couturier connecté
// =============================================================================

async function getMyProfessionalProfileId(): Promise<string> {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const {data: existing, error: selError} = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    if (selError) throw selError
    if (existing) return existing.id as string

    // Pas encore de profil pro → on crée la row minimale pour que les FK passent.
    const {data: created, error: insError} = await supabase
        .from('professional_profiles')
        .insert({user_id: user.id})
        .select('id')
        .single()
    if (insError) throw insError
    return created.id as string
}

// =============================================================================
// Modèles
// =============================================================================

export interface ModelRow {
    id: string
    professional_id: string | null
    name: string
    description: string | null
    price: number
    image_url: string | null
    created_at: string
}

interface ListModelsParams {
    search?: string
    limit?: number
    /** Si true, ne renvoie que les modèles du couturier connecté. */
    ownOnly?: boolean
}

export async function listModels(params: ListModelsParams = {}): Promise<{
    models: ModelRow[]
    total: number
}> {
    let myProfileId: string | null = null
    if (params.ownOnly) {
        try {
            myProfileId = await getMyProfessionalProfileId()
        } catch {
            return {models: [], total: 0}
        }
    }

    let q = supabase
        .from('modeles')
        .select('*', {count: 'exact'})
        .order('created_at', {ascending: false})
        .limit(params.limit ?? 200)

    if (params.search?.trim()) {
        q = q.ilike('nom', `%${params.search.trim()}%`)
    }
    if (myProfileId) {
        q = q.eq('professional_id', myProfileId)
    }

    const {data, count, error} = await q
    if (error) throw error

    const models = (data ?? []).map((row: Record<string, unknown>) => {
        const rawPrice = row.prix_base ?? row.price ?? row.prix
        const price = typeof rawPrice === 'number' && !Number.isNaN(rawPrice)
            ? rawPrice
            : Number(rawPrice ?? 0) || 0
        return {
            id: row.id as string,
            professional_id: (row.professional_id as string | null) ?? null,
            name: (row.nom as string) ?? (row.name as string) ?? '',
            description: (row.description as string | null) ?? null,
            price,
            image_url: (row.image_url as string | null) ?? null,
            created_at: (row.created_at as string) ?? new Date().toISOString(),
        } as ModelRow
    })

    return {models, total: count ?? 0}
}

export async function createModel(input: {
    name: string
    description?: string
    price: number
    image_url?: string | null
    category?: string | null
}): Promise<ModelRow> {
    const professionalId = await getMyProfessionalProfileId()

    const {data, error} = await supabase
        .from('modeles')
        .insert({
            nom: input.name,
            description: input.description ?? null,
            prix_base: input.price,
            image_url: input.image_url ?? null,
            categorie: input.category ?? null,
            professional_id: professionalId,
        })
        .select()
        .single()

    if (error) throw error
    const row = data as Record<string, unknown>
    return {
        id: row.id as string,
        professional_id: (row.professional_id as string | null) ?? null,
        name: (row.nom as string) ?? '',
        description: (row.description as string | null) ?? null,
        price: Number(row.prix_base ?? 0),
        image_url: (row.image_url as string | null) ?? null,
        created_at: (row.created_at as string) ?? new Date().toISOString(),
    }
}

export async function uploadModelImage(file: File, modelKey?: string): Promise<string> {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const key = modelKey ?? String(Date.now())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${key}/${safeName}`

    const {error: uploadError} = await supabase.storage
        .from('model-images')
        .upload(path, file, {upsert: true, contentType: file.type || undefined})
    if (uploadError) throw uploadError

    const {data} = supabase.storage.from('model-images').getPublicUrl(path)
    return data.publicUrl
}

// =============================================================================
// Measurements — 1 row par auth.users, colonnes dédiées
// =============================================================================

/**
 * Mapping label affiché → nom de colonne SQL. Ordre = ordre d'affichage
 * (bas du corps puis haut, conformément à la prise de mesures pratique).
 */
export const STANDARD_MEASUREMENTS: ReadonlyArray<{label: string; column: string}> = [
    {label: 'Longueur pantalon', column: 'longueur_pantalon'},
    {label: 'Ceinture', column: 'ceinture'},
    {label: 'Fesse', column: 'fesse'},
    {label: 'Cuisse', column: 'cuisse'},
    {label: 'Bas', column: 'bas'},
    {label: 'Longueur genou', column: 'longueur_genou'},
    {label: 'Tour genou', column: 'tour_genou'},
    {label: 'Longueur haut', column: 'longueur_haut'},
    {label: 'Dos', column: 'dos'},
    {label: 'Cou', column: 'cou'},
    {label: 'Longueur Manche', column: 'longueur_manche'},
    {label: 'Tour de bras', column: 'tour_de_bras'},
    {label: 'Poitrine', column: 'poitrine'},
    {label: 'Ventre', column: 'ventre'},
]

export interface MeasurementRecord {
    id: string | null
    user_id: string
    unit: 'cm' | 'in'
    /** Valeurs des 14 colonnes standard (colonne SQL -> numéro). null = vide. */
    values: Record<string, number | null>
    /** Mesures personnalisées hors template (stockées en jsonb). */
    extra_fields: Record<string, number>
    notes: string | null
    measured_at: string | null
}

const STANDARD_COLUMNS = STANDARD_MEASUREMENTS.map(s => s.column)

export async function getMeasurementsByUserId(userId: string): Promise<MeasurementRecord | null> {
    const {data, error} = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    if (error) throw error
    if (!data) return null

    const values: Record<string, number | null> = {}
    for (const col of STANDARD_COLUMNS) {
        const v = (data as Record<string, unknown>)[col]
        values[col] = typeof v === 'number' ? v : v == null ? null : Number(v)
    }
    const rawExtra = (data as Record<string, unknown>).extra_fields
    const extra_fields = rawExtra && typeof rawExtra === 'object'
        ? (rawExtra as Record<string, number>)
        : {}

    return {
        id: (data.id as string) ?? null,
        user_id: data.user_id as string,
        unit: ((data.unit as 'cm' | 'in') ?? 'cm'),
        values,
        extra_fields,
        notes: (data.notes_text as string | null) ?? null,
        measured_at: (data.measured_at as string | null) ?? null,
    }
}

export async function upsertMeasurementsByUserId(
    userId: string,
    input: {
        unit: 'cm' | 'in'
        values: Record<string, number | null>
        extra_fields: Record<string, number>
        notes?: string | null
    },
): Promise<void> {
    const payload: Record<string, unknown> = {
        user_id: userId,
        unit: input.unit,
        notes_text: input.notes ?? null,
        measured_at: new Date().toISOString(),
        extra_fields: input.extra_fields ?? {},
    }
    for (const col of STANDARD_COLUMNS) {
        payload[col] = input.values[col] ?? null
    }

    const {error} = await supabase
        .from('measurements')
        .upsert(payload, {onConflict: 'user_id'})

    if (error) throw error
}

// =============================================================================
// Clients (carnet d'adresses du couturier, indépendant de auth.users)
// =============================================================================

export type ClientStatus = 'active' | 'inactive' | 'suspended'

export interface ClientRow {
    id: string
    /** Optionnel : auth.users.id si le client a un compte marketplace.
     *  C'est par lui qu'on lit les `measurements` (qui sont keyed sur user_id). */
    user_id: string | null
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
    user_id?: string | null
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
            user_id: input.user_id ?? null,
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
    user_id?: string | null
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
