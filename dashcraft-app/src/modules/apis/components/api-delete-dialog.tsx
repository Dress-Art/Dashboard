'use client'

import {useEffect} from 'react'
import {useTranslations} from 'next-intl'

/**
 * ApiDeleteDialog
 * Boîte de dialogue accessible de confirmation de suppression d'API.
 * - A11y: role="alertdialog", aria-modal, focus management via autoFocus
 * - i18n: utilise `pages.apis.deleteConfirm`, `pages.apis.cancel`, `pages.apis.delete`
 */
export interface ApiDeleteDialogProps {
	open: boolean
	titleId?: string
	onCancel: () => void
	onConfirm: () => void
	loading?: boolean
}

export function ApiDeleteDialog({
	open,
	titleId = 'api-delete-title',
	onCancel,
	onConfirm,
	loading = false,
}: ApiDeleteDialogProps) {
	const t = useTranslations('pages.apis')

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return
			if (e.key === 'Escape') onCancel()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onCancel])

	if (!open) return null

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center'
			role='alertdialog'
			aria-modal
			aria-labelledby={titleId}
		>
			<div className='absolute inset-0 bg-black/50' onClick={onCancel} aria-hidden />
			<div className='relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20'>
				<header className='mb-3'>
					<h3 id={titleId} className='text-base font-medium'>
						{t('deleteConfirm')}
					</h3>
				</header>
				<div className='mt-4 flex items-center justify-end gap-2'>
					<button
						type='button'
						onClick={onCancel}
						className='rounded-md bg-white/5 px-3 py-1 hover:bg-white/10'
					>
						{t('cancel')}
					</button>
					<button
						type='button'
						onClick={onConfirm}
						disabled={loading}
						autoFocus
						className='rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-50'
					>
						{t('fields.delete')}
					</button>
				</div>
			</div>
		</div>
	)
}
