'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {useTranslations, useLocale} from 'next-intl'
import {useApi, type SubscriptionEntity} from '@/lib/useApi'

/**
 * SubscriptionsPage
 * Page Abonnements: recherche, filtre statut, tri (début/prix), pagination.
 * Étape 1: listing et navigation. Étapes suivantes: CRUD + export CSV.
 * A11y: aria-live pour messages, labels explicites.
 */
export function SubscriptionsPage () {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.subscriptions')
	const locale = useLocale()
	const api = useApi()

	const [q, setQ] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all'|'active'|'canceled'>('all')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [sortBy, setSortBy] = useState<'start'|'price'>('start')
	const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<{
		items: SubscriptionEntity[]
		total: number
		totalPages: number
	} | null>(null)

	const liveRef = useRef<HTMLDivElement | null>(null)

	function formatAmount (amount: number, currency: SubscriptionEntity['currency']) {
		try {
			return new Intl.NumberFormat(locale, {style: 'currency', currency}).format(amount)
		} catch {
			return amount.toFixed(2) + ' ' + currency
		}
	}

	function formatDate (iso: string) {
		try {
			return new Intl.DateTimeFormat(locale, {dateStyle: 'medium'}).format(new Date(iso))
		} catch {
			return iso
		}
	}

	const fetchPage = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await api.subscriptions.list({
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
	}, [fetchPage])

	return (
		<section aria-labelledby='subscriptions-title'>
			<header className='mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='subscriptions-title' className='text-xl font-semibold'>
						{tNav('subscriptions')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
				<div
					role='group'
					aria-labelledby='subscriptions-controls-title'
					className='grid w-full grid-cols-1 gap-2 md:max-w-5xl md:grid-cols-12'
				>
					<span id='subscriptions-controls-title' className='sr-only'>
						{t('filter.label')} / {t('sort.label')}
					</span>
					<div className='md:col-span-3 min-w-0'>
						<label htmlFor='subscriptions-search' className='sr-only'>
							{t('search')}
						</label>
						<input
							id='subscriptions-search'
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
						<label htmlFor='subscriptions-filter' className='block text-xs text-white/70'>
							{t('filter.label')}
						</label>
						<select
							id='subscriptions-filter'
							value={statusFilter}
							onChange={e => {
								setPage(1)
								setStatusFilter(e.target.value as typeof statusFilter)
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='all'>{t('filter.all')}</option>
							<option value='active'>{t('filter.active')}</option>
							<option value='canceled'>{t('filter.canceled')}</option>
						</select>
					</div>
					<div className='md:col-span-2'>
						<label htmlFor='subscriptions-date-from' className='block text-xs text-white/70'>
							{t('dateFilter.from')}
						</label>
						<input
							id='subscriptions-date-from'
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
						<label htmlFor='subscriptions-date-to' className='block text-xs text-white/70'>
							{t('dateFilter.to')}
						</label>
						<input
							id='subscriptions-date-to'
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
						<label htmlFor='subscriptions-sort-by' className='block text-xs text-white/70'>
							{t('sort.by')}
						</label>
						<select
							id='subscriptions-sort-by'
							value={sortBy}
							onChange={e => {
								setPage(1)
								setSortBy(e.target.value as 'start'|'price')
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='price'>{t('sort.byPrice')}</option>
							<option value='start'>{t('sort.byStart')}</option>
						</select>
					</div>
					<div className='md:col-span-1'>
						<label htmlFor='subscriptions-sort-dir' className='block text-xs text-white/70'>
							{t('sort.dir')}
						</label>
						<select
							id='subscriptions-sort-dir'
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

			<div className='overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10'>
				<table className='min-w-full text-sm' aria-label={tNav('subscriptions')}>
					<thead className='text-left text-gray-700 dark:text-white/70 bg-gray-50 dark:bg-transparent'>
						<tr>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>
								{t('fields.customer')}
							</th>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>
								{t('fields.plan')}
							</th>
							<th
								scope='col'
								className='pb-2 pr-4 text-xs font-medium'
								aria-sort={sortBy === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
							>
								{t('fields.price')}
							</th>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>
								{t('fields.currency')}
							</th>
							<th scope='col' className='pb-2 pr-4 text-xs font-medium'>
								{t('fields.status')}
							</th>
							<th
								scope='col'
								className='pb-2 pr-4 text-xs font-medium'
								aria-sort={sortBy === 'start' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
							>
								{t('fields.start')}
							</th>
							<th scope='col' className='pb-2 text-xs font-medium'>
								{t('fields.end')}
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-200 dark:divide-white/10'>
						{loading && (
							<tr>
								<td colSpan={7} className='py-4 text-center text-gray-500 dark:text-white/70'>
									{t('loading')}
								</td>
							</tr>
						)}
						{!loading && data?.items.length === 0 && (
							<tr>
								<td colSpan={7} className='py-4 text-center text-gray-500 dark:text-white/70'>
									{t('noResults')}
								</td>
							</tr>
						)}
						{data?.items.map(s => (
							<tr key={s.id}>
								<td className='py-2 pr-4'>
									<span>{s.customer}</span>
								</td>
								<td className='py-2 pr-4'>
									<span>{s.plan}</span>
								</td>
								<td className='py-2 pr-4' data-price={s.price}>
									<span>{formatAmount(s.price, s.currency)}</span>
								</td>
								<td className='py-2 pr-4'>
									<span>{s.currency}</span>
								</td>
								<td className='py-2 pr-4'>
									<span>{s.status === 'active' ? t('status.active') : t('status.canceled')}</span>
								</td>
								<td className='py-2 pr-4' data-start={s.start}>
									<span>{formatDate(s.start)}</span>
								</td>
								<td className='py-2' data-end={s.end ?? ''}>
									<span>{s.end ? formatDate(s.end) : '-'}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

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
					<label htmlFor='subscriptions-page-size' className='text-sm text-white/70'>
						{t('pageSize')}
					</label>
					<select
						id='subscriptions-page-size'
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
