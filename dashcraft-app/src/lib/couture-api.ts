import { supabase } from './supabase'

const SUPABASE_FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

interface ListClientsParams {
    search?: string
}

interface ClientEntity {
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
}

class CoutureAPI {
    private async makeRequest(endpoint: string, options: RequestInit = {}) {
        try {
            const method = (options.method || 'POST') as 'GET' | 'POST' | 'PUT' | 'DELETE'
            
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session?.access_token) {
                throw new Error('Session requise. Veuillez vous connecter.')
            }

            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    ...options.headers,
                },
                ...options,
            })

            if (!response.ok) {
                const errorText = await response.text()
                let errorMessage
                try {
                    const errorData = JSON.parse(errorText)
                    errorMessage = errorData.error || errorData.message || 'Erreur inconnue'
                } catch {
                    errorMessage = errorText || `Erreur HTTP: ${response.status}`
                }
                throw new Error(errorMessage)
            }

            return response.json()
        } catch (error) {
            console.error(`Erreur appel API ${endpoint}:`, error)
            throw error
        }
    }

    async listClients(params?: ListClientsParams) {
        return this.makeRequest('/pro-list-clients', {
            method: 'POST',
            body: JSON.stringify({ search: params?.search || '' }),
        })
    }

    async createClient(data: {
        name: string
        email: string
        phone: string
        address?: string
        city?: string
        postal_code?: string
    }) {
        return this.makeRequest('/pro-create-client', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    async updateClient(id: string, data: {
        name?: string
        email?: string
        phone?: string
        address?: string
        city?: string
        postal_code?: string
        status?: string
    }) {
        return this.makeRequest('/pro-update-client', {
            method: 'POST',
            body: JSON.stringify({ id, ...data }),
        })
    }

    async getClient(id: string) {
        return this.makeRequest('/pro-get-client', {
            method: 'POST',
            body: JSON.stringify({ id }),
        })
    }

    async deleteClient(id: string) {
        return this.makeRequest('/pro-delete-client', {
            method: 'POST',
            body: JSON.stringify({ id }),
        })
    }
    async listModels(options: { search?: string } = {}) {
        return this.makeRequest<{ models: any[], total: number }>('/pro-list-models', {
            method: 'POST',
            body: JSON.stringify({ query: options.search || '' })
        })
    }

    async createModel(data: { name: string, description: string, price: number }) {
        return this.makeRequest<any>('/pro-create-model', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    }

    async listMeasurements(options: { search?: string } = {}) {
        return this.makeRequest<{ measurements: any[], total: number }>('/pro-list-measurements', {
            method: 'POST',
            body: JSON.stringify({ query: options.search || '' })
        })
    }

    async createMeasurement(data: { client_id: string, name: string, value: number, unit: string }) {
        return this.makeRequest<any>('/pro-create-measurement', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    }
}

export const coutureAPI = new CoutureAPI()
