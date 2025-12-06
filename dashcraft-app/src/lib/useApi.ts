'use client'

import {faker} from '@faker-js/faker'
import {useRef} from 'react'

export interface Paginated<T> {
	items: T[]
	total: number
	page: number
	pageSize: number
	totalPages: number
}

export interface UserEntity {
	id: string
	name: string
	role: 'Admin' | 'Editor' | 'Viewer'
	status: 'active' | 'inactive'
	createdAt?: string
}

export interface NotificationEntity {
	id: string
	title: string
	time: string
	status: 'unread' | 'read'
}

export interface EmailEntity {
	id: string
	subject: string
	from: string
	time: string
	status: 'unread' | 'read'
}

export interface PaymentEntity {
	id: string
	customer: string
	amount: number
	currency: 'USD' | 'EUR' | 'GBP'
	status: 'succeeded' | 'pending' | 'failed' | 'refunded'
	time: string
}

export interface SubscriptionEntity {
	id: string
	customer: string
	plan: 'Basic' | 'Pro' | 'Enterprise'
	price: number
	currency: 'USD' | 'EUR' | 'GBP'
	status: 'active' | 'canceled'
	start: string
	end?: string
}

export interface FeedbackEntity {
	id: string
	author: string
	rating: number
	comment: string
	status: 'new' | 'in_progress' | 'resolved'
	time: string
}

export interface EventEntity {
	id: string
	title: string
	time: string
}

export interface ChatThreadEntity {
	id: string
	title: string
	participants: number
	status: 'open' | 'archived'
	time: string
}

export interface ChatMessageEntity {
	id: string
	threadId: string
	author: string
	content: string
	time: string
}

export interface MonitoringMetrics {
	cpu: number
	memoryMb: number
	updatedAt: string
}

export interface InternalApiMetrics {
	successRatePct: number
	errorRatePct: number
	avgResponseMs: number
	requestsLast24h: number
	updatedAt: string
}

export interface InternalApiLog {
	id: string
	time: string
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	route: string
	status: number
	durationMs: number
	user: string
}

export interface AnalyticsDailyEntity {
	date: string
	visitors: number
}

export interface AnalyticsMetrics {
	days: AnalyticsDailyEntity[]
	totalVisitors: number
	avgPerDay: number
	updatedAt: string
}

export type SourceChannel =
	| 'direct'
	| 'organic'
	| 'social'
	| 'referral'
	| 'email'
	| 'paid'

export interface AnalyticsSourceItem {
	channel: SourceChannel
	visitors: number
	percent: number
}

export interface AnalyticsSourcesMetrics {
	items: AnalyticsSourceItem[]
	total: number
	updatedAt: string
}

export interface AnalyticsKpisMetrics {
	signups: number
	conversionRatePct: number
	bounceRatePct: number
	avgSessionMin: number
	updatedAt: string
}

export interface ApiEntity {
	id: string
	name: string
	baseUrl: string
	version: string
	status: 'up' | 'down'
	latencyMs: number
	uptimePct: number
	lastChecked: string
	enabled: boolean
	tags: string[]
}

export interface ApiKeyEntity {
	id: string
	apiId: string
	label: string
	key: string
	status: 'active' | 'revoked'
	scopes: string[]
	createdAt: string
	lastUsedAt?: string
}

/**
 * useApi
 * Hook centralisant les opérations mockées (localStorage) par module.
 * Respecte la règle: tous les appels API passent par un hook central.
 */
