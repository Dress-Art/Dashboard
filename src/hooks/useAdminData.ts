// src/hooks/useAdminData.ts
'use client'

import { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/admin-api'

export function useAdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = async (params?: { search?: string; limit?: number }) => {
        try {
            setLoading(true)
            const data = await adminAPI.getUsers(params)
            setUsers(data.users || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const createUser = async (userData: any) => {
        try {
            await adminAPI.createUser(userData)
            await fetchUsers() // Refresh
            return { success: true }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Erreur' }
        }
    }

    const updateUser = async (userId: string, updates: any) => {
        try {
            await adminAPI.updateUser(userId, updates)
            await fetchUsers() // Refresh
            return { success: true }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Erreur' }
        }
    }

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        updateUser,
    }
}

export function useAdminStats() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        totalAgents: 0,
        activeDeliveries: 0,
        pendingOrders: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Combiner plusieurs appels API pour les stats
                const [usersData] = await Promise.all([
                    adminAPI.getUsers({ limit: 1000 }),
                    // Ajouter d'autres appels selon vos besoins
                ])

                setStats({
                    totalUsers: usersData.total || 0,
                    activeUsers: usersData.users?.filter((u: any) => u.status === 'active').length || 0,
                    newUsersToday: usersData.users?.filter((u: any) => {
                        const today = new Date().toDateString()
                        return new Date(u.created_at).toDateString() === today
                    }).length || 0,
                    totalAgents: 0, // À implémenter
                    activeDeliveries: 0, // À implémenter
                    pendingOrders: 0, // À implémenter
                })
            } catch (err) {
                console.error('Erreur stats:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    return { stats, loading }
}