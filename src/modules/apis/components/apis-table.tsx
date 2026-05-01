'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {useTranslations} from 'next-intl'
import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {Icon} from '@/lib/icons'
import {type ApiEntity, type Paginated, useApi} from '@/lib/useApi'

/**
 * ApisTable
 * Tableau CRUD (lecture) des APIs externes.
 * - i18n: clés sous `pages.apis.*`
 * - A11y: libellés de champs, aria-sort, aria-live
 * - UI: Tailwind, WidgetCard, HeroIcons via `Icon`
 */
export interface ApisTableProps {
	onOpenKeys?: (api: ApiEntity) => void
}

export function ApisTable(props?: ApisTableProps) {
	const t = useTranslations('pages.apis')
	const tKeys = useTranslations('pages.apis.keys')
	const api = useApi()
	const {onOpenKeys} = props ?? {}

	const [q, setQ] = useState('')
	const [status, setStatus] = useState<'up' | 'down' | 'all'>('all')
	const [sortBy, setSortBy] = useState<'lastChecked' | 'name' | 'latencyMs'>('lastChecked')
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const emptyPage: Paginated<ApiEntity> = useMemo(
		() => ({items: [], total: 0, page: 1, pageSize: 10, totalPages: 1}),
		[],
	)
	const [data, setData] = useState<Paginated<ApiEntity>>(emptyPage)

	const fetchList = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await api.apis.list({
				page,
				pageSize,
				q: q.trim(),
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
	}, [api.apis, page, pageSize, q, status, sortBy, sortDir, emptyPage])

	useEffect(() => {
		void fetchList()
	}, [fetchList])

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setQ(e.target.value)
			setPage(1)
		},
		[],
	)

	const handleStatusChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setStatus(e.target.value as 'up' | 'down' | 'all')
			setPage(1)
		},
		[],
	)

	const handleSortByChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setSortBy(e.target.value as 'lastChecked' | 'name' | 'latencyMs')
		},
		[],
	)

	const handleSortDirChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setSortDir(e.target.value as 'asc' | 'desc')
		},
		[],
	)

	const handlePageSizeChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setPageSize(Number(e.target.value))
			setPage(1)
		},
		[],
	)

	const isSortedCol = useCallback(
		(col: 'name' | 'status' | 'latencyMs' | 'uptimePct' | 'lastChecked') =>
			col === sortBy,
		[sortBy],
	)

	// Mappe le tri interne vers les valeurs ARIA valides
	const ariaSortFor = useCallback(
		(
			col: 'name' | 'status' | 'latencyMs' | 'uptimePct' | 'lastChecked',
		): 'none' | 'ascending' | 'descending' | 'other' => {
			if (!isSortedCol(col)) return 'none'
			return sortDir === 'asc' ? 'ascending' : 'descending'
		},
		[isSortedCol, sortDir],
	)

	return (
		<WidgetCard id='apis-table' title={t('subtitle')}>
			<div className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
				<div>
					<label htmlFor='apis-q' className='block text-xs text-white/70'>
						{t('search')}
					</label>
					<input
						id='apis-q'
						value={q}
						onChange={handleSearchChange}
						placeholder={t('searchPlaceholder')}
						className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white/20'
						aria-label={t('search')}
					/>
				</div>
				<div>
					<label htmlFor='apis-status' className='block text-xs text-white/70'>
						{t('filter.label')}
					</label>
					<select
						id='apis-status'
						value={status}
						onChange={handleStatusChange}
						className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-white/20'
						aria-label={t('filter.label')}
					>
						<option value='all'>{t('filter.all')}</option>
						<option value='up'>{t('filter.up')}</option>
						<option value='down'>{t('filter.down')}</option>
					</select>
				</div>
				<div className='grid grid-cols-2 gap-3'>
					<div>
						<label htmlFor='apis-sort-by' className='block text-xs text-white/70'>
							{t('sort.by')}
						</label>
						<select
							id='apis-sort-by'
							value={sortBy}
							onChange={handleSortByChange}
							className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-white/20'
							aria-label={t('sort.by')}
						>
							<option value='lastChecked'>{t('sort.byLastChecked')}</option>
							<option value='name'>{t('sort.byName')}</option>
							<option value='latencyMs'>{t('sort.byLatency')}</option>
						</select>
					</div>
					<div>
						<label htmlFor='apis-sort-dir' className='block text-xs text-white/70'>
							{t('sort.dir')}
						</label>
						<select
							id='apis-sort-dir'
							value={sortDir}
							onChange={handleSortDirChange}
							className='mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-white/20'
							aria-label={t('sort.dir')}
						>
							<option value='asc'>{t('sort.asc')}</option>
							<option value='desc'>{t('sort.desc')}</option>
						</select>
					</div>
				</div>
			</div>

			<div className='overflow-x-auto'>
				<table className='min-w-full text-sm' aria-busy={loading}>
					<thead className='text-left text-white/70'>
						<tr>
							<th className='pb-2 pr-4' aria-sort={ariaSortFor('name')}>
								{t('fields.name')}
							</th>
							<th className='pb-2 pr-4'>{t('fields.baseUrl')}</th>
							<th className='pb-2 pr-4'>{t('fields.version')}</th>
							<th className='pb-2 pr-4' aria-sort={ariaSortFor('lastChecked')}>
								{t('fields.lastChecked')}
							</th>
							<th className='pb-2 pr-4' aria-sort={ariaSortFor('latencyMs')}>
								{t('fields.latencyMs')}
							</th>
							<th className='pb-2 pr-4'>{t('fields.uptimePct')}</th>
							<th className='pb-2 pr-4'>{t('fields.status')}</th>
							<th className='pb-2'>{t('fields.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-white/10'>
						{data.items.map(row => (
							<tr key={row.id}>
								<td className='py-2 pr-4'>{row.name}</td>
								<td className='py-2 pr-4'>
									<a
										href={row.baseUrl}
										target='_blank'
										rel='noreferrer'
										className='text-blue-400 underline underline-offset-2 hover:opacity-80'
									>
										{row.baseUrl}
									</a>
								</td>
								<td className='py-2 pr-4'>{row.version}</td>
								<td className='py-2 pr-4 whitespace-nowrap'>
									{new Date(row.lastChecked).toLocaleString()}
								</td>
								<td className='py-2 pr-4'>{row.latencyMs}</td>
								<td className='py-2 pr-4'>{row.uptimePct}</td>
								<td className='py-2 pr-4'>
									<span className='inline-flex items-center gap-1'>
										<Icon
											name={row.status === 'up' ? 'check-circle' : 'x-circle'}
											className={row.status === 'up' ? 'h-4 w-4 text-green-400' : 'h-4 w-4 text-amber-400'}
										/>
										<span>
											{row.status === 'up' ? t('status.up') : t('status.down')}
										</span>
									</span>
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										<button
											type='button'
											onClick={() => onOpenKeys?.(row)}
											className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'
											aria-label={`${tKeys('title')} · ${row.name}`}
										>
											{tKeys('title')}
										</button>
										<button
											type='button'
											className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'
											aria-label={t('fields.edit')}
											aria-disabled
										>
											{t('fields.edit')}
										</button>
										<button
											type='button'
											className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'
											aria-label={t('fields.delete')}
											aria-disabled
										>
											{t('fields.delete')}
										</button>
									</div>
								</td>
							</tr>
						))}
						{!loading && data.items.length === 0 && (
							<tr>
								<td className='py-3 text-white/70' colSpan={8}>
									{t('noResults')}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className='mt-4 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between'>
				<div role='status' aria-live='polite' className='text-xs text-white/70'>
					{loading ? t('loading') : error ? t('error') : `${data.total} ${t('page')}`}
				</div>
				<div className='flex items-center gap-3'>
					<label htmlFor='apis-page-size' className='text-xs text-white/70'>
						{t('pageSize')}
					</label>
					<select
						id='apis-page-size'
						value={pageSize}
						onChange={handlePageSizeChange}
						className='rounded-md border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-white/20'
					>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={20}>20</option>
					</select>
					<div className='flex items-center gap-2'>
						<button
							type='button'
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page <= 1 || loading}
							className='rounded-md bg-white/5 px-2 py-1 enabled:hover:bg-white/10 disabled:opacity-50'
						>
							{t('previous')}
						</button>
						<span className='text-xs text-white/70'>
							{t('page')} {page} {t('of')} {data.totalPages}
						</span>
						<button
							type='button'
							onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
							disabled={page >= data.totalPages || loading}
							className='rounded-md bg-white/5 px-2 py-1 enabled:hover:bg-white/10 disabled:opacity-50'
						>
							{t('next')}
						</button>
					</div>
				</div>
			</div>
		</WidgetCard>
	)
}
