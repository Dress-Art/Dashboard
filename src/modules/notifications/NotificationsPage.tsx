'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {useTranslations} from 'next-intl'
import {useApi, type NotificationEntity} from '@/lib/useApi'

/**
 * NotificationsPage
 * Page dédiée Notifications avec recherche, filtre de statut,
 * pagination et CRUD (mock via useApi.notifications).
 */
export function NotificationsPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.notifications')
	const api = useApi()

	const [q, setQ] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all'|'unread'|'read'>('all')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<{
		items: NotificationEntity[]
		total: number
		totalPages: number
	} | null>(null)

	const [creating, setCreating] = useState(false)
	const [createTitle, setCreateTitle] = useState('')
	const [createStatus, setCreateStatus] = useState<'unread'|'read'>('unread')

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editTitle, setEditTitle] = useState('')
	const [editStatus, setEditStatus] = useState<'unread'|'read'>('unread')

	const liveRef = useRef<HTMLDivElement | null>(null)

	const statusOptions = useMemo(() => (
		[
			{value: 'unread', label: t('status.unread')},
			{value: 'read', label: t('status.read')},
		]
	), [t])

	function speak(message: string) {
		if (!liveRef.current) return
		liveRef.current.textContent = message
	}

	async function fetchPage() {
		setLoading(true)
		setError(null)
		try {
			const res = await api.notifications.list({
				page,
				pageSize,
				q,
				status: statusFilter === 'all' ? undefined : statusFilter,
			})
			setData({items: res.items, total: res.total, totalPages: res.totalPages})
		} catch (e) {
			setError((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchPage()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, pageSize, q, statusFilter])

	function resetCreate() {
		setCreateTitle('')
		setCreateStatus('unread')
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			await api.notifications.create({
				title: createTitle,
				status: createStatus,
			})
			speak(t('live.created'))
			resetCreate()
			setPage(1)
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setCreating(false)
		}
	}

	function startEdit(n: NotificationEntity) {
		setEditingId(n.id)
		setEditTitle(n.title)
		setEditStatus(n.status)
	}

	function cancelEdit() {
		setEditingId(null)
	}

	async function saveEdit(id: string) {
		try {
			await api.notifications.update(id, {
				title: editTitle,
				status: editStatus,
			})
			speak(t('live.updated'))
			setEditingId(null)
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleDelete(id: string) {
		const ok = window.confirm(t('deleteConfirm'))
		if (!ok) return
		try {
			await api.notifications.delete(id)
			speak(t('live.deleted'))
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	function mapStatus(s: NotificationEntity['status']) {
		return s === 'unread' ? t('status.unread') : t('status.read')
	}

	return (
		<section aria-labelledby='notifications-title'>
			<header className='mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='notifications-title' className='text-xl font-semibold'>
						{tNav('notifications')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
				<div className='flex w-full flex-col gap-2 md:max-w-xl md:flex-row'>
					<div className='flex-1'>
						<label htmlFor='notifications-search' className='sr-only'>
							{t('search')}
						</label>
						<input
							id='notifications-search'
							type='search'
							value={q}
							onChange={e => {
								setPage(1)
								setQ(e.target.value)
							}}
							placeholder={t('searchPlaceholder')}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
							aria-label={t('search')}
						/>
					</div>
					<div className='md:w-56'>
						<label htmlFor='notifications-filter' className='block text-xs text-white/70'>
							{t('filter.label')}
						</label>
						<select
							id='notifications-filter'
							value={statusFilter}
							onChange={e => {
								setPage(1)
								setStatusFilter(e.target.value as 'all'|'unread'|'read')
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='all'>{t('filter.all')}</option>
							<option value='unread'>{t('filter.unread')}</option>
							<option value='read'>{t('filter.read')}</option>
						</select>
					</div>
				</div>
			</header>

			<div
				ref={liveRef}
				className='sr-only'
				aria-live='polite'
				aria-atomic='true'
			/>

			{error && (
				<div
					role='alert'
					aria-live='assertive'
					className='mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200'
				>
					<span className='font-medium'>{t('error')}</span>: {error}
				</div>
			)}

			{/* Create */}
			<form onSubmit={handleCreate} aria-label={t('form')} className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-5'>
				<div className='md:col-span-3'>
					<label htmlFor='c-title' className='block text-xs text-white/70'>
						{t('fields.title')}
					</label>
					<input
						id='c-title'
						value={createTitle}
						onChange={e => setCreateTitle(e.target.value)}
						required
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					/>
				</div>
				<div>
					<label htmlFor='c-status' className='block text-xs text-white/70'>
						{t('fields.status')}
					</label>
					<select
						id='c-status'
						value={createStatus}
						onChange={e => setCreateStatus(e.target.value as 'unread'|'read')}
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					>
						{statusOptions.map(o => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))}
					</select>
				</div>
				<div className='md:self-end'>
					<button
						type='submit'
						disabled={creating || !createTitle.trim()}
						className='rounded-md bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50'
					>
						{t('addNotification')}
					</button>
				</div>
			</form>

			<div className='overflow-x-auto rounded-lg border border-white/10'>
				<table className='min-w-full text-sm' aria-label={tNav('notifications')}>
					<thead className='text-left text-white/70'>
						<tr>
							<th scope='col' className='pb-2 pr-4'>{t('fields.title')}</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.status')}</th>
							<th scope='col' className='pb-2'>{t('fields.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-white/10'>
						{loading && (
							<tr>
								<td colSpan={3} className='py-4 text-center text-white/70'>
									{t('loading')}
								</td>
							</tr>
						)}
						{!loading && data?.items.length === 0 && (
							<tr>
								<td colSpan={3} className='py-4 text-center text-white/70'>
									{t('noResults')}
								</td>
							</tr>
						)}
						{data?.items.map(n => (
							<tr key={n.id}>
								<td className='py-2 pr-4'>
									{editingId === n.id ? (
										<input
											value={editTitle}
											onChange={e => setEditTitle(e.target.value)}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span>{n.title}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === n.id ? (
										<select
											value={editStatus}
											onChange={e => setEditStatus(e.target.value as NotificationEntity['status'])}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										>
											{statusOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										<span className={n.status === 'unread' ? 'text-blue-400' : 'text-white/80'}>
											{mapStatus(n.status)}
										</span>
									)}
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										{editingId === n.id ? (
											<>
												<button
													onClick={() => saveEdit(n.id)}
													className='rounded-md bg-green-600 px-2 py-1 text-sm hover:bg-green-500'
												>
													{t('save')}
												</button>
												<button
													onClick={cancelEdit}
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
												>
													{t('cancel')}
												</button>
											</>
										) : (
											<>
												<button
													onClick={() => startEdit(n)}
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													aria-label={t('fields.edit')}
												>
													{t('fields.edit')}
												</button>
												<button
													onClick={() => handleDelete(n.id)}
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													aria-label={t('fields.delete')}
												>
													{t('fields.delete')}
												</button>
											</>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className='mt-4 flex flex-col items-center gap-3 md:flex-row md:justify-between'>
				<div className='flex items-center gap-2'>
					<button
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={loading || (data?.totalPages ?? 1) <= 1 || page <= 1}
						className='rounded-md bg-white/5 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50'
					>
						{t('previous')}
					</button>
					<p className='text-sm text-white/80'>
						{t('page')} {page} {t('of')} {data?.totalPages ?? 1}
					</p>
					<button
						onClick={() => setPage(p => p + 1)}
						disabled={loading || (data?.totalPages ?? 1) <= 1 || page >= (data?.totalPages ?? 1)}
						className='rounded-md bg-white/5 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50'
					>
						{t('next')}
					</button>
				</div>
				<div className='flex items-center gap-2'>
					<label htmlFor='page-size' className='text-sm text-white/70'>
						{t('pageSize')}
					</label>
					<select
						id='page-size'
						value={pageSize}
						onChange={e => {
							setPage(1)
							setPageSize(Number(e.target.value))
						}}
						className='rounded-md border border-white/10 bg-white/5 p-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500'
					>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={20}>20</option>
					</select>
				</div>
			</div>
		</section>
	)
}
