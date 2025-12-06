/**
 * Client HTTP pour Supabase Edge Functions avec JWT automatique
 */

import { supabase } from './supabase'

export interface HttpOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: unknown
    params?: Record<string, string | number | boolean>
}

class HttpClient {
    private async getAuthToken(): Promise<string | null> {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token || null
    }

    async request<T>(url: string, options: HttpOptions = {}): Promise<T> {
        const { method = 'GET', headers = {}, body, params } = options

        // Construire l'URL avec les params
        const finalUrl = new URL(url)
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                finalUrl.searchParams.append(key, String(value))
            })
        }

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        // Récupérer le JWT automatiquement
        const token = await this.getAuthToken()
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(finalUrl.toString(), {
            method,
            headers: {
                ...defaultHeaders,
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
    }

    get<T>(url: string, options?: Omit<HttpOptions, 'method' | 'body'>) {
        return this.request<T>(url, { ...options, method: 'GET' })
    }

    post<T>(url: string, body?: unknown, options?: Omit<HttpOptions, 'method' | 'body'>) {
        return this.request<T>(url, { ...options, method: 'POST', body })
    }

    put<T>(url: string, body?: unknown, options?: Omit<HttpOptions, 'method' | 'body'>) {
        return this.request<T>(url, { ...options, method: 'PUT', body })
    }

    delete<T>(url: string, options?: Omit<HttpOptions, 'method' | 'body'>) {
        return this.request<T>(url, { ...options, method: 'DELETE' })
    }

    patch<T>(url: string, body?: unknown, options?: Omit<HttpOptions, 'method' | 'body'>) {
        return this.request<T>(url, { ...options, method: 'PATCH', body })
    }
}

export const httpClient = new HttpClient()