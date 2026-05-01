import { supabase } from './supabase'


// Récupérer l'URL depuis les variables d'env plutôt qu'en dur
const SUPABASE_FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

export class AdminAPI {
    // Helper pour les requêtes directes vers Supabase Functions
    private async makeRequest(endpoint: string, options: RequestInit = {}) {
        // Utiliser la méthode invoke de Supabase (plus propre)
        try {
            const method = (options.method || 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
            
            const { data, error } = await supabase.functions.invoke(endpoint.replace('/', ''), {
                method,
                ...(options.body && { body: JSON.parse(options.body as string) }),
            })

            if (error) throw error
            return data

        } catch (supabaseError) {
            // Fallback vers fetch si invoke ne fonctionne pas
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
        }
    }

    // 👥 GESTION DES UTILISATEURS
    async getUsers(params?: { search?: string; limit?: number }) {
        const searchParams = new URLSearchParams()
        
        // Ajouter les paramètres seulement s'ils existent
        if (params?.search && params.search.trim()) {
            searchParams.set('search', params.search.trim())
        }
        
        if (params?.limit) {
            searchParams.set('limit', params.limit.toString())
        }

        const queryString = searchParams.toString()
        return this.makeRequest(`/admin-users-list${queryString ? `?${queryString}` : ''}`)
    }

    async createUser(userData: {
        email: string
        password: string
        name: string
        role?: string
    }) {
        return this.makeRequest('/admin-create-user', {
            method: 'POST',
            body: JSON.stringify(userData),
        })
    }

    async updateUser(userId: string, updates: {
        name?: string
        email?: string
        role?: string
        status?: string
    }) {
        return this.makeRequest('/admin-update-user', {
            method: 'PUT',
            body: JSON.stringify({ userId, ...updates }),
        })
    }

    async deleteUser(userId: string) {
        return this.makeRequest('/admin-delete-user', {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        })
    }

    async resetUserPassword(userId: string, newPassword: string) {
        return this.makeRequest('/admin-reset-password', {
            method: 'POST',
            body: JSON.stringify({ userId, newPassword }),
        })
    }

    async getUserActivity(userId: string, days = 30) {
        return this.makeRequest(`/admin-user-activity?userId=${userId}&days=${days}`)
    }

    // 🚚 GESTION DES LIVRAISONS
    async assignDelivery(deliveryData: {
        orderId: string
        driverId: string
        priority?: 'low' | 'normal' | 'high' | 'urgent'
        estimatedTime?: string
    }) {
        return this.makeRequest('/delivery-assign', {
            method: 'POST',
            body: JSON.stringify(deliveryData),
        })
    }

    async trackDelivery(deliveryId: string) {
        return this.makeRequest(`/delivery-tracking?deliveryId=${deliveryId}`)
    }

    /**
     * Transitionne une livraison entre statuts (assigned/picked_up/in_transit/delivered/cancelled).
     * Endpoint Edge Function attendu : `/delivery-update-status` (POST).
     */
    async updateDeliveryStatus(deliveryId: string, status: string) {
        return this.makeRequest('/delivery-update-status', {
            method: 'POST',
            body: JSON.stringify({deliveryId, status}),
        })
    }

    async getDeliveries(params?: { search?: string }) {
        const searchParams = new URLSearchParams()

        if (params?.search && params.search.trim()) {
            searchParams.set('search', params.search.trim())
        }

        const queryString = searchParams.toString()
        return this.makeRequest(`/admin-get-deliveries${queryString ? `?${queryString}` : ''}`)
    }

    /**
     * Récupère les livreurs (users avec role='livreur') pour la modale d'assignation.
     * Filtrage client-side : `admin-users-list` ne supporte pas (encore) `?role=`.
     */
    async getAvailableDrivers(): Promise<{ drivers: Array<{ id: string; name: string; email: string }> }> {
        const res = await this.getUsers({ limit: 200 }) as {
            users?: Array<{
                id: string
                name?: string
                email: string
                role?: string
                status?: string
            }>
        }
        const drivers = (res.users ?? [])
            .filter(u => (u.role ?? '').toLowerCase() === 'livreur')
            .filter(u => (u.status ?? 'active') === 'active')
            .map(u => ({ id: u.id, name: u.name || u.email, email: u.email }))
        return { drivers }
    }

    // 👨‍💼 GESTION DES PROFESSIONNELS
    async assignOrderToProfessional(orderId: string, professionalId: string, notes?: string) {
        return this.makeRequest('/professionals-assign-order', {
            method: 'POST',
            body: JSON.stringify({ orderId, professionalId, notes }),
        })
    }

    // 🛍️ COMMANDES DRESSART (proxy via API routes serveur — clé admin non exposée)
    async getOrders(params?: { search?: string; status?: string; page?: number }) {
        const qs = new URLSearchParams()
        if (params?.search) qs.set('search', params.search)
        if (params?.status && params.status !== 'all') qs.set('status', params.status)
        if (params?.page) qs.set('page', String(params.page))

        const res = await fetch(`/api/marketplace/orders?${qs}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Erreur chargement commandes: ${res.status}`)
        return res.json()
    }

    async updateOrderStatus(orderNumber: string, status: string) {
        const res = await fetch(`/api/marketplace/orders/${orderNumber}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error(`Erreur mise à jour statut: ${res.status}`)
        return res.json()
    }

    /**
     * Met à jour le JSONB `orders.measurements`.
     * Le proxy `/api/marketplace/orders/[orderNumber]` PATCH transmet le body
     * tel quel — le backend marketplace doit accepter `measurements` en plus
     * du `status` historique.
     */
    async updateOrderMeasurements(
        orderNumber: string,
        measurements: Record<string, { value: number; unit: string }>,
    ) {
        const res = await fetch(`/api/marketplace/orders/${orderNumber}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ measurements }),
        })
        if (!res.ok) throw new Error(`Erreur mise à jour mesures: ${res.status}`)
        return res.json()
    }

    // 📊 ANALYTICS
    async getAnalytics(timeRange?: string) {
        const query = timeRange ? `?range=${timeRange}` : ''
        return this.makeRequest(`/analytics${query}`)
    }

    // 🔔 NOTIFICATIONS
    async sendNotification(notificationData: {
        userId?: string
        title: string
        message: string
        type?: 'info' | 'warning' | 'error' | 'success'
        channels?: string[]
    }) {
        return this.makeRequest('/notifications-send', {
            method: 'POST',
            body: JSON.stringify(notificationData),
        })
    }
}

export const adminAPI = new AdminAPI()