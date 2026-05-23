'use client'

import {EyeIcon, PencilIcon, TrashIcon, SwatchIcon, MagnifyingGlassIcon} from '@heroicons/react/24/outline'
import type {Tissu} from '@/types/tissu.types'

interface TissusTableProps {
    tissus: Tissu[]
    loading: boolean
    canEdit: boolean
    canDelete: boolean
    onView: (t: Tissu) => void
    onEdit: (t: Tissu) => void
    onDelete: (t: Tissu) => void
    actionLoading: string | null
    /** Contexte pour l'empty state — distingue "rien à afficher" / "filtre vide" / "recherche vide". */
    emptyContext?: 'all' | 'tab' | 'search'
}

function formatFCFA(n: number): string {
    return `${(n ?? 0).toLocaleString('fr-FR')} FCFA / m`
}

export function TissusTable({
    tissus,
    loading,
    canEdit,
    canDelete,
    onView,
    onEdit,
    onDelete,
    actionLoading,
    emptyContext = 'all',
}: TissusTableProps) {
    if (loading && tissus.length === 0) {
        return (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-900">
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="px-6 py-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        <div className="h-9 flex-1 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-900 animate-pulse" />
                    </div>
                ))}
            </div>
        )
    }

    if (tissus.length === 0 && !loading) {
        const isSearch = emptyContext === 'search'
        const Icon = isSearch ? MagnifyingGlassIcon : SwatchIcon
        return (
            <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <Icon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                <p className="mt-3 text-sm font-medium text-black dark:text-white">
                    {isSearch
                        ? 'Aucun tissu ne correspond à votre recherche.'
                        : emptyContext === 'tab'
                            ? 'Aucun tissu dans ce filtre.'
                            : 'Catalogue vide.'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {isSearch
                        ? 'Essayez un autre nom, texture ou couleur.'
                        : emptyContext === 'tab'
                            ? 'Bascule sur « Tous » pour voir l\'ensemble.'
                            : 'Ajoutez votre premier tissu pour démarrer le catalogue.'}
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg">
            <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                    <tr>
                        {['Image', 'Nom', 'Texture / Couleur', 'Prix', 'Stock', 'Actions'].map(h => (
                            <th
                                key={h}
                                className={`px-6 py-4 text-xs font-semibold text-black dark:text-white uppercase tracking-wider ${
                                    h === 'Actions' ? 'text-right' : 'text-left'
                                }`}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                    {tissus.map(t => {
                        const busy = (suffix: string) => actionLoading === `${suffix}-${t.id}`
                        return (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <td className="px-6 py-4">
                                    {t.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={t.image_url}
                                            alt={t.nom}
                                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                            <span className="text-gray-400 text-xs">—</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-black dark:text-white">{t.nom}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {new Date(t.updated_at).toLocaleDateString('fr-FR')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="text-black dark:text-white">{t.texture || '—'}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{t.couleur || '—'}</div>
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-black dark:text-white tabular-nums">
                                    {formatFCFA(t.prix_metre)}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                            t.stock_disponible
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {t.stock_disponible ? 'En stock' : 'Rupture'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1.5">
                                        <button
                                            onClick={() => onView(t)}
                                            className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Voir"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                        {canEdit && (
                                            <button
                                                onClick={() => onEdit(t)}
                                                disabled={busy('edit')}
                                                className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
                                                title="Modifier"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => onDelete(t)}
                                                disabled={busy('delete')}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                                                title="Supprimer"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