export function useApi() {
	function getStoreKey(key: string) {
		return `dc_${key}`
	}

	async function listChatMessages(
		threadId: string,
		limit = 10,
	): Promise<ChatMessageEntity[]> {
		seedChatMessagesIfEmpty()
		const all = readFromStorage<ChatMessageEntity[]>('chat_messages') ?? []
		const filtered = all.filter(m => m.threadId === threadId)
		const sorted = [...filtered].sort((a, b) => b.time.localeCompare(a.time))
		return sorted.slice(0, limit)
	}

	function readFromStorage<T>(key: string): T | null {
		try {
			const raw = localStorage.getItem(getStoreKey(key))
			return raw ? (JSON.parse(raw) as T) : null
		} catch {
			return null
		}
	}

	function writeToStorage<T>(key: string, value: T) {
		localStorage.setItem(getStoreKey(key), JSON.stringify(value))
	}

	// ---------- Analytics Sources (Breakdown) ----------
	function seedAnalyticsSourcesIfEmpty() {
		// S'appuie sur analytics_daily pour une répartition par canaux
		seedAnalyticsIfEmpty()
		const existing = readFromStorage<Array<{date: string; channels: Record<SourceChannel, number>}>>('analytics_sources_daily')
		if (existing && existing.length > 0) return
		const all = readFromStorage<AnalyticsDailyEntity[]>('analytics_daily') ?? []
		const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date))
		const channels: SourceChannel[] = [
			'direct',
			'organic',
			'social',
			'referral',
			'email',
			'paid',
		]
		type Daily = {date: string; channels: Record<SourceChannel, number>}
		const seeded: Daily[] = sorted.map(d => {
			// Générer des poids aléatoires et répartir le total des visiteurs
			const weights = channels.map(() => faker.number.int({min: 1, max: 10}))
			const sumWeights = weights.reduce((a, b) => a + b, 0)
			let remaining = d.visitors
			const values = weights.map((w, idx) => {
				// Dernier canal prend le reste pour éviter l'écart d'arrondi
				if (idx === channels.length - 1) return Math.max(0, remaining)
				const v = Math.floor((d.visitors * w) / sumWeights)
				remaining -= v
				return Math.max(0, v)
			})
			const byChannel: Record<SourceChannel, number> = channels.reduce(
				(acc, ch, idx) => {
					acc[ch] = values[idx]
					return acc
				},
				{} as Record<SourceChannel, number>,
			)
			return {date: d.date, channels: byChannel}
		})
		writeToStorage('analytics_sources_daily', seeded)
	}

	async function getAnalyticsSourcesBreakdown(
		count = 7,
	): Promise<AnalyticsSourcesMetrics> {
		seedAnalyticsSourcesIfEmpty()
		const daily = readFromStorage<Array<{date: string; channels: Record<SourceChannel, number>}>>(
			'analytics_sources_daily',
		) ?? []
		const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
		const last = sorted.slice(Math.max(0, sorted.length - count))
		const totals: Record<SourceChannel, number> = {
			direct: 0,
			organic: 0,
			social: 0,
			referral: 0,
			email: 0,
			paid: 0,
		}
		for (const d of last) {
			for (const ch in totals) {
				const key = ch as SourceChannel
				totals[key] += d.channels[key] ?? 0
			}
		}
		const total = Object.values(totals).reduce((a, b) => a + b, 0)
		const items: AnalyticsSourceItem[] = (Object.keys(totals) as SourceChannel[])
			.map(ch => ({
				channel: ch,
				visitors: totals[ch],
				percent: total > 0 ? Math.round((totals[ch] / total) * 100) : 0,
			}))
			.sort((a, b) => b.visitors - a.visitors)
		return {
			items,
			total,
			updatedAt: new Date().toISOString(),
		}
	}

	async function refreshAnalyticsSourcesBreakdown(
		count = 7,
	): Promise<AnalyticsSourcesMetrics> {
		seedAnalyticsSourcesIfEmpty()
		const daily = readFromStorage<Array<{date: string; channels: Record<SourceChannel, number>}>>(
			'analytics_sources_daily',
		) ?? []
		const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
		const last = sorted[sorted.length - 1]
		const today = new Date()
		const isSameDay = last
			? new Date(last.date).toDateString() === today.toDateString()
			: false
		const channels: SourceChannel[] = [
			'direct',
			'organic',
			'social',
			'referral',
			'email',
			'paid',
		]
		if (!isSameDay) {
			// Nouvelle journée: repartir aléatoirement autour d'un volume plausible
			const weights = channels.map(() => faker.number.int({min: 1, max: 10}))
			const sumWeights = weights.reduce((a, b) => a + b, 0)
			const totalVisitors = faker.number.int({min: 80, max: 320})
			let remaining = totalVisitors
			const values = weights.map((w, idx) => {
				if (idx === channels.length - 1) return Math.max(0, remaining)
				const v = Math.floor((totalVisitors * w) / sumWeights)
				remaining -= v
				return Math.max(0, v)
			})
			const byChannel: Record<SourceChannel, number> = channels.reduce(
				(acc, ch, idx) => {
					acc[ch] = values[idx]
					return acc
				},
				{} as Record<SourceChannel, number>,
			)
			sorted.push({date: today.toISOString(), channels: byChannel})
		} else {
			// Mettre à jour légèrement les valeurs du jour
			const updated = {...last}
			for (const ch of channels) {
				const delta = faker.number.int({min: -10, max: 15})
				updated.channels[ch] = Math.max(0, (updated.channels[ch] ?? 0) + delta)
			}
			sorted[sorted.length - 1] = updated
		}
		writeToStorage('analytics_sources_daily', sorted)
		return getAnalyticsSourcesBreakdown(count)
	}

	// ---------- Analytics KPIs ----------
	function seedAnalyticsKpisIfEmpty() {
		const existing = readFromStorage<AnalyticsKpisMetrics>('analytics_kpis')
		if (existing) return
		faker.seed(42)
		const seeded: AnalyticsKpisMetrics = {
			signups: faker.number.int({min: 20, max: 400}),
			conversionRatePct: faker.number.int({min: 1, max: 12}),
			bounceRatePct: faker.number.int({min: 20, max: 70}),
			avgSessionMin: faker.number.int({min: 1, max: 8}),
			updatedAt: new Date().toISOString(),
		}
		writeToStorage('analytics_kpis', seeded)
	}

	async function getAnalyticsKpis(): Promise<AnalyticsKpisMetrics> {
		seedAnalyticsKpisIfEmpty()
		const kpis = readFromStorage<AnalyticsKpisMetrics>('analytics_kpis')!
		return {...kpis, updatedAt: new Date().toISOString()}
	}

	async function refreshAnalyticsKpis(): Promise<AnalyticsKpisMetrics> {
		seedAnalyticsKpisIfEmpty()
		const cur = readFromStorage<AnalyticsKpisMetrics>('analytics_kpis')!
		const deltaSignups = faker.number.int({min: -15, max: 30})
		const next: AnalyticsKpisMetrics = {
			signups: Math.max(0, cur.signups + deltaSignups),
			conversionRatePct: Math.min(
				100,
				Math.max(0, cur.conversionRatePct + faker.number.int({min: -2, max: 2})),
			),
			bounceRatePct: Math.min(
				100,
				Math.max(0, cur.bounceRatePct + faker.number.int({min: -3, max: 3})),
			),
			avgSessionMin: Math.max(0, cur.avgSessionMin + faker.number.int({min: -1, max: 2})),
			updatedAt: new Date().toISOString(),
		}
		writeToStorage('analytics_kpis', next)
		return next
	}

	// ---------- Users ----------
	function seedUsersIfEmpty() {
		const existing = readFromStorage<UserEntity[]>('users')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: UserEntity[] = Array.from({length: 36}).map(() => ({
			id: faker.string.uuid(),
			name: faker.person.fullName(),
			role: faker.helpers.arrayElement(['Admin', 'Editor', 'Viewer']),
			status: faker.datatype.boolean() ? 'active' : 'inactive',
			createdAt: faker.date.recent({days: 365}).toISOString(),
		}))
		// Tri récent -> ancien par date de création
		initial.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
		writeToStorage('users', initial)
	}

	async function listUsers(params?: {
		page?: number
		pageSize?: number
		q?: string
	}): Promise<Paginated<UserEntity>> {
		seedUsersIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const all = readFromStorage<UserEntity[]>('users') ?? []
		const filtered = q
			? all.filter(u =>
				u.name.toLowerCase().includes(q) ||
				u.role.toLowerCase().includes(q) ||
				u.status.toLowerCase().includes(q),
			)
			: all
		const total = filtered.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		// Tri explicite: le plus récent d'abord si createdAt présent
		const sorted = [...filtered].sort((a, b) => {
			const at = a.createdAt
			const bt = b.createdAt
			if (at && bt) return bt.localeCompare(at)
			if (at && !bt) return -1
			if (!at && bt) return 1
			return 0
		})
		const items = sorted.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	/**
	 * Crée un utilisateur.
	 * - `name` est nettoyé via trim() et requis (erreur si vide)
	 * - `role` et `status` sont optionnels (défaut: 'Viewer' / 'active')
	 */
	async function createUser(
		payload: { name: string, role?: UserEntity['role'], status?: UserEntity['status'] },
	): Promise<UserEntity> {
		const all = readFromStorage<UserEntity[]>('users') ?? []
		const name = payload.name.trim()
		if (name.length === 0) throw new Error('Name is required')
		const entity: UserEntity = {
			id: faker.string.uuid(),
			name,
			role: payload.role ?? 'Viewer',
			status: payload.status ?? 'active',
			createdAt: new Date().toISOString(),
		}
		const next = [entity, ...all]
		// Tri récent -> ancien par date de création (rétrocompatible si anciens items sans createdAt)
		next.sort((a, b) => {
			const at = a.createdAt
			const bt = b.createdAt
			if (at && bt) return bt.localeCompare(at)
			if (at && !bt) return -1
			if (!at && bt) return 1
			return 0
		})
		writeToStorage('users', next)
		return entity
	}

	async function updateUser(
		id: string,
		changes: Partial<Omit<UserEntity, 'id'>>,
	): Promise<UserEntity> {
		const all = readFromStorage<UserEntity[]>('users') ?? []
		const idx = all.findIndex(u => u.id === id)
		if (idx === -1) throw new Error('User not found')
		const updated = {...all[idx], ...changes}
		const next = [...all]
		next[idx] = updated
		writeToStorage('users', next)
		return updated
	}

	async function deleteUser(id: string): Promise<void> {
		const all = readFromStorage<UserEntity[]>('users') ?? []
		const next = all.filter(u => u.id !== id)
		writeToStorage('users', next)
	}

	// ---------- Notifications ----------
	function seedNotificationsIfEmpty() {
		const existing = readFromStorage<NotificationEntity[]>('notifications')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: NotificationEntity[] = Array.from({length: 24}).map(() => ({
			id: faker.string.uuid(),
			title: faker.lorem.sentence({min: 3, max: 8}),
			time: faker.date.recent({days: 7}).toISOString(),
			status: faker.datatype.boolean() ? 'unread' : 'read',
		}))
		// Tri récent -> ancien
		initial.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('notifications', initial)
	}

	async function listNotifications(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: NotificationEntity['status']
	}): Promise<Paginated<NotificationEntity>> {
		seedNotificationsIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status
		const all = readFromStorage<NotificationEntity[]>('notifications') ?? []
		const filteredByQ = q
			? all.filter(n =>
				n.title.toLowerCase().includes(q) ||
				n.status.toLowerCase().includes(q),
			)
			: all
		const filtered = status
			? filteredByQ.filter(n => n.status === status)
			: filteredByQ
		const total = filtered.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = filtered.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createNotification(payload: {
		title: string
		status?: NotificationEntity['status']
	}): Promise<NotificationEntity> {
		const all = readFromStorage<NotificationEntity[]>('notifications') ?? []
		const entity: NotificationEntity = {
			id: faker.string.uuid(),
			title: payload.title,
			time: new Date().toISOString(),
			status: payload.status ?? 'unread',
		}
		const next = [entity, ...all]
		// Tri récent -> ancien
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('notifications', next)
		return entity
	}

	async function updateNotification(
		id: string,
		changes: Partial<Pick<NotificationEntity, 'title' | 'status'>>,
	): Promise<NotificationEntity> {
		const all = readFromStorage<NotificationEntity[]>('notifications') ?? []
		const idx = all.findIndex(n => n.id === id)
		if (idx === -1) throw new Error('Notification not found')
		const updated = {...all[idx], ...changes}
		const next = [...all]
		next[idx] = updated
		writeToStorage('notifications', next)
		return updated
	}

	async function deleteNotification(id: string): Promise<void> {
		const all = readFromStorage<NotificationEntity[]>('notifications') ?? []
		const next = all.filter(n => n.id !== id)
		writeToStorage('notifications', next)
	}

	// ---------- Emails ----------
	function seedEmailsIfEmpty() {
		const existing = readFromStorage<EmailEntity[]>('emails')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: EmailEntity[] = Array.from({length: 48}).map(() => ({
			id: faker.string.uuid(),
			subject: faker.lorem.sentence({min: 3, max: 8}),
			from: faker.internet.email(),
			time: faker.date.recent({days: 30}).toISOString(),
			status: faker.datatype.boolean() ? 'unread' : 'read',
		}))
		// Tri récent -> ancien
		initial.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('emails', initial)
	}

	async function listEmails(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: EmailEntity['status']
		dateFrom?: string
		dateTo?: string
	}): Promise<Paginated<EmailEntity>> {
		seedEmailsIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status
		const dateFrom = params?.dateFrom
		const dateTo = params?.dateTo
		const all = readFromStorage<EmailEntity[]>('emails') ?? []
		const filteredByQ = q
			? all.filter(e =>
				e.subject.toLowerCase().includes(q) ||
				e.from.toLowerCase().includes(q) ||
				e.status.toLowerCase().includes(q),
			)
			: all
		const filteredByStatus = status ? filteredByQ.filter(e => e.status === status) : filteredByQ
		const filtered = filteredByStatus.filter(e => {
			if (dateFrom && e.time < dateFrom) return false
			if (dateTo && e.time > dateTo) return false
			return true
		})
		const total = filtered.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = filtered.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createEmail(payload: {
		subject: string
		from: string
		status?: EmailEntity['status']
	}): Promise<EmailEntity> {
		const all = readFromStorage<EmailEntity[]>('emails') ?? []
		const entity: EmailEntity = {
			id: faker.string.uuid(),
			subject: payload.subject,
			from: payload.from,
			time: new Date().toISOString(),
			status: payload.status ?? 'unread',
		}
		const next = [entity, ...all]
		// Tri récent -> ancien
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('emails', next)
		return entity
	}

	async function updateEmail(
		id: string,
		changes: Partial<Pick<EmailEntity, 'subject' | 'from' | 'status'>>,
	): Promise<EmailEntity> {
		const all = readFromStorage<EmailEntity[]>('emails') ?? []
		const idx = all.findIndex(e => e.id === id)
		if (idx === -1) throw new Error('Email not found')
		const updated = {...all[idx], ...changes}
		const next = [...all]
		next[idx] = updated
		writeToStorage('emails', next)
		return updated
	}

	async function deleteEmail(id: string): Promise<void> {
		const all = readFromStorage<EmailEntity[]>('emails') ?? []
		const next = all.filter(e => e.id !== id)
		writeToStorage('emails', next)
	}

	async function updateEmailsBulk(
		ids: string[],
		changes: Partial<Pick<EmailEntity, 'subject' | 'from' | 'status'>>,
	): Promise<void> {
		if (ids.length === 0) return
		const all = readFromStorage<EmailEntity[]>('emails') ?? []
		const idSet = new Set(ids)
		const next = all.map(e => (idSet.has(e.id) ? {...e, ...changes} : e))
		// Tri récent -> ancien conservé
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('emails', next)
	}

	async function deleteEmailsBulk(ids: string[]): Promise<void> {
		if (ids.length === 0) return
		const all = readFromStorage<EmailEntity[]>('emails') ?? []
		const idSet = new Set(ids)
		const next = all.filter(e => !idSet.has(e.id))
		writeToStorage('emails', next)
	}

	// ---------- Feedbacks ----------
	function seedFeedbacksIfEmpty() {
		const existing = readFromStorage<FeedbackEntity[]>('feedbacks')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: FeedbackEntity[] = Array.from({length: 40}).map(() => ({
			id: faker.string.uuid(),
			author: faker.person.fullName(),
			rating: faker.number.int({min: 1, max: 5}),
			comment: faker.lorem.sentence({min: 6, max: 12}),
			status: faker.helpers.arrayElement(['new', 'in_progress', 'resolved']),
			time: faker.date.recent({days: 45}).toISOString(),
		}))
		// Tri récent -> ancien
		initial.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('feedbacks', initial)
	}

	async function listFeedbacks(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: FeedbackEntity['status']
		dateFrom?: string
		dateTo?: string
	}): Promise<Paginated<FeedbackEntity>> {
		seedFeedbacksIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status
		const dateFrom = params?.dateFrom
		const dateTo = params?.dateTo
		const all = readFromStorage<FeedbackEntity[]>('feedbacks') ?? []
		const filteredByQ = q
			? all.filter(f =>
				f.author.toLowerCase().includes(q) ||
				f.comment.toLowerCase().includes(q) ||
				f.status.toLowerCase().includes(q) ||
				String(f.rating).toLowerCase().includes(q),
			)
			: all
		const filteredByStatus = status
			? filteredByQ.filter(f => f.status === status)
			: filteredByQ
		const filtered = filteredByStatus.filter(f => {
			if (dateFrom && f.time < dateFrom) return false
			if (dateTo && f.time > dateTo) return false
			return true
		})
		const total = filtered.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = filtered.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createFeedback(payload: {
		author: string
		comment: string
		rating: number
		status?: FeedbackEntity['status']
	}): Promise<FeedbackEntity> {
		const all = readFromStorage<FeedbackEntity[]>('feedbacks') ?? []
		const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)))
		const entity: FeedbackEntity = {
			id: faker.string.uuid(),
			author: payload.author,
			comment: payload.comment,
			rating: clamp(payload.rating),
			status: payload.status ?? 'new',
			time: new Date().toISOString(),
		}
		const next = [entity, ...all]
		// Tri récent -> ancien
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('feedbacks', next)
		return entity
	}

	async function updateFeedback(
		id: string,
		changes: Partial<Pick<FeedbackEntity, 'author' | 'comment' | 'rating' | 'status'>>,
	): Promise<FeedbackEntity> {
		const all = readFromStorage<FeedbackEntity[]>('feedbacks') ?? []
		const idx = all.findIndex(f => f.id === id)
		if (idx === -1) throw new Error('Feedback not found')
		const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)))
		const updated = {
			...all[idx],
			...changes,
			rating: changes.rating !== undefined ? clamp(changes.rating) : all[idx].rating,
		}
		const next = [...all]
		next[idx] = updated
		writeToStorage('feedbacks', next)
		return updated
	}

	async function deleteFeedback(id: string): Promise<void> {
		const all = readFromStorage<FeedbackEntity[]>('feedbacks') ?? []
		const next = all.filter(f => f.id !== id)
		writeToStorage('feedbacks', next)
	}

	async function updateFeedbacksBulk(
		ids: string[],
		changes: Partial<Pick<FeedbackEntity, 'status'>>,
	): Promise<void> {
		if (ids.length === 0) return
		const all = readFromStorage<FeedbackEntity[]>('feedbacks') ?? []
		const idSet = new Set(ids)
		const next = all.map(f => (idSet.has(f.id) ? {...f, ...changes} : f))
		// Tri récent -> ancien conservé
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('feedbacks', next)
	}

	async function deleteFeedbacksBulk(ids: string[]): Promise<void> {
		if (ids.length === 0) return
		const all = readFromStorage<FeedbackEntity[]>('feedbacks') ?? []
		const idSet = new Set(ids)
		const next = all.filter(f => !idSet.has(f.id))
		writeToStorage('feedbacks', next)
	}

	// ---------- Payments ----------
	function seedPaymentsIfEmpty() {
		const existing = readFromStorage<PaymentEntity[]>('payments')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: PaymentEntity[] = Array.from({length: 40}).map(() => ({
			id: faker.string.uuid(),
			customer: faker.person.fullName(),
			amount: Number(
				faker.number.float({min: 10, max: 2000, fractionDigits: 2}).toFixed(2),
			),
			currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
			status: faker.helpers.arrayElement([
				'succeeded',
				'pending',
				'failed',
				'refunded',
			]),
			time: faker.date.recent({days: 60}).toISOString(),
		}))
		// Tri récent -> ancien
		initial.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('payments', initial)
	}

	async function listPayments(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: PaymentEntity['status']
		dateFrom?: string
		dateTo?: string
		sortBy?: 'time' | 'amount'
		sortDir?: 'asc' | 'desc'
	}): Promise<Paginated<PaymentEntity>> {
		seedPaymentsIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status
		const dateFrom = params?.dateFrom
		const dateTo = params?.dateTo
		const sortBy = params?.sortBy ?? 'time'
		const sortDir = params?.sortDir ?? 'desc'
		const all = readFromStorage<PaymentEntity[]>('payments') ?? []
		const filteredByQ = q
			? all.filter(p =>
				p.customer.toLowerCase().includes(q) ||
				p.currency.toLowerCase().includes(q) ||
				String(p.amount).toLowerCase().includes(q) ||
				p.status.toLowerCase().includes(q),
			)
			: all
		const filteredByStatus = status
			? filteredByQ.filter(p => p.status === status)
			: filteredByQ
		const filtered = filteredByStatus.filter(p => {
			if (dateFrom && p.time < dateFrom) return false
			if (dateTo && p.time > dateTo) return false
			return true
		})
		const sorted = [...filtered].sort((a, b) => {
			if (sortBy === 'time') {
				const cmp = a.time.localeCompare(b.time)
				return sortDir === 'asc' ? cmp : -cmp
			} else {
				const cmp = a.amount - b.amount
				return sortDir === 'asc' ? cmp : -cmp
			}
		})
		const total = sorted.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = sorted.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createPayment(payload: {
		customer: string
		amount: number
		currency?: PaymentEntity['currency']
		status?: PaymentEntity['status']
	}): Promise<PaymentEntity> {
		const all = readFromStorage<PaymentEntity[]>('payments') ?? []
		const entity: PaymentEntity = {
			id: faker.string.uuid(),
			customer: payload.customer,
			amount: Number(payload.amount.toFixed(2)),
			currency: payload.currency ?? 'EUR',
			status: payload.status ?? 'succeeded',
			time: new Date().toISOString(),
		}
		const next = [entity, ...all]
		// Tri récent -> ancien
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('payments', next)
		return entity
	}

	async function updatePayment(
		id: string,
		changes: Partial<Pick<PaymentEntity, 'customer' | 'amount' | 'currency' | 'status'>>,
	): Promise<PaymentEntity> {
		const all = readFromStorage<PaymentEntity[]>('payments') ?? []
		const idx = all.findIndex(p => p.id === id)
		if (idx === -1) throw new Error('Payment not found')
		const updated = {
			...all[idx],
			...changes,
			amount:
				changes.amount !== undefined
					? Number(changes.amount.toFixed(2))
					: all[idx].amount,
		}
		const next = [...all]
		next[idx] = updated
		writeToStorage('payments', next)
		return updated
	}

	async function deletePayment(id: string): Promise<void> {
		const all = readFromStorage<PaymentEntity[]>('payments') ?? []
		const next = all.filter(p => p.id !== id)
		writeToStorage('payments', next)
	}

	async function deletePaymentsBulk(ids: string[]): Promise<void> {
		if (ids.length === 0) return
		const all = readFromStorage<PaymentEntity[]>('payments') ?? []
		const idSet = new Set(ids)
		const next = all.filter(p => !idSet.has(p.id))
		writeToStorage('payments', next)
	}

	// ---------- Subscriptions ----------
	function seedSubscriptionsIfEmpty() {
		const existing = readFromStorage<SubscriptionEntity[]>('subscriptions')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const plans: Array<SubscriptionEntity['plan']> = ['Basic', 'Pro', 'Enterprise']
		const currencies: Array<SubscriptionEntity['currency']> = ['USD', 'EUR', 'GBP']
		const initial: SubscriptionEntity[] = Array.from({length: 50}).map(() => {
			const isActive = faker.number.int({min: 0, max: 100}) < 80
			const start = faker.date.recent({days: 90}).toISOString()
			const durationDays = faker.number.int({min: 30, max: 365})
			const end = isActive ? undefined : faker.date.soon({days: durationDays}).toISOString()
			return {
				id: faker.string.uuid(),
				customer: faker.person.fullName(),
				plan: faker.helpers.arrayElement(plans),
				price: Number(
					faker.number.float({min: 5, max: 300, fractionDigits: 2}).toFixed(2),
				),
				currency: faker.helpers.arrayElement(currencies),
				status: isActive ? 'active' : 'canceled',
				start,
				end,
			}
		})
		// Tri récent -> ancien par date de début
		initial.sort((a, b) => b.start.localeCompare(a.start))
		writeToStorage('subscriptions', initial)
	}

	async function listSubscriptions(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: SubscriptionEntity['status']
		dateFrom?: string
		dateTo?: string
		sortBy?: 'start' | 'price'
		sortDir?: 'asc' | 'desc'
	}): Promise<Paginated<SubscriptionEntity>> {
		seedSubscriptionsIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status
		const dateFrom = params?.dateFrom
		const dateTo = params?.dateTo
		const sortBy = params?.sortBy ?? 'start'
		const sortDir = params?.sortDir ?? 'desc'
		const all = readFromStorage<SubscriptionEntity[]>('subscriptions') ?? []
		const filteredByQ = q
			? all.filter(s =>
				s.customer.toLowerCase().includes(q) ||
				s.plan.toLowerCase().includes(q) ||
				String(s.price).toLowerCase().includes(q) ||
				s.currency.toLowerCase().includes(q) ||
				s.status.toLowerCase().includes(q),
			)
			: all
		const filteredByStatus = status
			? filteredByQ.filter(s => s.status === status)
			: filteredByQ
		const filtered = filteredByStatus.filter(s => {
			if (dateFrom && s.start < dateFrom) return false
			if (dateTo && s.start > dateTo) return false
			return true
		})
		const sorted = [...filtered].sort((a, b) => {
			if (sortBy === 'start') {
				const cmp = a.start.localeCompare(b.start)
				return sortDir === 'asc' ? cmp : -cmp
			} else {
				const cmp = a.price - b.price
				return sortDir === 'asc' ? cmp : -cmp
			}
		})
		const total = sorted.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const startIdx = (page - 1) * pageSize
		const items = sorted.slice(startIdx, startIdx + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createSubscription(payload: {
		customer: string
		plan: SubscriptionEntity['plan']
		price: number
		currency?: SubscriptionEntity['currency']
		status?: SubscriptionEntity['status']
		start?: string
		end?: string
	}): Promise<SubscriptionEntity> {
		const all = readFromStorage<SubscriptionEntity[]>('subscriptions') ?? []
		const entity: SubscriptionEntity = {
			id: faker.string.uuid(),
			customer: payload.customer,
			plan: payload.plan,
			price: Number(payload.price.toFixed(2)),
			currency: payload.currency ?? 'EUR',
			status: payload.status ?? 'active',
			start: payload.start ?? new Date().toISOString(),
			end: payload.end,
		}
		const next = [entity, ...all]
		// Tri récent -> ancien par date de début
		next.sort((a, b) => b.start.localeCompare(a.start))
		writeToStorage('subscriptions', next)
		return entity
	}

	async function updateSubscription(
		id: string,
		changes: Partial<
			Pick<
				SubscriptionEntity,
				'customer' | 'plan' | 'price' | 'currency' | 'status' | 'start' | 'end'
			>
		>,
	): Promise<SubscriptionEntity> {
		const all = readFromStorage<SubscriptionEntity[]>('subscriptions') ?? []
		const idx = all.findIndex(s => s.id === id)
		if (idx === -1) throw new Error('Subscription not found')
		const updated = {
			...all[idx],
			...changes,
			price:
				changes.price !== undefined
					? Number(changes.price.toFixed(2))
					: all[idx].price,
		}
		const next = [...all]
		next[idx] = updated
		// Conserver tri récent -> ancien par date de début
		next.sort((a, b) => b.start.localeCompare(a.start))
		writeToStorage('subscriptions', next)
		return updated
	}

	async function deleteSubscription(id: string): Promise<void> {
		const all = readFromStorage<SubscriptionEntity[]>('subscriptions') ?? []
		const next = all.filter(s => s.id !== id)
		writeToStorage('subscriptions', next)
	}

	async function deleteSubscriptionsBulk(ids: string[]): Promise<void> {
		if (ids.length === 0) return
		const all = readFromStorage<SubscriptionEntity[]>('subscriptions') ?? []
		const idSet = new Set(ids)
		const next = all.filter(s => !idSet.has(s.id))
		writeToStorage('subscriptions', next)
	}

	// ---------- APIs ----------
	function seedApisIfEmpty() {
		const existing = readFromStorage<ApiEntity[]>('apis')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const versions = ['v1', 'v2', 'v3']
		const initial: ApiEntity[] = Array.from({length: 24}).map(() => {
			const status = faker.datatype.boolean() ? 'up' as const : 'down' as const
			return {
				id: faker.string.uuid(),
				name: faker.company.name(),
				baseUrl: faker.internet.url(),
				version: faker.helpers.arrayElement(versions),
				status,
				latencyMs: faker.number.int({min: 50, max: 1500}),
				uptimePct: Number(
					faker.number.float({min: 95, max: 99.99, fractionDigits: 2}).toFixed(2),
				),
				lastChecked: faker.date.recent({days: 3}).toISOString(),
				enabled: status === 'up' ? true : faker.datatype.boolean(),
				tags: faker.helpers.arrayElements(
					['billing', 'auth', 'crm', 'search', 'ml', 'maps', 'storage'],
					{min: 1, max: 3},
				),
			}
		})
		// Tri dernier check le plus récent en premier
		initial.sort((a, b) => b.lastChecked.localeCompare(a.lastChecked))
		writeToStorage('apis', initial)
	}

	async function listApis(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: ApiEntity['status'] | 'all'
		sortBy?: 'lastChecked' | 'name' | 'latencyMs'
		sortDir?: 'asc' | 'desc'
	}): Promise<Paginated<ApiEntity>> {
		seedApisIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status ?? 'all'
		const sortBy = params?.sortBy ?? 'lastChecked'
		const sortDir = params?.sortDir ?? 'desc'
		const all = readFromStorage<ApiEntity[]>('apis') ?? []
		const filteredByQ = q
			? all.filter(a =>
				a.name.toLowerCase().includes(q) ||
				a.baseUrl.toLowerCase().includes(q) ||
				a.version.toLowerCase().includes(q) ||
				a.status.toLowerCase().includes(q) ||
				a.tags.some(t => t.toLowerCase().includes(q)),
			)
			: all
		const filtered = status === 'all' ? filteredByQ : filteredByQ.filter(a => a.status === status)
		const sorted = [...filtered].sort((a, b) => {
			if (sortBy === 'name') {
				const cmp = a.name.localeCompare(b.name)
				return sortDir === 'asc' ? cmp : -cmp
			} else if (sortBy === 'latencyMs') {
				const cmp = a.latencyMs - b.latencyMs
				return sortDir === 'asc' ? cmp : -cmp
			} else {
				const cmp = a.lastChecked.localeCompare(b.lastChecked)
				return sortDir === 'asc' ? cmp : -cmp
			}
		})
		const total = sorted.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = sorted.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createApi(payload: Omit<ApiEntity, 'id' | 'lastChecked' | 'latencyMs' | 'uptimePct'>): Promise<ApiEntity> {
		const all = readFromStorage<ApiEntity[]>('apis') ?? []
		const entity: ApiEntity = {
			id: faker.string.uuid(),
			...payload,
			latencyMs: faker.number.int({min: 50, max: 1500}),
			uptimePct: Number(
				faker.number.float({min: 95, max: 99.99, fractionDigits: 2}).toFixed(2),
			),
			lastChecked: new Date().toISOString(),
		}
		const next = [entity, ...all]
		next.sort((a, b) => b.lastChecked.localeCompare(a.lastChecked))
		writeToStorage('apis', next)
		return entity
	}

	async function updateApi(
		id: string,
		changes: Partial<Omit<ApiEntity, 'id' | 'lastChecked' | 'latencyMs' | 'uptimePct'>> &
			Partial<Pick<ApiEntity, 'latencyMs' | 'uptimePct' | 'lastChecked'>>,
	): Promise<ApiEntity> {
		const all = readFromStorage<ApiEntity[]>('apis') ?? []
		const idx = all.findIndex(a => a.id === id)
		if (idx === -1) throw new Error('Api not found')
		const updated: ApiEntity = {
			...all[idx],
			...changes,
			lastChecked: changes.lastChecked ?? new Date().toISOString(),
		}
		const next = [...all]
		next[idx] = updated
		next.sort((a, b) => b.lastChecked.localeCompare(a.lastChecked))
		writeToStorage('apis', next)
		return updated
	}

	async function deleteApi(id: string): Promise<void> {
		const all = readFromStorage<ApiEntity[]>('apis') ?? []
		const next = all.filter(a => a.id !== id)
		writeToStorage('apis', next)
		// Nettoyer les clés associées
		const allKeys = readFromStorage<ApiKeyEntity[]>('api_keys') ?? []
		const nextKeys = allKeys.filter(k => k.apiId !== id)
		writeToStorage('api_keys', nextKeys)
	}

	// ---------- API Keys ----------
	function seedApiKeysIfEmpty() {
		const existing = readFromStorage<ApiKeyEntity[]>('api_keys')
		if (existing && existing.length > 0) return
		seedApisIfEmpty()
		const apis = readFromStorage<ApiEntity[]>('apis') ?? []
		faker.seed(42)
		const initial: ApiKeyEntity[] = []
		apis.forEach(a => {
			const count = faker.number.int({min: 1, max: 3})
			for (let i = 0; i < count; i++) {
				initial.push({
					id: faker.string.uuid(),
					apiId: a.id,
					label: `${a.name} key ${i + 1}`,
					key: faker.string.alphanumeric({length: 32}).toLowerCase(),
					status: faker.datatype.boolean() ? 'active' : 'revoked',
					scopes: faker.helpers.arrayElements(
						['read', 'write', 'admin', 'billing', 'usage'],
						{min: 1, max: 3},
					),
					createdAt: faker.date.recent({days: 30}).toISOString(),
					lastUsedAt: faker.datatype.boolean()
						? faker.date.recent({days: 10}).toISOString()
						: undefined,
				})
			}
		})
		// Tri récent -> ancien par date de création
		initial.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		writeToStorage('api_keys', initial)
	}

	async function listApiKeys(params?: {
		page?: number
		pageSize?: number
		q?: string
		apiId?: string
		status?: ApiKeyEntity['status'] | 'all'
		sortBy?: 'createdAt' | 'lastUsedAt' | 'label'
		sortDir?: 'asc' | 'desc'
	}): Promise<Paginated<ApiKeyEntity>> {
		seedApiKeysIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const apiId = params?.apiId
		const status = params?.status ?? 'all'
		const sortBy = params?.sortBy ?? 'createdAt'
		const sortDir = params?.sortDir ?? 'desc'
		const all = readFromStorage<ApiKeyEntity[]>('api_keys') ?? []
		const filteredByApi = apiId ? all.filter(k => k.apiId === apiId) : all
		const filteredByQ = q
			? filteredByApi.filter(k =>
				k.label.toLowerCase().includes(q) ||
				k.status.toLowerCase().includes(q) ||
				k.scopes.some(s => s.toLowerCase().includes(q)),
			)
			: filteredByApi
		const filtered = status === 'all' ? filteredByQ : filteredByQ.filter(k => k.status === status)
		const sorted = [...filtered].sort((a, b) => {
			if (sortBy === 'label') {
				const cmp = a.label.localeCompare(b.label)
				return sortDir === 'asc' ? cmp : -cmp
			} else if (sortBy === 'lastUsedAt') {
				const aVal = a.lastUsedAt ?? ''
				const bVal = b.lastUsedAt ?? ''
				const cmp = aVal.localeCompare(bVal)
				return sortDir === 'asc' ? cmp : -cmp
			} else {
				const cmp = a.createdAt.localeCompare(b.createdAt)
				return sortDir === 'asc' ? cmp : -cmp
			}
		})
		const total = sorted.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = sorted.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createApiKey(payload: {
		apiId: string
		label: string
		scopes?: string[]
		status?: ApiKeyEntity['status']
	}): Promise<ApiKeyEntity> {
		seedApisIfEmpty()
		const apis = readFromStorage<ApiEntity[]>('apis') ?? []
		const exists = apis.some(a => a.id === payload.apiId)
		if (!exists) throw new Error('Api not found for key')
		const all = readFromStorage<ApiKeyEntity[]>('api_keys') ?? []
		const entity: ApiKeyEntity = {
			id: faker.string.uuid(),
			apiId: payload.apiId,
			label: payload.label,
			key: faker.string.alphanumeric({length: 32}).toLowerCase(),
			status: payload.status ?? 'active',
			scopes: payload.scopes && payload.scopes.length > 0 ? payload.scopes : ['read'],
			createdAt: new Date().toISOString(),
			lastUsedAt: undefined,
		}
		const next = [entity, ...all]
		next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		writeToStorage('api_keys', next)
		return entity
	}

	async function updateApiKey(
		id: string,
		changes: Partial<Pick<ApiKeyEntity, 'label' | 'status' | 'scopes' | 'lastUsedAt'>>,
	): Promise<ApiKeyEntity> {
		const all = readFromStorage<ApiKeyEntity[]>('api_keys') ?? []
		const idx = all.findIndex(k => k.id === id)
		if (idx === -1) throw new Error('API key not found')
		const updated: ApiKeyEntity = {
			...all[idx],
			...changes,
		}
		const next = [...all]
		next[idx] = updated
		// Conserver tri récent -> ancien par création
		next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		writeToStorage('api_keys', next)
		return updated
	}

	async function rotateApiKey(id: string): Promise<ApiKeyEntity> {
		const all = readFromStorage<ApiKeyEntity[]>('api_keys') ?? []
		const idx = all.findIndex(k => k.id === id)
		if (idx === -1) throw new Error('API key not found')
		const updated: ApiKeyEntity = {
			...all[idx],
			key: faker.string.alphanumeric({length: 32}).toLowerCase(),
			createdAt: new Date().toISOString(),
		}
		const next = [...all]
		next[idx] = updated
		next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		writeToStorage('api_keys', next)
		return updated
	}

	async function deleteApiKey(id: string): Promise<void> {
		const all = readFromStorage<ApiKeyEntity[]>('api_keys') ?? []
		const next = all.filter(k => k.id !== id)
		writeToStorage('api_keys', next)
	}

	// ---------- Chats ----------
	function seedChatsIfEmpty() {
		const existing = readFromStorage<ChatThreadEntity[]>('chats')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: ChatThreadEntity[] = Array.from({length: 30}).map(() => ({
			id: faker.string.uuid(),
			title: faker.lorem.words({min: 2, max: 5}),
			participants: faker.number.int({min: 2, max: 12}),
			status: faker.datatype.boolean() ? 'open' : 'archived',
			time: faker.date.recent({days: 30}).toISOString(),
		}))
		// Tri récent -> ancien
		initial.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('chats', initial)
	}

	function seedChatMessagesIfEmpty() {
		const existing = readFromStorage<ChatMessageEntity[]>('chat_messages')
		if (existing && existing.length > 0) return
		seedChatsIfEmpty()
		const threads = readFromStorage<ChatThreadEntity[]>('chats') ?? []
		faker.seed(42)
		const messages: ChatMessageEntity[] = []
		threads.forEach(t => {
			const count = faker.number.int({min: 3, max: 25})
			for (let i = 0; i < count; i++) {
				messages.push({
					id: faker.string.uuid(),
					threadId: t.id,
					author: faker.person.fullName(),
					content: faker.lorem.sentence({min: 4, max: 12}),
					time: faker.date.recent({days: 30}).toISOString(),
				})
			}
		})
		messages.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('chat_messages', messages)
	}

	async function listChats(params?: {
		page?: number
		pageSize?: number
		q?: string
		status?: ChatThreadEntity['status']
	}): Promise<Paginated<ChatThreadEntity>> {
		seedChatsIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const status = params?.status
		const all = readFromStorage<ChatThreadEntity[]>('chats') ?? []
		const filteredByQ = q
			? all.filter(c => c.title.toLowerCase().includes(q))
			: all
		const filtered = status ? filteredByQ.filter(c => c.status === status) : filteredByQ
		const total = filtered.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = filtered.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createChat(payload: {
		title: string
		participants?: number
		status?: ChatThreadEntity['status']
	}): Promise<ChatThreadEntity> {
		const all = readFromStorage<ChatThreadEntity[]>('chats') ?? []
		const entity: ChatThreadEntity = {
			id: faker.string.uuid(),
			title: payload.title,
			participants: Math.max(1, Math.round(payload.participants ?? faker.number.int({min: 2, max: 12}))),
			status: payload.status ?? 'open',
			time: new Date().toISOString(),
		}
		const next = [entity, ...all]
		// Tri récent -> ancien
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('chats', next)
		return entity
	}

	async function updateChat(
		id: string,
		changes: Partial<Pick<ChatThreadEntity, 'title' | 'participants' | 'status'>>,
	): Promise<ChatThreadEntity> {
		const all = readFromStorage<ChatThreadEntity[]>('chats') ?? []
		const idx = all.findIndex(c => c.id === id)
		if (idx === -1) throw new Error('Chat thread not found')
		const updated: ChatThreadEntity = {
			...all[idx],
			...changes,
			participants:
				changes.participants !== undefined
					? Math.max(1, Math.round(changes.participants))
					: all[idx].participants,
			// Mise à jour de l'horodatage pour remonter lors de l'activité
			time: new Date().toISOString(),
		}
		const next = [...all]
		next[idx] = updated
		// Conserver tri récent -> ancien
		next.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('chats', next)
		return updated
	}

	async function deleteChat(id: string): Promise<void> {
		const all = readFromStorage<ChatThreadEntity[]>('chats') ?? []
		const next = all.filter(c => c.id !== id)
		writeToStorage('chats', next)
	}

	// ---------- Events (Calendar) ----------
	function seedEventsIfEmpty() {
		const existing = readFromStorage<EventEntity[]>('events')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const initial: EventEntity[] = Array.from({length: 24}).map(() => ({
			id: faker.string.uuid(),
			title: faker.lorem.words({min: 2, max: 5}),
			time: faker.date.soon({days: 60}).toISOString(),
		}))
		// Tri proche -> lointain (ascendant par date)
		initial.sort((a, b) => a.time.localeCompare(b.time))
		writeToStorage('events', initial)
	}

	async function listEvents(params?: {
		page?: number
		pageSize?: number
		q?: string
		dateFrom?: string
		dateTo?: string
		order?: 'asc' | 'desc'
	}): Promise<Paginated<EventEntity>> {
		seedEventsIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const dateFrom = params?.dateFrom
		const dateTo = params?.dateTo
		const order = params?.order ?? 'asc'
		const all = readFromStorage<EventEntity[]>('events') ?? []
		const filteredByQ = q
			? all.filter(e => e.title.toLowerCase().includes(q))
			: all
		const filtered = filteredByQ.filter(e => {
			if (dateFrom && e.time < dateFrom) return false
			if (dateTo && e.time > dateTo) return false
			return true
		})
		const sorted = [...filtered].sort((a, b) => {
			const cmp = a.time.localeCompare(b.time)
			return order === 'asc' ? cmp : -cmp
		})
		const total = sorted.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = sorted.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function createEvent(payload: {
		title: string
		time?: string
	}): Promise<EventEntity> {
		const all = readFromStorage<EventEntity[]>('events') ?? []
		const entity: EventEntity = {
			id: faker.string.uuid(),
			title: payload.title,
			time: payload.time ?? new Date().toISOString(),
		}
		const next = [entity, ...all]
		// Tri proche -> lointain (ascendant par date)
		next.sort((a, b) => a.time.localeCompare(b.time))
		writeToStorage('events', next)
		return entity
	}

	async function updateEvent(
		id: string,
		changes: Partial<Pick<EventEntity, 'title' | 'time'>>,
	): Promise<EventEntity> {
		const all = readFromStorage<EventEntity[]>('events') ?? []
		const idx = all.findIndex(e => e.id === id)
		if (idx === -1) throw new Error('Event not found')
		const updated = {...all[idx], ...changes}
		const next = [...all]
		next[idx] = updated
		// Conserver tri ascendant
		next.sort((a, b) => a.time.localeCompare(b.time))
		writeToStorage('events', next)
		return updated
	}

	async function deleteEvent(id: string): Promise<void> {
		const all = readFromStorage<EventEntity[]>('events') ?? []
		const next = all.filter(e => e.id !== id)
		writeToStorage('events', next)
	}

	// ---------- Monitoring ----------
	function seedMonitoringIfEmpty() {
		const existing = readFromStorage<MonitoringMetrics>('monitoring_metrics')
		if (existing) return
		faker.seed(42)
		const initial: MonitoringMetrics = {
			cpu: faker.number.int({min: 5, max: 95}),
			memoryMb: faker.number.int({min: 512, max: 32768}),
			updatedAt: new Date().toISOString(),
		}
		writeToStorage('monitoring_metrics', initial)
	}

	async function getMonitoringMetrics(): Promise<MonitoringMetrics> {
		seedMonitoringIfEmpty()
		const current = readFromStorage<MonitoringMetrics>('monitoring_metrics')
		return (
			current ?? {
				cpu: 0,
				memoryMb: 0,
				updatedAt: new Date().toISOString(),
			}
		)
	}

	async function refreshMonitoringMetrics(): Promise<MonitoringMetrics> {
		const prev = await getMonitoringMetrics()
		faker.seed(42)
		const next: MonitoringMetrics = {
			cpu: Math.min(100, Math.max(0, prev.cpu + faker.number.int({min: -10, max: 10}))),
			memoryMb: Math.max(256, prev.memoryMb + faker.number.int({min: -256, max: 512})),
			updatedAt: new Date().toISOString(),
		}
		writeToStorage('monitoring_metrics', next)
		return next
	}

	// ---------- Internal API Monitoring ----------
	function seedInternalApiMonitoringIfEmpty() {
		const existingMetrics = readFromStorage<InternalApiMetrics>('internal_api_metrics')
		const existingLogs = readFromStorage<InternalApiLog[]>('internal_api_logs')
		if (existingMetrics && existingLogs && existingLogs.length > 0) return
		faker.seed(42)
		const metrics: InternalApiMetrics = {
			successRatePct: faker.number.int({min: 90, max: 99}),
			errorRatePct: 0,
			avgResponseMs: faker.number.int({min: 80, max: 450}),
			requestsLast24h: faker.number.int({min: 500, max: 5000}),
			updatedAt: new Date().toISOString(),
		}
		metrics.errorRatePct = Math.max(0, 100 - metrics.successRatePct)
		writeToStorage('internal_api_metrics', metrics)
		const methods: InternalApiLog['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
		const routes = [
			'/auth/login',
			'/auth/logout',
			'/users',
			'/users/{id}',
			'/payments',
			'/payments/{id}',
			'/subscriptions',
			'/subscriptions/{id}',
			'/notifications',
			'/emails',
			'/feedbacks',
			'/chats',
			'/chats/{id}/messages',
		]
		const logs: InternalApiLog[] = Array.from({length: 60}).map(() => ({
			id: faker.string.uuid(),
			time: faker.date.recent({days: 7}).toISOString(),
			method: faker.helpers.arrayElement(methods),
			route: faker.helpers
				.arrayElement(routes)
				.replace('{id}', faker.string.alphanumeric({length: 8}).toLowerCase()),
			status: faker.helpers.weightedArrayElement([
				{value: 200, weight: 60},
				{value: 201, weight: 10},
				{value: 204, weight: 5},
				{value: 400, weight: 8},
				{value: 401, weight: 4},
				{value: 403, weight: 3},
				{value: 404, weight: 6},
				{value: 500, weight: 3},
				{value: 502, weight: 1},
			]),
			durationMs: faker.number.int({min: 20, max: 2000}),
			user: faker.internet.userName(),
		}))
		logs.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('internal_api_logs', logs)
	}

	async function getInternalApiMetrics(): Promise<InternalApiMetrics> {
		seedInternalApiMonitoringIfEmpty()
		const current = readFromStorage<InternalApiMetrics>('internal_api_metrics')
		return (
			current ?? {
				successRatePct: 100,
				errorRatePct: 0,
				avgResponseMs: 0,
				requestsLast24h: 0,
				updatedAt: new Date().toISOString(),
			}
		)
	}

	async function listInternalApiLogs(params?: {
		page?: number
		pageSize?: number
		q?: string
		statusClass?: 'all' | '2xx' | '4xx' | '5xx'
		method?: 'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	}): Promise<Paginated<InternalApiLog>> {
		seedInternalApiMonitoringIfEmpty()
		const page = params?.page ?? 1
		const pageSize = params?.pageSize ?? 10
		const q = (params?.q ?? '').trim().toLowerCase()
		const statusClass = params?.statusClass ?? 'all'
		const method = params?.method ?? 'ALL'
		const all = readFromStorage<InternalApiLog[]>('internal_api_logs') ?? []
		const filteredByQ = q
			? all.filter(l =>
				l.route.toLowerCase().includes(q) || l.user.toLowerCase().includes(q),
			)
			: all
		const filteredByMethod =
			method === 'ALL' ? filteredByQ : filteredByQ.filter(l => l.method === method)
		const filtered = filteredByMethod.filter(l => {
			if (statusClass === 'all') return true
			if (statusClass === '2xx') return l.status >= 200 && l.status < 300
			if (statusClass === '4xx') return l.status >= 400 && l.status < 500
			if (statusClass === '5xx') return l.status >= 500 && l.status < 600
			return true
		})
		const sorted = [...filtered].sort((a, b) => b.time.localeCompare(a.time))
		const total = sorted.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const start = (page - 1) * pageSize
		const items = sorted.slice(start, start + pageSize)
		return {items, total, page, pageSize, totalPages}
	}

	async function refreshInternalApiMetrics(): Promise<InternalApiMetrics> {
		const prev = await getInternalApiMetrics()
		faker.seed(42)
		const next: InternalApiMetrics = {
			successRatePct: Math.max(
				0,
				Math.min(100, prev.successRatePct + faker.number.int({min: -3, max: 3})),
			),
			errorRatePct: 0, // fixée plus bas comme complément
			avgResponseMs: Math.max(
				10,
				prev.avgResponseMs + faker.number.int({min: -50, max: 80}),
			),
			requestsLast24h: Math.max(
				0,
				prev.requestsLast24h + faker.number.int({min: -200, max: 400}),
			),
			updatedAt: new Date().toISOString(),
		}
		next.errorRatePct = Math.max(0, 100 - next.successRatePct)
		writeToStorage('internal_api_metrics', next)
		// Ajouter quelques logs récents
		const methods: InternalApiLog['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
		const routes = [
			'/auth/login',
			'/users',
			'/payments',
			'/subscriptions',
			'/notifications',
			'/emails',
		]
		const count = faker.number.int({min: 1, max: 4})
		const existing = readFromStorage<InternalApiLog[]>('internal_api_logs') ?? []
		const additions: InternalApiLog[] = Array.from({length: count}).map(() => ({
			id: faker.string.uuid(),
			time: new Date().toISOString(),
			method: faker.helpers.arrayElement(methods),
			route: faker.helpers
				.arrayElement(routes)
				.replace('{id}', faker.string.alphanumeric({length: 8}).toLowerCase()),
			status: faker.helpers.weightedArrayElement([
				{value: 200, weight: 60},
				{value: 201, weight: 10},
				{value: 204, weight: 5},
				{value: 400, weight: 8},
				{value: 401, weight: 4},
				{value: 403, weight: 3},
				{value: 404, weight: 6},
				{value: 500, weight: 3},
				{value: 502, weight: 1},
			]),
			durationMs: faker.number.int({min: 20, max: 2000}),
			user: faker.internet.userName(),
		}))
		const nextLogs = [...additions, ...existing]
		nextLogs.sort((a, b) => b.time.localeCompare(a.time))
		writeToStorage('internal_api_logs', nextLogs)
		return next
	}

	// ---------- Analytics ----------
	function seedAnalyticsIfEmpty() {
		const existing = readFromStorage<AnalyticsDailyEntity[]>('analytics_daily')
		if (existing && existing.length > 0) return
		faker.seed(42)
		const today = new Date()
		const initial: AnalyticsDailyEntity[] = Array.from({length: 60}).map((_, i) => {
			const d = new Date(today)
			d.setDate(d.getDate() - (59 - i))
			return {
				date: d.toISOString(),
				visitors: faker.number.int({min: 80, max: 320}),
			}
		})
		writeToStorage('analytics_daily', initial)
	}

	async function getAnalyticsLastDays(count = 7): Promise<AnalyticsMetrics> {
		seedAnalyticsIfEmpty()
		const all = readFromStorage<AnalyticsDailyEntity[]>('analytics_daily') ?? []
		const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date))
		const days = sorted.slice(Math.max(0, sorted.length - count))
		const totalVisitors = days.reduce((acc, d) => acc + d.visitors, 0)
		const avgPerDay = days.length > 0 ? Math.round(totalVisitors / days.length) : 0
		return {
			days,
			totalVisitors,
			avgPerDay,
			updatedAt: new Date().toISOString(),
		}
	}

	async function refreshAnalyticsToday(count = 7): Promise<AnalyticsMetrics> {
		seedAnalyticsIfEmpty()
		const all = readFromStorage<AnalyticsDailyEntity[]>('analytics_daily') ?? []
		const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date))
		const last = sorted[sorted.length - 1]
		const today = new Date()
		const isSameDay = last
			? new Date(last.date).toDateString() === today.toDateString()
			: false
		if (!isSameDay) {
			sorted.push({
				date: today.toISOString(),
				visitors: faker.number.int({min: 80, max: 320}),
			})
		} else {
			const delta = faker.number.int({min: -20, max: 30})
			const updated = Math.max(0, (last?.visitors ?? 0) + delta)
			sorted[sorted.length - 1] = {...last, visitors: updated}
		}
		writeToStorage('analytics_daily', sorted)
		return getAnalyticsLastDays(count)
	}

	const apiRef = useRef<{
		users: {
			list: typeof listUsers
			create: typeof createUser
			update: typeof updateUser
			delete: typeof deleteUser
		}
		analytics: {
			getLastDays: typeof getAnalyticsLastDays
			refresh: typeof refreshAnalyticsToday
			getSourcesBreakdown: typeof getAnalyticsSourcesBreakdown
			refreshSourcesBreakdown: typeof refreshAnalyticsSourcesBreakdown
			getKpis: typeof getAnalyticsKpis
			refreshKpis: typeof refreshAnalyticsKpis
		}
		apis: {
			list: typeof listApis
			create: typeof createApi
			update: typeof updateApi
			delete: typeof deleteApi
		}
		apiKeys: {
			list: typeof listApiKeys
			create: typeof createApiKey
			update: typeof updateApiKey
			delete: typeof deleteApiKey
			rotate: typeof rotateApiKey
		}
		notifications: {
			list: typeof listNotifications
			create: typeof createNotification
			update: typeof updateNotification
			delete: typeof deleteNotification
		}
		emails: {
			list: typeof listEmails
			create: typeof createEmail
			update: typeof updateEmail
			delete: typeof deleteEmail
			updateBulk: typeof updateEmailsBulk
			deleteBulk: typeof deleteEmailsBulk
		}
		feedbacks: {
			list: typeof listFeedbacks
			create: typeof createFeedback
			update: typeof updateFeedback
			delete: typeof deleteFeedback
			updateBulk: typeof updateFeedbacksBulk
			deleteBulk: typeof deleteFeedbacksBulk
		}
		payments: {
			list: typeof listPayments
			create: typeof createPayment
			update: typeof updatePayment
			delete: typeof deletePayment
			deleteBulk: typeof deletePaymentsBulk
		}
		subscriptions: {
			list: typeof listSubscriptions
			create: typeof createSubscription
			update: typeof updateSubscription
			delete: typeof deleteSubscription
			deleteBulk: typeof deleteSubscriptionsBulk
		}
		events: {
			list: typeof listEvents
			create: typeof createEvent
			update: typeof updateEvent
			delete: typeof deleteEvent
		}
		chats: {
			list: typeof listChats
			create: typeof createChat
			update: typeof updateChat
			delete: typeof deleteChat
			listMessages: typeof listChatMessages
		}
		monitoring: {
			get: typeof getMonitoringMetrics
			refresh: typeof refreshMonitoringMetrics
		}
		internalApis: {
			getMetrics: typeof getInternalApiMetrics
			refreshMetrics: typeof refreshInternalApiMetrics
			listLogs: typeof listInternalApiLogs
		}
	} | null>(null)

	if (!apiRef.current) {
		apiRef.current = {
			users: {
				list: listUsers,
				create: createUser,
				update: updateUser,
				delete: deleteUser,
			},
			analytics: {
				getLastDays: getAnalyticsLastDays,
				refresh: refreshAnalyticsToday,
				getSourcesBreakdown: getAnalyticsSourcesBreakdown,
				refreshSourcesBreakdown: refreshAnalyticsSourcesBreakdown,
				getKpis: getAnalyticsKpis,
				refreshKpis: refreshAnalyticsKpis,
			},
			apis: {
				list: listApis,
				create: createApi,
				update: updateApi,
				delete: deleteApi,
			},
			apiKeys: {
				list: listApiKeys,
				create: createApiKey,
				update: updateApiKey,
				delete: deleteApiKey,
				rotate: rotateApiKey,
			},
			notifications: {
				list: listNotifications,
				create: createNotification,
				update: updateNotification,
				delete: deleteNotification,
			},
			emails: {
				list: listEmails,
				create: createEmail,
				update: updateEmail,
				delete: deleteEmail,
				updateBulk: updateEmailsBulk,
				deleteBulk: deleteEmailsBulk,
			},
			feedbacks: {
				list: listFeedbacks,
				create: createFeedback,
				update: updateFeedback,
				delete: deleteFeedback,
				updateBulk: updateFeedbacksBulk,
				deleteBulk: deleteFeedbacksBulk,
			},
			payments: {
				list: listPayments,
				create: createPayment,
				update: updatePayment,
				delete: deletePayment,
				deleteBulk: deletePaymentsBulk,
			},
			subscriptions: {
				list: listSubscriptions,
				create: createSubscription,
				update: updateSubscription,
				delete: deleteSubscription,
				deleteBulk: deleteSubscriptionsBulk,
			},
			chats: {
				list: listChats,
				create: createChat,
				update: updateChat,
				delete: deleteChat,
				listMessages: listChatMessages,
			},
			monitoring: {
				get: getMonitoringMetrics,
				refresh: refreshMonitoringMetrics,
			},
			internalApis: {
				getMetrics: getInternalApiMetrics,
				refreshMetrics: refreshInternalApiMetrics,
				listLogs: listInternalApiLogs,
			},
			events: {
				list: listEvents,
				create: createEvent,
				update: updateEvent,
				delete: deleteEvent,
			},
		}
	}

	return apiRef.current
}
