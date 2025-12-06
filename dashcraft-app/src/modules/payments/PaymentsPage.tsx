'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useTranslations, useLocale} from 'next-intl'
import {useApi, type PaymentEntity} from '@/lib/useApi'
import {Icon} from '@/lib/icons'

/**
 * PaymentsPage
 * Page dédiée Paiements avec recherche, filtre de statut,
 * pagination et CRUD (mock via useApi.payments).
 * A11y: libellés explicites, aria-live pour messages, tableau accessible.
 */
export function PaymentsPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.payments')
	const locale = useLocale()
	const api = useApi()

	const [q, setQ] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all'|'succeeded'|'pending'|'failed'|'refunded'>('all')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<{
		items: PaymentEntity[]
		total: number
		totalPages: number
	} | null>(null)

	const [creating, setCreating] = useState(false)
	const [createCustomer, setCreateCustomer] = useState('')
	const [createAmount, setCreateAmount] = useState('')
	const [createCurrency, setCreateCurrency] = useState<PaymentEntity['currency']>('EUR')
	const [createStatus, setCreateStatus] = useState<PaymentEntity['status']>('succeeded')

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editCustomer, setEditCustomer] = useState('')
	const [editAmount, setEditAmount] = useState('')
	const [editCurrency, setEditCurrency] = useState<PaymentEntity['currency']>('EUR')
	const [editStatus, setEditStatus] = useState<PaymentEntity['status']>('succeeded')

	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [sortBy, setSortBy] = useState<'time'|'amount'>('time')
	const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

	const liveRef = useRef<HTMLDivElement | null>(null)

	const statusOptions = useMemo(() => (
		[
			{value: 'succeeded', label: t('status.succeeded')},
			{value: 'pending', label: t('status.pending')},
			{value: 'failed', label: t('status.failed')},
			{value: 'refunded', label: t('status.refunded')},
		]
	), [t])

	const currencyOptions: {value: PaymentEntity['currency']; label: string}[] = useMemo(() => (
		[
			{value: 'EUR', label: 'EUR'},
			{value: 'USD', label: 'USD'},
			{value: 'GBP', label: 'GBP'},
		]
	), [])

	function speak (message: string) {
		if (!liveRef.current) return
		liveRef.current.textContent = message
	}

	function formatAmount (amount: number, currency: PaymentEntity['currency']) {
		try {
			return new Intl.NumberFormat(locale, {style: 'currency', currency}).format(amount)
		} catch {
			return amount.toFixed(2) + ' ' + currency
		}
	}

	function formatDateTime (iso: string) {
		try {
			return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(iso))
		} catch {
			return iso
		}
	}

	const fetchPage = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await api.payments.list({
				page,
				pageSize,
				q,
				status: statusFilter === 'all' ? undefined : statusFilter,
				dateFrom: dateFrom ? new Date(dateFrom + 'T00:00:00.000Z').toISOString() : undefined,
				dateTo: dateTo ? new Date(dateTo + 'T23:59:59.999Z').toISOString() : undefined,
				sortBy,
				sortDir,
			})
			setData({items: res.items, total: res.total, totalPages: res.totalPages})
		} catch (e) {
			setError((e as Error).message)
		} finally {
			setLoading(false)
		}
	}, [api, page, pageSize, q, statusFilter, dateFrom, dateTo, sortBy, sortDir])

	useEffect(() => {
		fetchPage()
		setSelectedIds([])
	}, [fetchPage])

	function resetCreate () {
		setCreateCustomer('')
		setCreateAmount('')
		setCreateCurrency('EUR')
		setCreateStatus('succeeded')
	}

	async function handleCreate (e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			const amount = Number(parseFloat(createAmount || '0').toFixed(2))
			await api.payments.create({
				customer: createCustomer,
				amount,
				currency: createCurrency,
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

	function startEdit (p: PaymentEntity) {
		setEditingId(p.id)
		setEditCustomer(p.customer)
		setEditAmount(String(p.amount))
		setEditCurrency(p.currency)
		setEditStatus(p.status)
	}

	function cancelEdit () {
		setEditingId(null)
	}

	async function saveEdit (id: string) {
		try {
			const amount = Number(parseFloat(editAmount || '0').toFixed(2))
			await api.payments.update(id, {
				customer: editCustomer,
				amount,
				currency: editCurrency,
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
			await api.payments.delete(id)
			speak(t('live.deleted'))
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	function mapStatus (s: PaymentEntity['status']) {
		switch (s) {
			case 'succeeded': return t('status.succeeded')
			case 'pending': return t('status.pending')
			case 'failed': return t('status.failed')
			case 'refunded': return t('status.refunded')
		}
	}

	function renderStatusBadge (s: PaymentEntity['status']) {
		const common = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium'
		if (s === 'succeeded') {
			return (
				<span className={
					common +
					' border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-200'
				}>
					<Icon name='check-circle' className='h-4 w-4' />
					{mapStatus('succeeded')}
				</span>
			)
		}
		if (s === 'pending') {
			return (
				<span className={
					common +
					' border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-200'
				}>
					<Icon name='clock' className='h-4 w-4' />
					{mapStatus('pending')}
				</span>
			)
		}
		if (s === 'failed') {
			return (
				<span className={
					common +
					' border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-200'
				}>
					<Icon name='x-circle' className='h-4 w-4' />
					{mapStatus('failed')}
				</span>
			)
		}
		return (
			<span className={
				common +
				' border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-200'
			}>
				<Icon name='arrow-uturn-left' className='h-4 w-4' />
				{mapStatus('refunded')}
			</span>
		)
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

	async function bulkDelete () {
		const ok = window.confirm(t('bulk.deleteConfirm'))
		if (!ok) return
		try {
			await api.payments.deleteBulk(selectedIds)
			speak(t('live.deleted'))
			setSelectedIds([])
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function exportCsv () {
		try {
			const res = await api.payments.list({
				page: 1,
				pageSize: 10000,
				q,
				status: statusFilter === 'all' ? undefined : statusFilter,
				dateFrom: dateFrom ? new Date(dateFrom + 'T00:00:00.000Z').toISOString() : undefined,
				dateTo: dateTo ? new Date(dateTo + 'T23:59:59.999Z').toISOString() : undefined,
				sortBy,
				sortDir,
			})
			const header = ['customer', 'amount', 'currency', 'status', 'time']
			const lines = [header.join(',')]
			for (const p of res.items) {
				const vals = [
					p.customer,
					p.amount.toFixed(2),
					p.currency,
					p.status,
					p.time,
				].map(v => {
					const s = String(v)
					return s.includes(',') || s.includes('"') || s.includes('\n')
						? '"' + s.replace(/"/g, '""') + '"'
						: s
				})
				lines.push(vals.join(','))
			}
			const blob = new Blob([lines.join('\n')], {type: 'text/csv;charset=utf-8'})
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'payments.csv'
			document.body.appendChild(a)
			a.click()
			a.remove()
			URL.revokeObjectURL(url)
		} catch (err) {
			setError((err as Error).message)
		}
	}

	return (
		<section aria-labelledby='payments-title'>
			<header className='mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='payments-title' className='text-xl font-semibold'>
						{tNav('payments')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
				<div
					role='group'
					aria-labelledby='payments-controls-title'
					className='grid w-full grid-cols-1 gap-2 md:max-w-5xl md:grid-cols-12'
				>
					<span id='payments-controls-title' className='sr-only'>
						{t('filter.label')} / {t('sort.label')}
					</span>
					<div className='md:col-span-3 min-w-0'>
						<label htmlFor='payments-search' className='sr-only'>
							{t('search')}
						</label>
						<input
							id='payments-search'
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
					<div className='md:col-span-2'>
						<label htmlFor='payments-filter' className='block text-xs text-white/70'>
							{t('filter.label')}
						</label>
						<select
							id='payments-filter'
							value={statusFilter}
							onChange={e => {
								setPage(1)
								setStatusFilter(e.target.value as typeof statusFilter)
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='all'>{t('filter.all')}</option>
							<option value='succeeded'>{t('filter.succeeded')}</option>
							<option value='pending'>{t('filter.pending')}</option>
							<option value='failed'>{t('filter.failed')}</option>
							<option value='refunded'>{t('filter.refunded')}</option>
						</select>
					</div>
					<div className='md:col-span-2'>
						<label htmlFor='payments-date-from' className='block text-xs text-white/70'>
							{t('dateFilter.from')}
						</label>
						<input
							id='payments-date-from'
							type='date'
							value={dateFrom}
							onChange={e => {
								setPage(1)
								setDateFrom(e.target.value)
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						/>
					</div>
					<div className='md:col-span-2'>
						<label htmlFor='payments-date-to' className='block text-xs text-white/70'>
							{t('dateFilter.to')}
						</label>
						<input
							id='payments-date-to'
							type='date'
							value={dateTo}
							onChange={e => {
								setPage(1)
								setDateTo(e.target.value)
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						/>
					</div>
					<div className='md:col-span-1'>
						<label htmlFor='payments-sort-by' className='block text-xs text-white/70'>
							{t('sort.by')}
						</label>
						<select
							id='payments-sort-by'
							value={sortBy}
							onChange={e => {
								setPage(1)
								setSortBy(e.target.value as 'time'|'amount')
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='amount'>{t('sort.byAmount')}</option>
							<option value='time'>{t('sort.byTime')}</option>
						</select>
					</div>
					<div className='md:col-span-1'>
						<label htmlFor='payments-sort-dir' className='block text-xs text-white/70'>
							{t('sort.dir')}
						</label>
						<select
							id='payments-sort-dir'
							value={sortDir}
							onChange={e => {
								setPage(1)
								setSortDir(e.target.value as 'asc'|'desc')
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='asc'>{t('sort.asc')}</option>
							<option value='desc'>{t('sort.desc')}</option>
						</select>
					</div>
					<div className='md:col-span-1 md:justify-self-end'>
						<button
							onClick={exportCsv}
							className='rounded-md bg-white/5 px-3 py-2 text-sm hover:bg-white/10'
							aria-label={t('exportCsv')}
						>
							{t('exportCsv')}
						</button>
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
						onClick={bulkDelete}
						className='rounded-md bg-red-600 px-2 py-1 text-sm hover:bg-red-500'
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
			<form onSubmit={handleCreate} aria-label={t('form')} className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-7'>
				<div className='md:col-span-2'>
					<label htmlFor='c-customer' className='block text-xs text-white/70'>
						{t('fields.customer')}
					</label>
					<input
						id='c-customer'
						value={createCustomer}
						onChange={e => setCreateCustomer(e.target.value)}
						required
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					/>
				</div>
				<div className='md:col-span-2'>
					<label htmlFor='c-amount' className='block text-xs text-white/70'>
						{t('fields.amount')}
					</label>
					<input
						id='c-amount'
						type='number'
						step='0.01'
						min='0'
						value={createAmount}
						onChange={e => setCreateAmount(e.target.value)}
						required
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					/>
				</div>
				<div>
					<label htmlFor='c-currency' className='block text-xs text-white/70'>
						{t('fields.currency')}
					</label>
					<select
						id='c-currency'
						value={createCurrency}
						onChange={e => setCreateCurrency(e.target.value as PaymentEntity['currency'])}
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					>
						{currencyOptions.map(o => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor='c-status' className='block text-xs text-white/70'>
						{t('fields.status')}
					</label>
					<select
						id='c-status'
						value={createStatus}
						onChange={e => setCreateStatus(e.target.value as PaymentEntity['status'])}
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
						disabled={creating || !createCustomer.trim() || !createAmount.trim()}
						className='rounded-md bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50'
					>
						{t('addPayment')}
					</button>
				</div>
			</form>

			<div className='overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10'>
				<table className='min-w-full text-sm' aria-label={tNav('payments')}>
					<thead className='text-left text-gray-700 dark:text-white/70 bg-gray-50 dark:bg-transparent'>
						<tr>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>
								<label className='sr-only' htmlFor='select-all'>{t('fields.select')}</label>
								<input
									id='select-all'
									type='checkbox'
									checked={allOnPageSelected}
									onChange={toggleSelectAllOnPage}
									aria-label={t('bulk.selectAll')}
								/>
							</th>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>{t('fields.customer')}</th>
							<th
							scope='col'
							className='pb-2 pr-4 text-xs font-medium'
							aria-sort={sortBy === 'amount' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
						>
							{t('fields.amount')}
						</th>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>{t('fields.currency')}</th>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>{t('fields.status')}</th>
							<th
							scope='col'
							className='pb-2 pr-4 text-xs font-medium'
							aria-sort={sortBy === 'time' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
						>
							{t('fields.time')}
						</th>
							<th scope='col' className='pb-2 text-xs font-medium'>{t('fields.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-200 dark:divide-white/10'>
						{loading && (
							<tr>
								<td colSpan={6} className='py-4 text-center text-gray-500 dark:text-white/70'>
									{t('loading')}
								</td>
							</tr>
						)}
						{!loading && data?.items.length === 0 && (
							<tr>
								<td colSpan={6} className='py-4 text-center text-gray-500 dark:text-white/70'>
									{t('noResults')}
								</td>
							</tr>
						)}
						{data?.items.map(p => (
							<tr key={p.id}>
								<td className='py-2 pr-4'>
									<label className='sr-only' htmlFor={`select-${p.id}`}>{t('bulk.selectRow')}</label>
									<input
										id={`select-${p.id}`}
										type='checkbox'
										checked={selectedIds.includes(p.id)}
										onChange={() => toggleSelectOne(p.id)}
										aria-label={t('bulk.selectRow')}
									/>
								</td>
								<td className='py-2 pr-4'>
									{editingId === p.id ? (
										<input
											value={editCustomer}
											onChange={ev => setEditCustomer(ev.target.value)}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span className='inline-flex items-center gap-2'>
											<Icon name='credit-card' className='h-5 w-5 text-gray-500 dark:text-white/80' />
											<span>{p.customer}</span>
										</span>
									)}
								</td>
								<td className='py-2 pr-4' data-amount={p.amount}>
									{editingId === p.id ? (
										<input
											value={editAmount}
											onChange={ev => setEditAmount(ev.target.value)}
											type='number'
											step='0.01'
											min='0'
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span>{formatAmount(p.amount, p.currency)}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === p.id ? (
										<select
											value={editCurrency}
											onChange={ev => setEditCurrency(ev.target.value as PaymentEntity['currency'])}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										>
											{currencyOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										<span>{p.currency}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === p.id ? (
										<select
											value={editStatus}
											onChange={ev => setEditStatus(ev.target.value as PaymentEntity['status'])}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										>
											{statusOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										renderStatusBadge(p.status)
									)}
								</td>
								<td className='py-2 pr-4' data-time={p.time}>
									<span>{formatDateTime(p.time)}</span>
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										{editingId === p.id ? (
											<>
												<button
													onClick={() => saveEdit(p.id)}
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
													onClick={() => startEdit(p)}
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													aria-label={t('fields.edit')}
												>
													{t('fields.edit')}
												</button>
												<button
													onClick={() => handleDelete(p.id)}
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
					<label htmlFor='payments-page-size' className='text-sm text-white/70'>
						{t('pageSize')}
					</label>
					<select
						id='payments-page-size'
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
