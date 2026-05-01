import {supabase} from './supabase'
import type {Tissu, TissuInput} from '@/types/tissu.types'

/**
 * Client tissus : appelle directement Supabase JS (RLS s'occupe de la sécurité).
 * Pas d'Edge Function intermédiaire — pattern simple à privilégier pour les
 * nouveaux CRUDs quand RLS est en place.
 */

interface ListParams {
    search?: string
    stock?: 'available' | 'unavailable' | null
}

export async function listTissus(params: ListParams = {}): Promise<{tissus: Tissu[]; total: number}> {
    let q = supabase
        .from('tissus')
        .select('*', {count: 'exact'})
        .order('updated_at', {ascending: false})

    if (params.search && params.search.trim()) {
        // ilike sur nom ; ajouter texture/couleur si besoin plus tard
        q = q.ilike('nom', `%${params.search.trim()}%`)
    }
    if (params.stock === 'available') q = q.eq('stock_disponible', true)
    if (params.stock === 'unavailable') q = q.eq('stock_disponible', false)

    const {data, count, error} = await q
    if (error) throw error
    return {tissus: (data ?? []) as Tissu[], total: count ?? 0}
}

export async function getTissu(id: string): Promise<Tissu> {
    const {data, error} = await supabase.from('tissus').select('*').eq('id', id).single()
    if (error) throw error
    return data as Tissu
}

export async function createTissu(input: TissuInput): Promise<Tissu> {
    const {data, error} = await supabase
        .from('tissus')
        .insert(input)
        .select()
        .single()
    if (error) throw error
    return data as Tissu
}

export async function updateTissu(id: string, patch: Partial<TissuInput>): Promise<Tissu> {
    const {data, error} = await supabase
        .from('tissus')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data as Tissu
}

export async function deleteTissu(id: string): Promise<void> {
    const {error} = await supabase.from('tissus').delete().eq('id', id)
    if (error) throw error
}
