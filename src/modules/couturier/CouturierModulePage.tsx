'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {useAuthContext} from '@/contexts/AuthContext'
import {adminAPI} from '@/lib/admin-api'
import {coutureAPI} from '@/lib/couture-api'
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

function AdminCouturierDashboard() {
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState({
        couturiers: 0,
        orders: 0,
        clients: 0,
        models: 0,
        measurements: 0,
    })
    const [couturiers, setCouturiers] = useState<CouturierRow[]>([])

    const load = useCallback(async () => {
        try {
            setLoading(true)

            const [usersRes, ordersRes, clientsRes, modelsRes, measurementsRes] = await Promise.all([
                adminAPI.getUsers({limit: 1000}),
                adminAPI.getOrders(),
                coutureAPI.listClients(),
                coutureAPI.listModels(),
                coutureAPI.listMeasurements(),
            ])

            const users = usersRes.users ?? []
            const orders = ordersRes.orders ?? []
            const clients = clientsRes.clients ?? []
            const models = modelsRes.models ?? []
            const measurements = measurementsRes.measurements ?? []

            const couturierUsers: CouturierRow[] = users
                .filter((user: {role?: string; id?: string; email?: string; phone?: string; name?: string; status?: string}) =>
                    (user.role ?? '').toLowerCase() === 'couturier' && user.id,
                )
                .map((user: {id: string; email?: string; phone?: string; name?: string; status?: string}) => ({
                    id: user.id,
                    name: user.name || user.email || 'Couturier',
                    email: user.email || user.phone || '',
                    phone: user.phone,
                    status: user.status,
                    ordersCount: orders.filter((order: {professional_id?: string}) => order.professional_id === user.id).length,
                }))
                .sort((a: CouturierRow, b: CouturierRow) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name))

            setStats({
                couturiers: couturierUsers.length,
                orders: ordersRes.total ?? orders.length,
                clients: clientsRes.total ?? clients.length,
                models: modelsRes.total ?? models.length,
                measurements: measurementsRes.total ?? measurements.length,
            })
            setCouturiers(couturierUsers)
        } catch (err) {
            console.error('Erreur dashboard couturier admin:', err)
            notify.error(err)
            setCouturiers([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filteredCouturiers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return couturiers
        return couturiers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q),
        )
    }, [couturiers, search])

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-black dark:text-white">Module Couturier</h1>
                <p className="text-gray-600 dark:text-gray-400">Vue admin: synthèse des couturiers, commandes, clients, modèles et mesures.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    {label: 'Couturiers', value: stats.couturiers},
                    {label: 'Commandes', value: stats.orders},
                    {label: 'Clients', value: stats.clients},
                    {label: 'Modèles', value: stats.models},
                    {label: 'Mesures', value: stats.measurements},
                ].map(card => (
                    <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                        <p className="mt-2 text-3xl font-semibold text-black dark:text-white">{loading ? '…' : card.value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950 space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-black dark:text-white">Couturiers</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Liste des comptes couturiers et nombre de commandes assignées.</p>
                    </div>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher un couturier..."
                        className="w-full md:w-80 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-black placeholder-gray-400 dark:border-gray-700 dark:bg-black dark:text-white"
                    />
                </div>

                {loading ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Chargement des données admin...
                    </div>
                ) : filteredCouturiers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Aucun couturier trouvé
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-3 font-medium">Nom</th>
                                    <th className="px-4 py-3 font-medium">Contact</th>
                                    <th className="px-4 py-3 font-medium">Statut</th>
                                    <th className="px-4 py-3 font-medium text-right">Commandes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCouturiers.map(couturier => (
                                    <tr key={couturier.id} className="border-b border-gray-100 dark:border-gray-900 last:border-b-0">
                                        <td className="px-4 py-4 font-medium text-black dark:text-white">{couturier.name}</td>
                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{couturier.email}</td>
                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{couturier.status || 'active'}</td>
                                        <td className="px-4 py-4 text-right font-semibold text-black dark:text-white">{couturier.ordersCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
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
                <h1 className="text-3xl font-bold text-black dark:text-white">Module Couturier</h1>
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
