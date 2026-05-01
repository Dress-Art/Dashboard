'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {useTranslations} from 'next-intl'
import {type ApiEntity, useApi} from '@/lib/useApi'

/**
 * ApiFormDialog
 * Dialog accessible pour créer/éditer une API.
 * - A11y: role="dialog", aria-modal, focus initial, fermeture par Échap
 * - i18n: clés sous `pages.apis.*`
 */
export interface ApiFormDialogProps {
	open: boolean
	initial?: Partial<ApiEntity> | null
	onClose: () => void
	onSaved?: (entity: ApiEntity, mode: 'create' | 'update') => void
}

export function ApiFormDialog({open, initial, onClose, onSaved}: ApiFormDialogProps) {
	const t = useTranslations('pages.apis')
	const api = useApi()

	const [name, setName] = useState(initial?.name ?? '')
	const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '')
	const [version, setVersion] = useState(initial?.version ?? '')
	const [status, setStatus] = useState<ApiEntity['status']>(
		(initial?.status as ApiEntity['status']) ?? 'up',
	)
	const [enabled, setEnabled] = useState<boolean>(
		initial?.enabled ?? true,
	)
	const [tags, setTags] = useState<string>((initial?.tags ?? []).join(', '))
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const isEdit = useMemo(() => Boolean(initial && initial.id), [initial])
	const titleId = 'api-form-title'
	const firstFieldRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (open) {
			// réinit à l'ouverture
			setName(initial?.name ?? '')
			setBaseUrl(initial?.baseUrl ?? '')
			setVersion(initial?.version ?? '')
			setStatus((initial?.status as ApiEntity['status']) ?? 'up')
			setEnabled(initial?.enabled ?? true)
			setTags((initial?.tags ?? []).join(', '))
			setError(null)
			// focus
			setTimeout(() => firstFieldRef.current?.focus(), 0)
		}
	}, [open, initial])

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onClose])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setSubmitting(true)
		setError(null)
		try {
			const payload = {
				name: name.trim(),
				baseUrl: baseUrl.trim(),
				version: version.trim(),
				status,
				enabled,
				tags: tags
					.split(',')
					.map(s => s.trim())
					.filter(Boolean),
			}
			let saved: ApiEntity
			if (isEdit && initial?.id) {
				saved = await api.apis.update(initial.id as string, payload)
				onSaved?.(saved, 'update')
			} else {
				saved = await api.apis.create(payload)
				onSaved?.(saved, 'create')
			}
			onClose()
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setSubmitting(false)
		}
	}

	if (!open) return null

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center'
			role='dialog'
			aria-modal
			aria-labelledby={titleId}
		>
			<div
				className='absolute inset-0 bg-black/50'
				onClick={onClose}
				aria-hidden
			/>
			<div className='relative z-10 w-full max-w-lg rounded-lg border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20'>
				<header className='mb-3'>
					<h3 id={titleId} className='text-base font-medium'>
						{isEdit ? t('fields.edit') : t('form')}
					</h3>
				</header>
				<form onSubmit={handleSubmit} className='space-y-3'>
					<div>
						<label htmlFor='api-name' className='block text-xs text-white/70'>
							{t('fields.name')}
						</label>
						<input
							id='api-name'
							ref={firstFieldRef}
							value={name}
							onChange={e => setName(e.target.value)}
							className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white/20'
							required
						/>
					</div>
					<div>
						<label htmlFor='api-baseUrl' className='block text-xs text-white/70'>
							{t('fields.baseUrl')}
						</label>
						<input
							id='api-baseUrl'
							value={baseUrl}
							onChange={e => setBaseUrl(e.target.value)}
							type='url'
							className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white/20'
							required
						/>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div>
							<label htmlFor='api-version' className='block text-xs text-white/70'>
								{t('fields.version')}
							</label>
							<input
								id='api-version'
								value={version}
								onChange={e => setVersion(e.target.value)}
								className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white/20'
								required
							/>
						</div>
						<div>
							<label htmlFor='api-status' className='block text-xs text-white/70'>
								{t('fields.status')}
							</label>
							<select
								id='api-status'
								value={status}
								onChange={e => setStatus(e.target.value as ApiEntity['status'])}
								className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-white/20'
							>
								<option value='up'>{t('status.up')}</option>
								<option value='down'>{t('status.down')}</option>
							</select>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<input
							id='api-enabled'
							type='checkbox'
							checked={enabled}
							onChange={e => setEnabled(e.target.checked)}
							className='h-4 w-4 rounded border-white/20 bg-white/10'
						/>
						<label htmlFor='api-enabled' className='text-xs text-white/70'>
							{t('fields.enabled')}
						</label>
					</div>
					<div>
						<label htmlFor='api-tags' className='block text-xs text-white/70'>
							{t('fields.tags')}
						</label>
						<input
							id='api-tags'
							value={tags}
							onChange={e => setTags(e.target.value)}
							placeholder='tag1, tag2'
							className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white/20'
						/>
					</div>

					{error && (
						<p role='alert' className='text-xs text-amber-400'>
							{t('error')}: {error}
						</p>
					)}

					<div className='mt-4 flex items-center justify-end gap-2'>
						<button
							type='button'
							onClick={onClose}
							className='rounded-md bg-white/5 px-3 py-1 hover:bg-white/10'
						>
							{t('cancel')}
						</button>
						<button
							type='submit'
							disabled={submitting}
							className='rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-50'
						>
							{t('save')}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
