'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

interface ListClientsRequest {
    search?: string
}

interface CreateClientRequest {
    name: string
    email: string
    phone: string
    address?: string
    city?: string
    postal_code?: string
}

interface UpdateClientRequest {
    id: string
    name?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postal_code?: string
    status?: 'active' | 'inactive' | 'suspended'
}

interface GetClientRequest {
    id: string
}

export interface ClientEntity {
    id: string
    name: string
    email: string
    phone: string
    address: string
    city: string
    postal_code: string
    status: 'active' | 'inactive' | 'suspended'
    total_orders: number
    total_spent: number
    created_at: string
    last_order_at?: string
    notes?: string
}

interface ListClientsResponse {
    clients: ClientEntity[]
    total: number
}

interface CreateClientResponse {
    client: ClientEntity
}

interface UpdateClientResponse {
    client: ClientEntity
}

interface GetClientResponse {
    client: ClientEntity
}

const SUPABASE_API_BASE = 'https://krwsuyitcdigvazltpom.supabase.co/functions/v1'

async function callSupabaseAPI<T>(
    endpoint: string,
    method: 'POST' | 'GET' = 'POST',
    body?: Record<string, any>
): Promise<T> {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    }

    const options: RequestInit = {
        method,
        headers,
    }

    if (body) {
        options.body = JSON.stringify(body)
    }

    try {
        const response = await fetch(`${SUPABASE_API_BASE}${endpoint}`, options)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }))
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`)
        }

        return await response.json() as T
    } catch (error) {
        console.error(`Erreur appel API ${endpoint}:`, error)
        throw error
    }
}

export async function listClients(params: ListClientsRequest) {
    try {
        const data = await callSupabaseAPI('/pro-list-clients', 'POST', {
            search: params.search || '',
        })
        const response = data as ListClientsResponse

        return {
            success: true,
            clients: response.clients || [],
            total: response.total || 0,
        }
    } catch (error) {
        console.error('Erreur listClients:', error)
        return {
            success: false,
            clients: [],
            total: 0,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
        }
    }
}

export async function createClient(params: CreateClientRequest) {
    try {
        const data = await callSupabaseAPI('/pro-create-client', 'POST', params)
        const response = data as CreateClientResponse

        return {
            success: true,
            client: response.client,
        }
    } catch (error) {
        console.error('Erreur createClient:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
        }
    }
}

export async function updateClient(params: UpdateClientRequest) {
    try {
        const data = await callSupabaseAPI('/pro-update-client', 'POST', params)
        const response = data as UpdateClientResponse

        return {
            success: true,
            client: response.client,
        }
    } catch (error) {
        console.error('Erreur updateClient:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
        }
    }
}

export async function getClient(params: GetClientRequest) {
    try {
        const data = await callSupabaseAPI('/pro-get-client', 'POST', params)
        const response = data as GetClientResponse

        return {
            success: true,
            client: response.client,
        }
    } catch (error) {
        console.error('Erreur getClient:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
        }
    }
}
