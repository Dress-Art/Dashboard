'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { adminAPI } from '@/lib/admin-api'

interface UserEntity {
    id: string
    email: string
    name?: string
    role: string
    status: 'active' | 'inactive' | 'suspended'
    created_at: string
    last_sign_in_at?: string
}

/**
 * UsersPage
 * Page dédiée Utilisateurs avec recherche et CRUD (toutes les données).
 */
export function UsersPage() {
    const t = useTranslations('pages.users')

    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{
        items: UserEntity[]
        total: number
    } | null>(null)

    // États pour les modales
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState<UserEntity | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Formulaire nouveau utilisateur
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        role: 'Viewer'
    })

    // FONCTION: Traduire les erreurs réseau
    const translateError = (err: any): string => {
        if (err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch')) {
            return t('errors.network_error')
        }
        if (err?.message?.includes('Unauthorized') || err?.status === 401) {
            return 'Session expirée, veuillez vous reconnecter'
        }
        if (err?.message?.includes('Forbidden') || err?.status === 403) {
            return 'Vous n\'avez pas les permissions nécessaires'
        }
        return err instanceof Error ? err.message : t('errors.load_failed')
    }

    // 🔥 FONCTION PRINCIPALE: Charger TOUS les utilisateurs
    const loadUsers = async () => {
        try {
            setLoading(true)
            setError(null)

            // 🚫 SUPPRIMÉ: Toute notion de limite, offset, pagination
            const response = await adminAPI.getUsers({
                ...(q.trim() && { search: q.trim() })
            })

            setData({
                items: response.users || [],
                total: response.total || 0
            })

        } catch (err) {
            console.error('Erreur chargement users:', err)
            setError(translateError(err))
            
            // En cas d'erreur, état vide
            setData({
                items: [],
                total: 0
            })
        } finally {
            setLoading(false)
        }
    }

    // Charger les données au montage et quand la recherche change
    useEffect(() => {
        loadUsers()
    }, [q])

    // 🔥 CRÉER UN UTILISATEUR
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!newUser.email || !newUser.password || !newUser.name) {
            setError(t('errors.required_fields'))
            return
        }

        try {
            setActionLoading('create')
            setError(null)
            
            await adminAPI.createUser({
                email: newUser.email,
                password: newUser.password,
                name: newUser.name,
                role: newUser.role
            })

            // Reset formulaire
            setNewUser({ email: '', password: '', name: '', role: 'Viewer' })
            setShowCreateModal(false)
            
            // Recharger la liste
            await loadUsers()

        } catch (err) {
            setError(translateError(err))
        } finally {
            setActionLoading(null)
        }
    }

    // 🔥 METTRE À JOUR UN UTILISATEUR
    const handleUpdateUser = async (userId: string, updates: Partial<UserEntity>) => {
        try {
            setActionLoading(`update-${userId}`)
            setError(null)
            
            await adminAPI.updateUser(userId, updates)
            
            setShowEditModal(false)
            setEditingUser(null)
            await loadUsers()

        } catch (err) {
            setError(translateError(err))
        } finally {
            setActionLoading(null)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // Pas besoin de reset de page
    }

    if (loading && !data) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('title')}
                </h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    + {t('new_user')}
                </button>
            </div>

            {/* Erreurs - Avec possibilité de masquer */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg flex justify-between items-start">
                    <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 ml-4"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Recherche - Sans sélecteur de taille */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={t('search_placeholder')}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '⏳' : '🔍'} Rechercher
                    </button>
                </form>
                
                {/* Compteur total sans pagination */}
                {data && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {data.total > 0 ? (
                            <>Affichage de {data.items.length} utilisateur{data.items.length > 1 ? 's' : ''} (total : {data.total})</>
                        ) : (
                            <>Aucun utilisateur</>
                        )}
                    </div>
                )}
            </div>

            {/* 🎯 ÉTAT VIDE - Aucun utilisateur */}
            {data && data.items.length === 0 && !loading && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Aucun utilisateur trouvé
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {q ? 
                            `Aucun utilisateur ne correspond à "${q}"` : 
                            'Il n\'y a pas encore d\'utilisateurs dans la base de données.'
                        }
                    </p>
                    <div className="space-y-3">
                        {q && (
                            <button
                                onClick={() => setQ('')}
                                className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                                Voir tous les utilisateurs
                            </button>
                        )}
                        <div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Créer le premier utilisateur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tableau des utilisateurs - TOUS affichés */}
            {data && data.items.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Utilisateur
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Rôle
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Dernière connexion
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {data.items.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                                                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {user.name || 'Sans nom'}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.role === 'Admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                user.role === 'Editor' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                user.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                            }`}>
                                                {t(`status.${user.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {user.last_sign_in_at 
                                                ? new Date(user.last_sign_in_at).toLocaleString()
                                                : 'Jamais'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm space-x-2">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user)
                                                    setShowEditModal(true)
                                                }}
                                                disabled={actionLoading === `update-${user.id}`}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 disabled:opacity-50"
                                            >
                                                {t('actions.edit')}
                                            </button>
                                            <button
                                                disabled={actionLoading === `reset-${user.id}`}
                                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 disabled:opacity-50"
                                            >
                                                {t('actions.reset_password')}
                                            </button>
                                            <button
                                                disabled={actionLoading === `activity-${user.id}`}
                                                className="text-green-600 hover:text-green-900 dark:text-green-400 disabled:opacity-50"
                                            >
                                                {t('actions.view_activity')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 🚫 SUPPRIMÉ: Toute pagination */}
                </div>
            )}

            {/* Modales - identiques à avant */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            {t('create_user')}
                        </h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <input
                                type="text"
                                placeholder={t('form.name') + ' *'}
                                value={newUser.name}
                                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                            <input
                                type="email"
                                placeholder={t('form.email') + ' *'}
                                value={newUser.email}
                                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                            <input
                                type="password"
                                placeholder={t('form.password') + ' *'}
                                value={newUser.password}
                                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="Viewer">Viewer</option>
                                <option value="Editor">Editor</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {actionLoading === 'create' ? t('form.creating') : t('form.save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                >
                                    {t('form.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modale d'édition */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            {t('edit_user')} - {editingUser.name || editingUser.email}
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const updates = {
                                name: formData.get('name') as string,
                                role: formData.get('role') as string,
                                status: formData.get('status') as string,
                            }
                            handleUpdateUser(editingUser.id, updates)
                        }} className="space-y-4">
                            <input
                                name="name"
                                type="text"
                                defaultValue={editingUser.name || ''}
                                placeholder={t('form.name')}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <select
                                name="role"
                                defaultValue={editingUser.role}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="Viewer">Viewer</option>
                                <option value="Editor">Editor</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <select
                                name="status"
                                defaultValue={editingUser.status}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                                <option value="suspended">{t('status.suspended')}</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === `update-${editingUser.id}`}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {actionLoading === `update-${editingUser.id}` ? t('form.updating') : t('form.save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false)
                                        setEditingUser(null)
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                >
                                    {t('form.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
