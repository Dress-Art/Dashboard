'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, ArrowDownTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { listModels, createModel, updateModel, deleteModel, uploadModelImage } from '@/lib/couturier-api'
import { notify } from '@/lib/toast'
import { ModelsTable } from './ModelsTable'

interface ModelEntity {
    id: string
    name: string
    description: string
    price: number
    image_url: string | null
    created_at: string
}

export function ModelsPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{
        items: ModelEntity[]
        total: number
    } | null>(null)

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const [newModel, setNewModel] = useState({
        name: '',
        description: '',
        price: 0
    })
    const [newImageFile, setNewImageFile] = useState<File | null>(null)
    const [newImagePreview, setNewImagePreview] = useState<string | null>(null)

    const [editingModel, setEditingModel] = useState<ModelEntity | null>(null)
    const [editForm, setEditForm] = useState({name: '', description: '', price: 0})
    const [editImageFile, setEditImageFile] = useState<File | null>(null)
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
    const [deletingModel, setDeletingModel] = useState<ModelEntity | null>(null)
    const [viewingModel, setViewingModel] = useState<ModelEntity | null>(null)

    const translateError = (err: any): string => {
        if (err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch')) {
            return 'Erreur de connexion réseau'
        }
        if (err?.message?.includes('Unauthorized') || err?.status === 401) {
            return 'Session expirée, veuillez vous reconnecter'
        }
        if (err?.message?.includes('Forbidden') || err?.status === 403) {
            return 'Vous n\'avez pas les permissions nécessaires'
        }
        return err instanceof Error ? err.message : 'Erreur lors du chargement'
    }

    const loadModels = async () => {
        try {
            setLoading(true)
            setError(null)

            const result = await listModels({ search: q.trim(), ownOnly: true })

            setData({
                items: result.models.map(m => ({
                    id: m.id,
                    name: m.name,
                    description: m.description ?? '',
                    price: m.price,
                    image_url: m.image_url ?? null,
                    created_at: m.created_at,
                })),
                total: result.total
            })

        } catch (err) {
            console.error('Erreur chargement modèles:', err)
            setError(translateError(err))

            setData({
                items: [],
                total: 0
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadModels()
    }, [q])

    const handleCreateModel = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newModel.name || newModel.price <= 0) {
            setError('Le nom et un prix valide sont requis')
            return
        }
        if (!newImageFile) {
            setError('Une image du modèle est requise')
            return
        }

        try {
            setActionLoading('create')
            setError(null)

            const imageUrl = await uploadModelImage(newImageFile)
            await createModel({...newModel, image_url: imageUrl})

            setNewModel({ name: '', description: '', price: 0 })
            setNewImageFile(null)
            setNewImagePreview(null)
            setShowCreateModal(false)
            await loadModels()

        } catch (err) {
            setError(translateError(err))
        } finally {
            setActionLoading(null)
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null
        if (!file) {
            setNewImageFile(null)
            setNewImagePreview(null)
            return
        }
        setNewImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setNewImagePreview(typeof reader.result === 'string' ? reader.result : null)
        reader.readAsDataURL(file)
    }

    const clearImage = () => {
        setNewImageFile(null)
        setNewImagePreview(null)
    }

    const openEdit = (m: ModelEntity) => {
        setEditingModel(m)
        setEditForm({name: m.name, description: m.description, price: m.price})
        setEditImageFile(null)
        setEditImagePreview(m.image_url ?? null)
    }

    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null
        if (!file) return
        setEditImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setEditImagePreview(typeof reader.result === 'string' ? reader.result : null)
        reader.readAsDataURL(file)
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingModel) return
        if (!editForm.name || editForm.price <= 0) {
            notify.error('Nom et prix > 0 requis')
            return
        }
        try {
            setActionLoading(`edit-${editingModel.id}`)
            let image_url: string | undefined
            if (editImageFile) {
                image_url = await uploadModelImage(editImageFile, editingModel.id)
            }
            await updateModel(editingModel.id, {
                name: editForm.name,
                description: editForm.description || null,
                price: editForm.price,
                ...(image_url ? {image_url} : {}),
            })
            notify.success('Modèle mis à jour')
            setEditingModel(null)
            setEditImageFile(null)
            setEditImagePreview(null)
            await loadModels()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingModel) return
        try {
            setActionLoading(`delete-${deletingModel.id}`)
            await deleteModel(deletingModel.id)
            notify.success('Modèle supprimé', deletingModel.name)
            setDeletingModel(null)
            await loadModels()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        loadModels()
    }

    const formatCurrency = (amount: number | null | undefined): string => {
        const value = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0
        return `${value.toLocaleString('fr-FR')} FCFA`
    }

    if (loading && !data) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-black min-h-screen">
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-black dark:text-white">Liste des Modèles</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => {/* Exporter */}}
                        className="px-4 py-2 text-black dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors font-medium flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Exporter
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouveau modèle
                    </button>
                </div>
            </div>

            {/* Erreurs */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 p-4 rounded-lg flex justify-between items-start">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-700 hover:text-red-900 dark:text-red-200 dark:hover:text-red-100"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Contenu */}
            <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="space-y-4">
                    {/* Recherche */}
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Rechercher un modèle..."
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium"
                        >
                            {loading ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </form>

                    {/* Tableau */}
                    <ModelsTable
                        models={data?.items || []}
                        loading={loading}
                        actionLoading={actionLoading}
                        onEdit={openEdit}
                        onView={(m) => setViewingModel(m)}
                        onDelete={(modelId) => {
                            const m = (data?.items ?? []).find(it => it.id === modelId)
                            if (m) setDeletingModel(m)
                        }}
                    />
                </div>
            </div>

            {/* Modale création */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Ajouter un modèle</h3>
                        <form onSubmit={handleCreateModel} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom du modèle *"
                                value={newModel.name}
                                onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                                required
                            />
                            <textarea
                                placeholder="Description"
                                value={newModel.description}
                                onChange={(e) => setNewModel(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                            />
                            <input
                                type="number"
                                placeholder="Prix (FCFA) *"
                                value={newModel.price || ''}
                                onChange={(e) => setNewModel(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                                required
                            />

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-white/70 mb-2">Photo du modèle *</label>
                                {newImagePreview ? (
                                    <div className="relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={newImagePreview}
                                            alt="Aperçu"
                                            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            className="absolute top-2 right-2 p-1 bg-black/80 text-white rounded-full hover:bg-black"
                                            aria-label="Retirer l'image"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
                                        <PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Cliquez pour téléverser une image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium"
                                >
                                    {actionLoading === 'create' ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modale édition */}
            {editingModel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingModel(null)}>
                    <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Modifier le modèle</h3>
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom du modèle *"
                                value={editForm.name}
                                onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                                required
                            />
                            <textarea
                                placeholder="Description"
                                value={editForm.description}
                                onChange={e => setEditForm(prev => ({...prev, description: e.target.value}))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                            />
                            <input
                                type="number"
                                placeholder="Prix (FCFA) *"
                                value={editForm.price || ''}
                                onChange={e => setEditForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                                required
                            />
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-white/70 mb-2">Photo</label>
                                {editImagePreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={editImagePreview}
                                        alt="Aperçu"
                                        className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                    />
                                ) : (
                                    <div className="w-full h-48 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                                        <PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                )}
                                <label className="mt-2 inline-flex items-center gap-1 cursor-pointer text-xs text-gray-700 dark:text-white/70 hover:text-black dark:hover:text-white">
                                    <PhotoIcon className="w-3.5 h-3.5" />
                                    Changer la photo
                                    <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                                </label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingModel(null)}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading === `edit-${editingModel.id}`}
                                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium"
                                >
                                    {actionLoading === `edit-${editingModel.id}` ? 'Sauvegarde...' : 'Sauvegarder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modale détail (lecture seule) */}
            {viewingModel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewingModel(null)}>
                    <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-black dark:text-white">{viewingModel.name}</h2>
                            <button
                                onClick={() => setViewingModel(null)}
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        {viewingModel.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={viewingModel.image_url}
                                alt={viewingModel.name}
                                className="w-full h-64 object-cover rounded-xl border border-gray-200 dark:border-gray-800 mb-4"
                            />
                        ) : (
                            <div className="w-full h-64 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center mb-4">
                                <PhotoIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                            </div>
                        )}

                        <div className="space-y-3 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prix</p>
                                <p className="font-semibold text-black dark:text-white">
                                    {formatCurrency(viewingModel.price)}
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                                <p className="text-black dark:text-white whitespace-pre-wrap">
                                    {viewingModel.description || <span className="italic text-gray-500">Aucune description</span>}
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Créé le</p>
                                <p className="text-black dark:text-white">
                                    {new Date(viewingModel.created_at).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-5">
                            <button
                                onClick={() => setViewingModel(null)}
                                className="flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    const m = viewingModel
                                    setViewingModel(null)
                                    openEdit(m)
                                }}
                                className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 font-medium"
                            >
                                Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale aperçu */}
            {viewingModel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewingModel(null)}>
                    <div className="bg-white dark:bg-neutral-950 rounded-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-black dark:text-white">{viewingModel.name}</h3>
                            <button
                                onClick={() => setViewingModel(null)}
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        {viewingModel.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={viewingModel.image_url}
                                alt={viewingModel.name}
                                className="w-full max-h-[60vh] object-contain rounded-xl border border-gray-200 dark:border-gray-800 mb-4 bg-gray-50 dark:bg-gray-900"
                            />
                        ) : (
                            <div className="w-full h-64 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 mb-4 flex items-center justify-center">
                                <PhotoIcon className="w-10 h-10 text-gray-400" />
                            </div>
                        )}

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Prix</span>
                                <span className="font-semibold text-black dark:text-white tabular-nums">
                                    {formatCurrency(viewingModel.price)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Créé le</span>
                                <span className="text-black dark:text-white">
                                    {new Date(viewingModel.created_at).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}
                                </span>
                            </div>
                            {viewingModel.description && (
                                <div className="pt-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Description</p>
                                    <p className="text-black dark:text-white whitespace-pre-line">{viewingModel.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setViewingModel(null)}
                                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    const m = viewingModel
                                    setViewingModel(null)
                                    openEdit(m)
                                }}
                                className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                            >
                                Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation suppression */}
            {deletingModel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDeletingModel(null)}>
                    <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Supprimer ce modèle ?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            <strong className="text-black dark:text-white">{deletingModel.name}</strong> sera définitivement supprimé.
                            Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingModel(null)}
                                className="flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => void handleConfirmDelete()}
                                disabled={actionLoading === `delete-${deletingModel.id}`}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                            >
                                {actionLoading === `delete-${deletingModel.id}` ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
