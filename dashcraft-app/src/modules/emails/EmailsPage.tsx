 'use client'

 import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
 import {useTranslations, useLocale} from 'next-intl'
 import {useApi, type EmailEntity} from '@/lib/useApi'
 import {Icon} from '@/lib/icons'

/**
 * EmailsPage
 * Page dédiée Emails avec recherche, filtre de statut,
 * pagination et CRUD (mock via useApi.emails).
 */
export function EmailsPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.emails')
	const locale = useLocale()
	const api = useApi()

	const [q, setQ] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all'|'unread'|'read'>('all')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<{
		items: EmailEntity[]
		total: number
		totalPages: number
	} | null>(null)

	const [creating, setCreating] = useState(false)
	const [createSubject, setCreateSubject] = useState('')
	const [createFrom, setCreateFrom] = useState('')
	const [createStatus, setCreateStatus] = useState<'unread'|'read'>('unread')

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editSubject, setEditSubject] = useState('')
	const [editFrom, setEditFrom] = useState('')
	const [editStatus, setEditStatus] = useState<'unread'|'read'>('unread')

	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const liveRef = useRef<HTMLDivElement | null>(null)

	const statusOptions = useMemo(() => (
		[
			{value: 'unread', label: t('status.unread')},
			{value: 'read', label: t('status.read')},
		]
	), [t])

	function speak (message: string) {
		if (!liveRef.current) return
		liveRef.current.textContent = message
	}

	function formatDateTime (iso: string) {
		try {
			return new Intl.DateTimeFormat(locale, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(new Date(iso))
		} catch {
			return iso
		}
	}

	const fetchPage = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await api.emails.list({
				page,
				pageSize,
				q,
				status: statusFilter === 'all' ? undefined : statusFilter,
				dateFrom: dateFrom
					? new Date(dateFrom + 'T00:00:00.000Z').toISOString()
					: undefined,
				dateTo: dateTo
					? new Date(dateTo + 'T23:59:59.999Z').toISOString()
					: undefined,
			})
			setData({items: res.items, total: res.total, totalPages: res.totalPages})
		} catch (e) {
			setError((e as Error).message)
		} finally {
			setLoading(false)
		}
	}, [api, page, pageSize, q, statusFilter, dateFrom, dateTo])

	useEffect(() => {
		fetchPage()
		setSelectedIds([])
	}, [fetchPage])

	function resetCreate () {
		setCreateSubject('')
		setCreateFrom('')
		setCreateStatus('unread')
	}

	async function handleCreate (e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			await api.emails.create({
				subject: createSubject,
				from: createFrom,
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

	function startEdit (e: EmailEntity) {
		setEditingId(e.id)
		setEditSubject(e.subject)
		setEditFrom(e.from)
		setEditStatus(e.status)
	}

	function cancelEdit () {
		setEditingId(null)
	}

	async function saveEdit (id: string) {
		try {
			await api.emails.update(id, {
				subject: editSubject,
				from: editFrom,
				status: editStatus,
			})
			speak(t('live.updated'))
			setEditingId(null)
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleDelete (id: string) {
		const ok = window.confirm(t('deleteConfirm'))
		if (!ok) return
		try {
			await api.emails.delete(id)
			speak(t('live.deleted'))
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	function mapStatus (s: EmailEntity['status']) {
		return s === 'unread' ? t('status.unread') : t('status.read')
	}

	const allOnPageSelected = useMemo(() => {
		if (!data?.items) return false
		if (data.items.length === 0) return false
		return data.items.every(it => selectedIds.includes(it.id))
	}, [data, selectedIds])

	function toggleSelectAllOnPage () {
		if (!data?.items) return
		if (allOnPageSelected) {
			setSelectedIds(prev => prev.filter(id => !data.items.some(it => it.id === id)))
		} else {
			const idsToAdd = data.items.map(it => it.id)
			setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])))
		}
	}

	function toggleSelectOne (id: string) {
		setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
	}

	async function bulkMark (status: EmailEntity['status']) {
		try {
			await api.emails.updateBulk(selectedIds, {status})
			speak(t('live.updated'))
			setSelectedIds([])
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function bulkDelete () {
		const ok = window.confirm(t('bulk.deleteConfirm'))
		if (!ok) return
		try {
			await api.emails.deleteBulk(selectedIds)
			speak(t('live.deleted'))
			setSelectedIds([])
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	return (
		<section aria-labelledby='emails-title'>
			<header className='mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='emails-title' className='text-xl font-semibold'>
						{tNav('emails')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
				<div className='flex w-full flex-col gap-2 md:max-w-3xl md:flex-row'>
					<div className='flex-1'>
						<label htmlFor='emails-search' className='sr-only'>
							{t('search')}
						</label>
						<input
							id='emails-search'
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
						<label htmlFor='emails-filter' className='block text-xs text-white/70'>
							{t('filter.label')}
						</label>
						<select
							id='emails-filter'
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
					<div className='flex gap-2 md:w-[28rem]'>
						<div className='flex-1'>
							<label htmlFor='emails-date-from' className='block text-xs text-white/70'>
								{t('dateFilter.from')}
							</label>
							<input
								id='emails-date-from'
								type='date'
								value={dateFrom}
								onChange={e => {
									setPage(1)
									setDateFrom(e.target.value)
								}}
								className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
							/>
						</div>
						<div className='flex-1'>
							<label htmlFor='emails-date-to' className='block text-xs text-white/70'>
								{t('dateFilter.to')}
							</label>
							<input
								id='emails-date-to'
								type='date'
								value={dateTo}
								onChange={e => {
									setPage(1)
									setDateTo(e.target.value)
								}}
								className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Bulk actions toolbar */}
			{selectedIds.length > 0 && (
				<div
					role='region'
					aria-label={t('bulk.label')}
					className='mb-3 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-white/5 p-2 text-sm'
				>
					<p className='mr-2'>{t('bulk.selected', {count: selectedIds.length})}</p>
					<button
						onClick={() => bulkMark('read')}
						className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'
					>
						{t('bulk.markRead')}
					</button>
					<button
						onClick={() => bulkMark('unread')}
						className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'
					>
						{t('bulk.markUnread')}
					</button>
					<button
						onClick={bulkDelete}
						className='rounded-md bg-red-600 px-2 py-1 hover:bg-red-500'
					>
						{t('bulk.deleteSelected')}
					</button>
				</div>
			)}

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
			<form onSubmit={handleCreate} aria-label={t('form')} className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-6'>
				<div className='md:col-span-3'>
					<label htmlFor='c-subject' className='block text-xs text-white/70'>
						{t('fields.subject')}
					</label>
					<input
						id='c-subject'
						value={createSubject}
						onChange={e => setCreateSubject(e.target.value)}
						required
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					/>
				</div>
				<div className='md:col-span-2'>
					<label htmlFor='c-from' className='block text-xs text-white/70'>
						{t('fields.from')}
					</label>
					<input
						id='c-from'
						type='email'
						value={createFrom}
						onChange={e => setCreateFrom(e.target.value)}
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
						disabled={creating || !createSubject.trim() || !createFrom.trim()}
						className='rounded-md bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50'
					>
						{t('addEmail')}
					</button>
				</div>
			</form>

			<div className='overflow-x-auto rounded-lg border border-white/10'>
				<table className='min-w-full text-sm' aria-label={tNav('emails')}>
					<thead className='text-left text-white/70'>
						<tr>
							<th scope='col' className='pb-2 pr-4'>
								<label className='sr-only'>{t('fields.select')}</label>
								<input
									type='checkbox'
									checked={allOnPageSelected}
									onChange={toggleSelectAllOnPage}
									aria-label={t('bulk.selectAll')}
									className='h-4 w-4 rounded border-white/20 bg-white/5'
								/>
							</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.subject')}</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.from')}</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.status')}</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.time')}</th>
							<th scope='col' className='pb-2'>{t('fields.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-white/10'>
						{loading && (
							<tr>
								<td colSpan={6} className='py-4 text-center text-white/70'>
									{t('loading')}
								</td>
							</tr>
						)}
						{!loading && data?.items.length === 0 && (
							<tr>
								<td colSpan={6} className='py-4 text-center text-white/70'>
									{t('noResults')}
								</td>
							</tr>
						)}
						{data?.items.map(e => (
							<tr key={e.id}>
								<td className='py-2 pr-4'>
									<input
										type='checkbox'
										checked={selectedIds.includes(e.id)}
										onChange={() => toggleSelectOne(e.id)}
										aria-label={t('bulk.selectRow')}
										className='h-4 w-4 rounded border-white/20 bg-white/5'
									/>
								</td>
								<td className='py-2 pr-4'>
									{editingId === e.id ? (
										<input
											value={editSubject}
											onChange={ev => setEditSubject(ev.target.value)}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span>{e.subject}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === e.id ? (
										<input
											value={editFrom}
											onChange={ev => setEditFrom(ev.target.value)}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span>{e.from}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === e.id ? (
										<select
											value={editStatus}
											onChange={ev => setEditStatus(ev.target.value as EmailEntity['status'])}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										>
											{statusOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										<span className='inline-flex items-center gap-2'>
											<Icon
												name={e.status === 'unread' ? 'envelope' : 'envelope-open'}
												className={e.status === 'unread' ? 'h-5 w-5 text-blue-400' : 'h-5 w-5 text-white/80'}
											/>
											<span className={e.status === 'unread' ? 'text-blue-400' : 'text-white/80'}>
												{mapStatus(e.status)}
											</span>
										</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									<span>{formatDateTime(e.time)}</span>
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										{editingId === e.id ? (
											<>
												<button
													onClick={() => saveEdit(e.id)}
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
													onClick={() => startEdit(e)}
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													aria-label={t('fields.edit')}
												>
													{t('fields.edit')}
												</button>
												<button
													onClick={() => handleDelete(e.id)}
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
