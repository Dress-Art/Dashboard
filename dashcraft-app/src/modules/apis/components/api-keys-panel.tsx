'use client'

import {useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent} from 'react'
import {useTranslations} from 'next-intl'
import {Icon} from '@/lib/icons'
import {type ApiKeyEntity, type Paginated, useApi} from '@/lib/useApi'

/**
 * ApiKeysPanel
 * Panneau latéral pour gérer les clés d'une API (CRUD + rotation).
 * - A11y: role='dialog', aria-modal, aria-live pour annonces
 * - i18n: sous `pages.apis.keys.*`
 *
 * @param open Indique si le panneau est visible
 * @param apiId Identifiant de l'API ciblée
 * @param apiName Nom de l'API (affichage facultatif dans l'entête)
 * @param onClose Callback déclenché lors de la fermeture (overlay, bouton, Escape)
 */
export interface ApiKeysPanelProps {
	open: boolean
	apiId: string | null
	apiName?: string
	onClose: () => void
}

export function ApiKeysPanel({open, apiId, apiName, onClose}: ApiKeysPanelProps) {
	const t = useTranslations('pages.apis.keys')
	const tApis = useTranslations('pages.apis')
	const api = useApi()

	const [q, setQ] = useState('')
	const [status, setStatus] = useState<ApiKeyEntity['status'] | 'all'>('all')
	const [sortBy, setSortBy] = useState<'createdAt' | 'lastUsedAt' | 'label'>('createdAt')
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const emptyPage: Paginated<ApiKeyEntity> = useMemo(
		() => ({items: [], total: 0, page: 1, pageSize: 10, totalPages: 1}),
		[],
	)
	const [data, setData] = useState<Paginated<ApiKeyEntity>>(emptyPage)

	const [label, setLabel] = useState('')
	const [scopes, setScopes] = useState('read')
	const [submitting, setSubmitting] = useState(false)

	const liveRef = useRef<HTMLDivElement>(null)
	const searchRef = useRef<HTMLInputElement>(null)
	const asideRef = useRef<HTMLElement>(null)
	const [entered, setEntered] = useState(false)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (!open) return
		setQ('')
		setStatus('all')
		setSortBy('createdAt')
		setSortDir('desc')
		setPage(1)
		setPageSize(10)
		setError(null)
		setLabel('')
		setScopes('read')
	}, [open])

	// Rendre visible lors de l'ouverture
	useEffect(() => {
		if (open) setVisible(true)
	}, [open])

	// Transitions entrée/sortie (slide-in/out)
	useEffect(() => {
		if (open) {
			setEntered(false)
			const id = requestAnimationFrame(() => setEntered(true))
			return () => cancelAnimationFrame(id)
		} else if (visible) {
			setEntered(false)
			const t = setTimeout(() => setVisible(false), 300)
			return () => clearTimeout(t)
		}
	}, [open, visible])

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onClose])

	useEffect(() => {
		if (!open) return
		const id = setTimeout(() => {
			const ae = (typeof document !== 'undefined'
				? (document.activeElement as HTMLElement | null)
				: null)
			const isInsidePanel = !!(ae && asideRef.current && asideRef.current.contains(ae))
			if (!isInsidePanel) {
				searchRef.current?.focus()
			}
		}, 50)
		return () => clearTimeout(id)
	}, [open])

	// Focus trap dans le panneau: Tab/Shift+Tab restent dans l'aside
	useEffect(() => {
		if ((!open && !visible) || !asideRef.current) return
		const el = asideRef.current
		const selector = [
			'a[href]','area[href]','input:not([disabled])','select:not([disabled])',
			'textarea:not([disabled])','button:not([disabled])','[role="button"]',
			'[tabindex]:not([tabindex="-1"])',
		].join(',')
		function getFocusable() {
			return Array.from(el.querySelectorAll<HTMLElement>(selector))
		}
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== 'Tab') return
			const f = getFocusable()
			if (f.length === 0) return
			const first = f[0]
			const last = f[f.length - 1]
			const active = (typeof document !== 'undefined'
				? (document.activeElement as HTMLElement | null)
				: null)
			if (e.shiftKey) {
				if (!active || active === first || !el.contains(active)) {
					e.preventDefault()
					last.focus()
				}
			} else {
				if (active === last) {
					e.preventDefault()
					first.focus()
				}
			}
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [open, visible])

	const fetchList = useCallback(async () => {
		if (!apiId) return
		setLoading(true)
		setError(null)
		try {
			const res = await api.apiKeys.list({
				page,
				pageSize,
				q: q.trim(),
				apiId,
				status,
				sortBy,
				sortDir,
			})
			setData(res)
		} catch (e) {
			setError((e as Error).message)
			setData(emptyPage)
		} finally {
			setLoading(false)
		}
	}, [api.apiKeys, apiId, page, pageSize, q, status, sortBy, sortDir, emptyPage])

	useEffect(() => {
		if (open && apiId) void fetchList()
	}, [open, apiId, fetchList])

	function announce(msg: string) {
		if (!liveRef.current) return
		liveRef.current.textContent = msg
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		if (!apiId) return
		setSubmitting(true)
		setError(null)
		try {
			await api.apiKeys.create({
				apiId,
				label: label.trim(),
				scopes: scopes
					.split(',')
					.map(s => s.trim())
					.filter(Boolean),
			})
			announce(t('live.created'))
			setLabel('')
			setScopes('read')
			await fetchList()
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setSubmitting(false)
		}
	}

	async function handleRotate(id: string) {
		try {
			await api.apiKeys.rotate(id)
			announce(t('live.rotated'))
			await fetchList()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleToggleStatus(k: ApiKeyEntity) {
		try {
			await api.apiKeys.update(k.id, {status: k.status === 'active' ? 'revoked' : 'active'})
			announce(t('live.updated'))
			await fetchList()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleDelete(id: string) {
		try {
			await api.apiKeys.delete(id)
			announce(t('live.deleted'))
			await fetchList()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	const [copiedId, setCopiedId] = useState<string | null>(null)
	async function handleCopy(k: ApiKeyEntity) {
		try {
			await navigator.clipboard.writeText(k.key)
			setCopiedId(k.id)
			setTimeout(() => setCopiedId(null), 1500)
		} catch (err) {
			setError((err as Error).message)
		}
	}

	if ((!open && !visible) || !apiId) return null

	return (
		<div
			className='fixed inset-0 z-50 flex items-stretch justify-end'
			role='dialog'
			aria-modal='true'
			aria-labelledby='keys-panel-title'
		>
			<div
				className={
					'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ' +
					(entered ? 'opacity-100' : 'opacity-0')
				}
				onClick={onClose}
				aria-hidden='true'
			/>
			<aside
				ref={asideRef}
				className={
					'relative z-10 h-full w-full max-w-3xl overscroll-contain overflow-y-auto border-l border-black/10 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-4 text-zinc-900 dark:text-zinc-100 ' +
					'transform transition-transform duration-300 ease-out will-change-transform ' +
					(entered ? 'translate-x-0' : 'translate-x-full')
				}
			>
				<header className='mb-4 flex items-center justify-between'>
					<h3 id='keys-panel-title' className='text-base font-medium text-zinc-900 dark:text-white'>
						{t('title')} {apiName ? `· ${apiName}` : ''}
					</h3>
					<button
						type='button'
						onClick={onClose}
						className='rounded-full bg-black/10 px-2 py-1 hover:bg-black/20 text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:focus-visible:ring-white/20'
						aria-label={tApis('cancel')}
					>
						<Icon name='x-circle' className='h-5 w-5' />
					</button>
				</header>

				<div className='mb-6 grid grid-cols-1 gap-3 rounded-md bg-zinc-50 p-3 ring-1 ring-black/5 dark:bg-zinc-900/40 dark:ring-white/10 md:grid-cols-3'>
					<div>
						<label htmlFor='keys-q' className='block text-[11px] font-medium text-zinc-700 dark:text-white/70'>
							{tApis('search')}
						</label>
						<input
							id='keys-q'
							value={q}
							onChange={(e: ChangeEvent<HTMLInputElement>) => {
								setQ(e.target.value)
								setPage(1)
							}}
							placeholder={tApis('searchPlaceholder')}
							className='mt-1 w-full rounded-md border border-black/10 bg-black/5 px-2 py-1 text-zinc-900 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50 dark:focus:ring-white/20'
							ref={searchRef}
						/>
					</div>
					<div>
						<label htmlFor='keys-status' className='block text-[11px] font-medium text-zinc-700 dark:text-white/70'>
							{t('filter.label')}
						</label>
						<select
							id='keys-status'
							value={status}
							onChange={(e: ChangeEvent<HTMLSelectElement>) => {
								setStatus(e.target.value as ApiKeyEntity['status'] | 'all')
								setPage(1)
							}}
							className='mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-white dark:focus:ring-zinc-700'
						>
							<option value='all'>{t('filter.all')}</option>
							<option value='active'>{t('status.active')}</option>
							<option value='revoked'>{t('status.revoked')}</option>
						</select>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div>
							<label htmlFor='keys-sort-by' className='block text-[11px] font-medium text-zinc-700 dark:text-white/70'>
								{t('sort.by')}
							</label>
							<select
								id='keys-sort-by'
								value={sortBy}
								onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'createdAt' | 'lastUsedAt' | 'label')}
								className='mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-white dark:focus:ring-zinc-700'
							>
								<option value='createdAt'>{t('sort.byCreatedAt')}</option>
								<option value='lastUsedAt'>{t('sort.byLastUsedAt')}</option>
								<option value='label'>{t('sort.byLabel')}</option>
							</select>
						</div>
						<div>
							<label htmlFor='keys-sort-dir' className='block text-[11px] font-medium text-zinc-700 dark:text-white/70'>
								{t('sort.dir')}
							</label>
							<select
								id='keys-sort-dir'
								value={sortDir}
								onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortDir(e.target.value as 'asc' | 'desc')}
								className='mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-white dark:focus:ring-zinc-700'
							>
								<option value='asc'>{t('sort.asc')}</option>
								<option value='desc'>{t('sort.desc')}</option>
							</select>
						</div>
					</div>
				</div>

				<section aria-labelledby='keys-create-form' className='mb-6 rounded-md bg-zinc-50 p-3 ring-1 ring-black/5 dark:bg-zinc-900/40 dark:ring-white/10'>
					<h4 id='keys-create-form' className='mb-3 text-sm font-medium'>
						{t('form')}
					</h4>
					<form onSubmit={handleCreate} className='grid grid-cols-1 gap-3 md:grid-cols-3'>
						<div>
							<label htmlFor='key-label' className='block text-[11px] font-medium text-zinc-700 dark:text-white/70'>
								{t('fields.label')}
							</label>
							<input
								id='key-label'
								value={label}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
								required
								className='mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/50 dark:focus:ring-zinc-700'
							/>
						</div>
						<div>
							<label htmlFor='key-scopes' className='block text-[11px] font-medium text-zinc-700 dark:text-white/70'>
								{t('fields.scopes')}
							</label>
							<input
								id='key-scopes'
								value={scopes}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setScopes(e.target.value)}
								placeholder={t('fields.scopesPlaceholder')}
								className='mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-zinc-900 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/50 dark:focus:ring-zinc-700'
							/>
						</div>
						<div className='flex items-end'>
							<button
								type='submit'
								disabled={submitting}
								className='h-[34px] w-full rounded-md bg-zinc-900 px-3 py-1 text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
							>
								{t('addKey')}
							</button>
						</div>
					</form>
				</section>

				<div className='mt-6 overflow-auto rounded-md ring-1 ring-black/5 dark:ring-white/10'>
					<table className='min-w-full text-sm' aria-busy={loading} aria-label={t('title')}>
						<thead className='sticky top-0 z-10 bg-white/90 text-left text-xs uppercase tracking-wide text-zinc-700 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-900/90 dark:supports-[backdrop-filter]:bg-zinc-900/60 dark:text-white/70'>
							<tr>
								<th scope='col' className='pb-2 pr-4'>{t('fields.label')}</th>
								<th scope='col' className='pb-2 pr-4'>{t('fields.key')}</th>
								<th scope='col' className='pb-2 pr-4'>{t('fields.status')}</th>
								<th scope='col' className='pb-2 pr-4'>{t('fields.scopes')}</th>
								<th scope='col' className='pb-2 pr-4'>{t('fields.createdAt')}</th>
								<th scope='col' className='pb-2 pr-4'>{t('fields.lastUsedAt')}</th>
								<th scope='col' className='pb-2'>{t('fields.actions')}</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-zinc-200 dark:divide-zinc-700'>
							{data.items.map(k => (
								<tr key={k.id}>
									<td className='py-2 pr-4'>{k.label}</td>
									<td className='py-2 pr-4'>
										<div className='inline-flex items-center gap-2'>
											<code className='inline-block max-w-[220px] truncate rounded bg-zinc-100 px-2 py-0.5 font-mono text-[12px] text-zinc-800 dark:bg-zinc-900/50 dark:text-white'>{k.key}</code>
											<button
												type='button'
												onClick={() => handleCopy(k)}
												className='rounded-md bg-white px-2 py-1 text-zinc-900 ring-1 ring-black/5 transition hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-white dark:ring-white/10 dark:hover:bg-zinc-900/70'
												aria-label={t('fields.copy')}
											>
												{copiedId === k.id ? t('fields.copied') : t('fields.copy')}
											</button>
										</div>
									</td>
									<td className='py-2 pr-4'>
										<span className={k.status === 'active' ? 'inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30' : 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30'}>
											{t(`status.${k.status}`)}
										</span>
									</td>
									<td className='py-2 pr-4'>{k.scopes.join(', ')}</td>
									<td className='py-2 pr-4 whitespace-nowrap'>
										{new Date(k.createdAt).toLocaleString()}
									</td>
									<td className='py-2 pr-4 whitespace-nowrap'>
										{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '-'}
									</td>
									<td className='py-2'>
										<div className='flex items-center gap-2'>
											<button
												type='button'
												onClick={() => handleRotate(k.id)}
												className='rounded-md bg-white px-2 py-1 text-zinc-900 ring-1 ring-black/5 transition hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-white dark:ring-white/10 dark:hover:bg-zinc-900/70'
												aria-label={t('fields.rotate')}
											>
												{t('fields.rotate')}
											</button>
											<button
												type='button'
												onClick={() => handleToggleStatus(k)}
												className='rounded-md bg-white px-2 py-1 text-zinc-900 ring-1 ring-black/5 transition hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-white dark:ring-white/10 dark:hover:bg-zinc-900/70'
												aria-label={tApis('fields.edit')}
											>
												{tApis('fields.edit')}
											</button>
											<button
												type='button'
												onClick={() => handleDelete(k.id)}
												className='rounded-md bg-white px-2 py-1 text-zinc-900 ring-1 ring-black/5 transition hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-white dark:ring-white/10 dark:hover:bg-zinc-900/70'
												aria-label={tApis('fields.delete')}
											>
												{tApis('fields.delete')}
											</button>
										</div>
									</td>
								</tr>
							))}
							{!loading && data.items.length === 0 && (
								<tr>
									<td className='py-3 text-zinc-700 dark:text-white/70' colSpan={7}>
										{t('noResults')}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className='mt-6 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between'>
					<div role='status' aria-live='polite' className='text-xs text-zinc-600 dark:text-white/70'>
						{loading ? t('loading') : error ? t('error') : `${data.total}`}
					</div>
					<div className='flex items-center gap-2'>
						<label htmlFor='keys-page-size' className='text-[11px] font-medium text-zinc-700 dark:text-white/70'>
							{tApis('pageSize')}
						</label>
						<select
							id='keys-page-size'
							value={pageSize}
							onChange={(e: ChangeEvent<HTMLSelectElement>) => {
								setPageSize(Number(e.target.value))
								setPage(1)
							}}
							className='rounded-md border border-black/10 bg-black/5 px-2 py-1 text-zinc-900 outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-white/20'
						>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={20}>20</option>
						</select>
					</div>
					<nav className='flex items-center gap-2' aria-label='pagination'>
						<button
							type='button'
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page <= 1 || loading}
							className='rounded-md bg-white px-2 py-1 text-zinc-900 ring-1 ring-black/5 enabled:hover:bg-zinc-50 disabled:opacity-50 dark:bg-zinc-900 dark:text-white dark:ring-white/10 dark:enabled:hover:bg-zinc-900/70'
						>
							{tApis('previous')}
						</button>
						<span className='text-xs text-zinc-700 dark:text-white/70'>
							{tApis('page')} {page} {tApis('of')} {data.totalPages}
						</span>
						<button
							type='button'
							onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
							disabled={page >= data.totalPages || loading}
							className='rounded-md bg-white px-2 py-1 text-zinc-900 ring-1 ring-black/5 enabled:hover:bg-zinc-50 disabled:opacity-50 dark:bg-zinc-900 dark:text-white dark:ring-white/10 dark:enabled:hover:bg-zinc-900/70'
						>
							{tApis('next')}
						</button>
					</nav>
				</div>
				<div ref={liveRef} aria-live='polite' className='sr-only' />
			</aside>
		</div>
	)
}
