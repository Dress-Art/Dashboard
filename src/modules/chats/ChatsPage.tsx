'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {useTranslations, useLocale} from 'next-intl'
import {useApi, type ChatThreadEntity, type ChatMessageEntity} from '@/lib/useApi'

/**
 * ChatsPage
 * Page Chats avec recherche, filtre de statut, pagination et CRUD
 * (mock via useApi.chats). Inclut annonces ARIA (live region).
 */
export function ChatsPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.chats')
	const locale = useLocale()
	const api = useApi()

	const [q, setQ] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all'|'open'|'archived'>('all')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<{
		items: ChatThreadEntity[]
		total: number
		totalPages: number
	} | null>(null)

	const [creating, setCreating] = useState(false)
	const [createTitle, setCreateTitle] = useState('')
	const [createParticipants, setCreateParticipants] = useState<number>(2)
	const [createStatus, setCreateStatus] = useState<'open'|'archived'>('open')

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editTitle, setEditTitle] = useState('')
	const [editParticipants, setEditParticipants] = useState<number>(2)
	const [editStatus, setEditStatus] = useState<'open'|'archived'>('open')

	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
	const [selectedThreadTitle, setSelectedThreadTitle] = useState('')
	const [messages, setMessages] = useState<ChatMessageEntity[] | null>(null)
	const [messagesLoading, setMessagesLoading] = useState(false)
	const [messagesError, setMessagesError] = useState<string | null>(null)
	const [messagesLimit, setMessagesLimit] = useState(10)

	const liveRef = useRef<HTMLDivElement | null>(null)

	const statusOptions = useMemo(() => (
		[
			{value: 'open', label: t('status.open')},
			{value: 'archived', label: t('status.archived')},
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
			const res = await api.chats.list({
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
		setCreateParticipants(2)
		setCreateStatus('open')
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			await api.chats.create({
				title: createTitle,
				participants: createParticipants,
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

	function startEdit(c: ChatThreadEntity) {
		setEditingId(c.id)
		setEditTitle(c.title)
		setEditParticipants(c.participants)
		setEditStatus(c.status)
	}

	function cancelEdit() {
		setEditingId(null)
	}

	async function saveEdit(id: string) {
		try {
			await api.chats.update(id, {
				title: editTitle,
				participants: editParticipants,
				status: editStatus,
			})
			speak(t('live.updated'))
			setEditingId(null)
			if (selectedThreadId === id) {
				setSelectedThreadTitle(editTitle)
			}
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleDelete(id: string) {
		const ok = window.confirm(t('deleteConfirm'))
		if (!ok) return
		try {
			await api.chats.delete(id)
			if (selectedThreadId === id) {
				setSelectedThreadId(null)
				setMessages(null)
			}
			speak(t('live.deleted'))
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	function mapStatus(s: ChatThreadEntity['status']) {
		return s === 'open' ? t('status.open') : t('status.archived')
	}

	/**
	 * Formate une date ISO en date/heure locale selon la locale active.
	 */
	function formatDateTime(iso: string) {
		try {
			return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(iso))
		} catch {
			return iso
		}
	}

	function selectThread(c: ChatThreadEntity) {
		setSelectedThreadId(c.id)
		setSelectedThreadTitle(c.title)
	}

	useEffect(() => {
		if (!selectedThreadId) {
			setMessages(null)
			return
		}
		let cancelled = false
		async function run(threadId: string) {
			setMessagesLoading(true)
			setMessagesError(null)
			try {
				const res = await api.chats.listMessages(threadId, messagesLimit)
				if (cancelled) return
				setMessages(res)
				speak(t('live.messagesLoaded', {count: res.length}))
			} catch (e) {
				if (cancelled) return
				setMessagesError((e as Error).message)
			} finally {
				if (cancelled) return
				setMessagesLoading(false)
			}
		}
		run(selectedThreadId)
		return () => { cancelled = true }
	}, [api, selectedThreadId, messagesLimit, t])

	return (
		<section aria-labelledby='chats-title'>
			<header className='mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='chats-title' className='text-xl font-semibold'>
						{tNav('chats')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
				<div className='flex w-full flex-col gap-2 md:max-w-xl md:flex-row'>
					<div className='flex-1'>
						<label htmlFor='chats-search' className='sr-only'>
							{t('search')}
						</label>
						<input
							id='chats-search'
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
						<label htmlFor='chats-filter' className='block text-xs text-white/70'>
							{t('filter.label')}
						</label>
						<select
							id='chats-filter'
							value={statusFilter}
							onChange={e => {
								setPage(1)
								setStatusFilter(e.target.value as 'all'|'open'|'archived')
							}}
							className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='all'>{t('filter.all')}</option>
							<option value='open'>{t('filter.open')}</option>
							<option value='archived'>{t('filter.archived')}</option>
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
			<form onSubmit={handleCreate} aria-label={t('form')} className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-6'>
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
					<label htmlFor='c-participants' className='block text-xs text-white/70'>
						{t('fields.participants')}
					</label>
					<input
						id='c-participants'
						type='number'
						min={1}
						step={1}
						value={createParticipants}
						onChange={e => setCreateParticipants(Math.max(1, Number(e.target.value)))}
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
						onChange={e => setCreateStatus(e.target.value as 'open'|'archived')}
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
						{t('addThread')}
					</button>
				</div>
			</form>

			<div className='overflow-x-auto rounded-lg border border-white/10'>
				<table className='min-w-full text-sm' aria-label={tNav('chats')}>
					<thead className='text-left text-white/70'>
						<tr>
							<th scope='col' className='pb-2 pr-4'>{t('fields.title')}</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.participants')}</th>
							<th scope='col' className='pb-2 pr-4'>{t('fields.status')}</th>
							<th scope='col' className='pb-2'>{t('fields.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-white/10'>
						{loading && (
							<tr>
								<td colSpan={4} className='py-4 text-center text-white/70'>
									{t('loading')}
								</td>
							</tr>
						)}
						{!loading && data?.items.length === 0 && (
							<tr>
								<td colSpan={4} className='py-4 text-center text-white/70'>
									{t('noResults')}
								</td>
							</tr>
						)}
						{data?.items.map(c => (
							<tr key={c.id}>
								<td className='py-2 pr-4'>
									{editingId === c.id ? (
										<input
											value={editTitle}
											onChange={e => setEditTitle(e.target.value)}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span>{c.title}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === c.id ? (
										<input
											type='number'
											min={1}
											step={1}
											value={editParticipants}
											onChange={e => setEditParticipants(Math.max(1, Number(e.target.value)))}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										/>
									) : (
										<span>{c.participants}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === c.id ? (
										<select
											value={editStatus}
											onChange={e => setEditStatus(e.target.value as ChatThreadEntity['status'])}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
										>
											{statusOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										<span className={c.status === 'open' ? 'text-green-400' : 'text-white/80'}>
											{mapStatus(c.status)}
										</span>
									)}
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										{editingId === c.id ? (
											<>
												<button
													onClick={() => saveEdit(c.id)}
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
										onClick={() => selectThread(c)}
										className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
										aria-label={t('viewMessages')}
									>
										{t('viewMessages')}
									</button>
									<button
										onClick={() => startEdit(c)}
										className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
										aria-label={t('fields.edit')}
									>
										{t('fields.edit')}
									</button>
												<button
													onClick={() => handleDelete(c.id)}
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
				<div className='flex items-center justify-between border-t border-white/10 px-3 py-2'>
					<div className='flex items-center gap-2'>
						<button
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={loading || page <= 1}
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
			</div>

			{/* Messages panel */}
			<div
				role='region'
				aria-labelledby='chat-messages-title'
				aria-busy={messagesLoading ? 'true' : 'false'}
				className='mt-4 rounded-lg border border-white/10 p-4'
			>
				<div className='mb-3 flex items-center justify-between'>
					<h2 id='chat-messages-title' className='text-lg font-medium'>
						{selectedThreadId ? t('messages.panelTitle', {title: selectedThreadTitle}) : t('messages.title')}
					</h2>
					<div className='flex items-center gap-2'>
						<label htmlFor='messages-limit' className='text-sm text-white/70'>
							{t('messages.limit')}
						</label>
						<select
							id='messages-limit'
							value={messagesLimit}
							onChange={e => setMessagesLimit(Number(e.target.value))}
							className='rounded-md border border-white/10 bg-white/5 p-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value={10}>10</option>
							<option value={20}>20</option>
							<option value={50}>50</option>
						</select>
					</div>
				</div>

				{!selectedThreadId && (
					<p className='text-sm text-white/70'>
						{t('messages.selectThreadHint')}
					</p>
				)}

				{selectedThreadId && (
					<>
						{messagesError && (
							<div
								role='alert'
								aria-live='assertive'
								className='mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200'
							>
								<span className='font-medium'>{t('error')}</span>: {messagesError}
							</div>
						)}
						{messagesLoading && (
							<p className='text-sm text-white/70'>{t('messages.loading')}</p>
						)}
						{!messagesLoading && (messages?.length ?? 0) === 0 && (
							<p className='text-sm text-white/70'>{t('messages.empty')}</p>
						)}
						<ul className='space-y-3'>
							{messages?.map(m => (
								<li key={m.id} className='rounded-md bg-white/5 p-3'>
									<div className='mb-1 flex items-center justify-between'>
										<p className='text-sm font-medium'>
											{m.author}
										</p>
										<time dateTime={m.time} className='text-xs text-white/60'>
											{formatDateTime(m.time)}
										</time>
									</div>
									<p className='text-sm text-white/90'>{m.content}</p>
								</li>
							))}
						</ul>
					</>
				)}
			</div>

			</section>
		)
	}
