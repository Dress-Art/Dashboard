'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    ArrowPathIcon,
    UserGroupIcon,
    PlusIcon,
    PencilSquareIcon,
    PauseCircleIcon,
    PlayCircleIcon,
    KeyIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import {useAuthContext} from '@/contexts/AuthContext'
import {adminAPI} from '@/lib/admin-api'
import {notify} from '@/lib/toast'
import {ClientsPage} from './ClientsPage'
import {ModelsPage} from './ModelsPage'
import {MeasurementsPage} from './MeasurementsPage'

type Tab = 'clients' | 'models' | 'measurements'

type CouturierRow = {
    id: string
    name: string
    email: string
    phone?: string
    status?: string
    ordersCount: number
}

type InviteForm = {name: string; email: string; phone: string; password: string}
type EditForm = {id: string; name: string; email: string; phone: string; status: 'active' | 'suspended'}

function AdminCouturierDashboard() {
    const [loading, setLoading] = useState(true)
    const [actionId, setActionId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [couturiers, setCouturiers] = useState<CouturierRow[]>([])

    const [showInvite, setShowInvite] = useState(false)
    const [inviteForm, setInviteForm] = useState<InviteForm>({name: '', email: '', phone: '', password: ''})
    const [editing, setEditing] = useState<EditForm | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const [usersRes, ordersRes] = await Promise.allSettled([
            adminAPI.getUsers({limit: 1000}),
            adminAPI.getOrders(),
        ])
        if (usersRes.status === 'rejected') console.warn('[couturier admin] users a échoué:', usersRes.reason)
        if (ordersRes.status === 'rejected') console.warn('[couturier admin] orders a échoué:', ordersRes.reason)

        const users = usersRes.status === 'fulfilled' ? (usersRes.value.users ?? []) : []
        const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.orders ?? []) : []

        const list: CouturierRow[] = users
            .filter((u: {role?: string; id?: string}) => (u.role ?? '').toLowerCase() === 'couturier' && u.id)
            .map((u: {id: string; email?: string; phone?: string; name?: string; status?: string}) => ({
                id: u.id,
                name: u.name || u.email || 'Couturier',
                email: u.email || '',
                phone: u.phone,
                status: u.status,
                ordersCount: orders.filter((o: {professional_id?: string}) => o.professional_id === u.id).length,
            }))
            .sort((a: CouturierRow, b: CouturierRow) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name))

        setCouturiers(list)
        setLoading(false)
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return couturiers
        return couturiers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q),
        )
    }, [couturiers, search])

    const initials = (name: string) =>
        name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || 'C'

    const statusBadge = (status?: string) => {
        const s = (status ?? 'active').toLowerCase()
        const tone =
            s === 'active'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : s === 'suspended' || s === 'banned'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
                {s === 'active' ? 'Actif' : s === 'suspended' ? 'Suspendu' : s}
            </span>
        )
    }

    const submitInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteForm.email || !inviteForm.password || !inviteForm.name) {
            notify.error('Nom, email et mot de passe requis')
            return
        }
        try {
            setActionId('invite')
            await adminAPI.createUser({
                email: inviteForm.email.trim(),
                password: inviteForm.password,
                name: inviteForm.name.trim(),
                role: 'couturier',
            })
            notify.success('Couturier invité', inviteForm.email)
            setShowInvite(false)
            setInviteForm({name: '', email: '', phone: '', password: ''})
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionId(null)
        }
    }

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editing) return
        try {
            setActionId(`edit-${editing.id}`)
            await adminAPI.updateUser(editing.id, {
                name: editing.name,
                email: editing.email,
                status: editing.status,
            })
            notify.success('Couturier mis à jour', editing.name)
            setEditing(null)
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionId(null)
        }
    }

    const toggleSuspend = async (c: CouturierRow) => {
        const next = (c.status ?? 'active') === 'active' ? 'suspended' : 'active'
        try {
            setActionId(`suspend-${c.id}`)
            await adminAPI.updateUser(c.id, {status: next})
            notify.success(c.name, next === 'suspended' ? 'Suspendu' : 'Réactivé')
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionId(null)
        }
    }

    const resetPassword = async (c: CouturierRow) => {
        const pwd = window.prompt(`Nouveau mot de passe pour ${c.name} (≥ 8 caractères) :`, '')
        if (!pwd) return
        if (pwd.length < 8) {
            notify.error('Mot de passe trop court (8 caractères minimum)')
            return
        }
        try {
            setActionId(`reset-${c.id}`)
            await adminAPI.resetUserPassword(c.id, pwd)
            notify.success(c.name, 'Mot de passe réinitialisé')
        } catch (err) {
            notify.error(err)
        } finally {
            setActionId(null)
        }
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Couturiers</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les comptes couturiers : invitation, suspension, mot de passe.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => load()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Rafraîchir
                    </button>
                    <button
                        onClick={() => setShowInvite(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Inviter un couturier
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950 space-y-4">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un couturier (nom, email, téléphone)…"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-black placeholder-gray-400 dark:border-gray-700 dark:bg-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                />

                {loading ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
                        <UserGroupIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                        <p className="mt-3 text-sm font-medium text-black dark:text-white">
                            {search ? 'Aucun couturier ne correspond à votre recherche.' : 'Aucun couturier pour l\'instant.'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {search ? 'Essayez un autre nom, email ou téléphone.' : 'Cliquez « Inviter un couturier » pour créer votre premier compte.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-3 font-medium">Couturier</th>
                                    <th className="px-4 py-3 font-medium">Contact</th>
                                    <th className="px-4 py-3 font-medium">Statut</th>
                                    <th className="px-4 py-3 font-medium text-right">Commandes</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => {
                                    const isActive = (c.status ?? 'active').toLowerCase() === 'active'
                                    return (
                                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-900 last:border-b-0 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                        {initials(c.name)}
                                                    </div>
                                                    <span className="font-medium text-black dark:text-white">{c.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                <div className="leading-tight">
                                                    {c.email && <div>{c.email}</div>}
                                                    {c.phone && <div className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</div>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{statusBadge(c.status)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-black dark:text-white tabular-nums">{c.ordersCount}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => setEditing({
                                                            id: c.id,
                                                            name: c.name,
                                                            email: c.email,
                                                            phone: c.phone ?? '',
                                                            status: isActive ? 'active' : 'suspended',
                                                        })}
                                                        className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                        title="Éditer"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleSuspend(c)}
                                                        disabled={actionId === `suspend-${c.id}`}
                                                        className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
                                                        title={isActive ? 'Suspendre' : 'Réactiver'}
                                                    >
                                                        {isActive ? <PauseCircleIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => resetPassword(c)}
                                                        disabled={actionId === `reset-${c.id}`}
                                                        className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
                                                        title="Réinitialiser le mot de passe"
                                                    >
                                                        <KeyIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showInvite && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInvite(false)}>
                    <div className="bg-white dark:bg-black rounded-2xl p-6 w-full max-w-md border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold text-black dark:text-white">Inviter un couturier</h3>
                            <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-black dark:hover:text-white">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submitInvite} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Nom complet *"
                                value={inviteForm.name}
                                onChange={e => setInviteForm(prev => ({...prev, name: e.target.value}))}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email *"
                                value={inviteForm.email}
                                onChange={e => setInviteForm(prev => ({...prev, email: e.target.value}))}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                                required
                            />
                            <input
                                type="tel"
                                placeholder="Téléphone"
                                value={inviteForm.phone}
                                onChange={e => setInviteForm(prev => ({...prev, phone: e.target.value}))}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                            />
                            <input
                                type="password"
                                placeholder="Mot de passe temporaire * (≥ 8 caractères)"
                                value={inviteForm.password}
                                onChange={e => setInviteForm(prev => ({...prev, password: e.target.value}))}
                                minLength={8}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                                required
                            />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900">
                                    Annuler
                                </button>
                                <button type="submit" disabled={actionId === 'invite'} className="flex-1 rounded-xl bg-black dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
                                    {actionId === 'invite' ? 'Création…' : 'Inviter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
                    <div className="bg-white dark:bg-black rounded-2xl p-6 w-full max-w-md border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold text-black dark:text-white">Éditer le couturier</h3>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-black dark:hover:text-white">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submitEdit} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Nom"
                                value={editing.name}
                                onChange={e => setEditing(prev => prev ? {...prev, name: e.target.value} : prev)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={editing.email}
                                onChange={e => setEditing(prev => prev ? {...prev, email: e.target.value} : prev)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                            />
                            <select
                                value={editing.status}
                                onChange={e => setEditing(prev => prev ? {...prev, status: e.target.value as 'active' | 'suspended'} : prev)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2.5 text-sm text-black dark:text-white"
                            >
                                <option value="active">Actif</option>
                                <option value="suspended">Suspendu</option>
                            </select>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900">
                                    Annuler
                                </button>
                                <button type="submit" disabled={actionId === `edit-${editing.id}`} className="flex-1 rounded-xl bg-black dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
                                    {actionId === `edit-${editing.id}` ? 'Sauvegarde…' : 'Sauvegarder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function CouturierWorkspace() {
    const [activeTab, setActiveTab] = useState<Tab>('clients')

    const renderContent = () => {
        switch (activeTab) {
            case 'clients':
                return <ClientsPage />
            case 'models':
                return <ModelsPage />
            case 'measurements':
                return <MeasurementsPage />
            default:
                return <ClientsPage />
        }
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-black dark:text-white">Mes clients</h1>
                <p className="text-gray-600 dark:text-gray-400">Gérez vos clients, modèles et mesures.</p>
            </div>

            <div className="border-b border-gray-300 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'clients'
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        Clients
                    </button>
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'models'
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        Modèles
                    </button>
                    <button
                        onClick={() => setActiveTab('measurements')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'measurements'
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        Mesures
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    )
}

export function CouturierModulePage() {
    const {role} = useAuthContext()

    if (role === 'admin') {
        return <AdminCouturierDashboard />
    }

    return <CouturierWorkspace />
}
