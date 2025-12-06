'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {useTranslations} from 'next-intl'
import {useApi, type UserEntity} from '@/lib/useApi'

/**
 * AdminSettings
 * Gestion de l'équipe (mock) basée sur le module Utilisateurs.
 * - Liste, création basique, modification rôle/statut, suppression
 * - A11y: live region, labels, roles de tableau
 * - i18n: réutilise widgets.users/pages.users
 */
export function AdminSettings () {
	const tNav = useTranslations('nav')
	const tUsers = useTranslations('pages.users')
	const tW = useTranslations('widgets.users')
	const api = useApi()

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [items, setItems] = useState<UserEntity[]>([])

	const [creating, setCreating] = useState(false)
	const [createName, setCreateName] = useState('')
	const [createRole, setCreateRole] = useState<UserEntity['role']>('Viewer')
	const [createStatus, setCreateStatus] = useState<UserEntity['status']>('active')
	const [nameTouched, setNameTouched] = useState(false)

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editRole, setEditRole] = useState<UserEntity['role']>('Viewer')
	const [editStatus, setEditStatus] = useState<UserEntity['status']>('active')

	const liveRef = useRef<HTMLDivElement | null>(null)
	const editRoleRef = useRef<HTMLSelectElement | null>(null)

	const roleOptions = useMemo(() => (
		[
			{value: 'Admin', label: tUsers('roles.admin')},
			{value: 'Editor', label: tUsers('roles.editor')},
			{value: 'Viewer', label: tUsers('roles.viewer')},
		]
	), [tUsers])

	const statusOptions = useMemo(() => (
		[
			{value: 'active', label: tUsers('status.active')},
			{value: 'inactive', label: tUsers('status.inactive')},
		]
	), [tUsers])

	function speak(message: string) {
		if (!liveRef.current) return
		// Vider puis réécrire au frame suivant pour fiabiliser l'annonce
		// et éviter toute collision avec des re-renders
		liveRef.current.textContent = ''
		requestAnimationFrame(() => {
			if (liveRef.current) liveRef.current.textContent = message
		})
	}

	async function load () {
		setLoading(true)
		setError(null)
		try {
			const res = await api.users.list({page: 1, pageSize: 100})
			setItems(res.items)
		} catch (e) {
			setError((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		if (editingId && editRoleRef.current) {
			editRoleRef.current.focus()
		}
	}, [editingId])

	function startEdit(u: UserEntity) {
		setEditingId(u.id)
		setEditRole(u.role)
		setEditStatus(u.status)
	}

	function cancelEdit() {
		setEditingId(null)
	}

	async function saveEdit(id: string) {
		try {
			await api.users.update(id, {role: editRole, status: editStatus})
			setEditingId(null)
			await load()
			speak(tUsers('live.updated'))
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		setError(null)
		try {
			await api.users.create({
				name: createName,
				role: createRole,
				status: createStatus,
			})
			setCreateName('')
			setNameTouched(false)
			setCreateRole('Viewer')
			setCreateStatus('active')
			await load()
			speak(tUsers('live.created'))
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setCreating(false)
		}
	}

	async function handleDelete(id: string) {
		const ok = window.confirm(tUsers('deleteConfirm'))
		if (!ok) return
		try {
			await api.users.delete(id)
			await load()
			speak(tUsers('live.deleted'))
		} catch (err) {
			setError((err as Error).message)
		}
	}

	return (
		<section aria-labelledby='team-title'>
			<header className='mb-4 flex items-end justify-between gap-4'>
				<h2 id='team-title' className='text-lg font-medium'>
					{tNav('team')}
				</h2>
			</header>

			<div
				ref={liveRef}
				className='sr-only'
				aria-live='polite'
				aria-atomic='true'
				data-testid='team-live-region'
			/>

			<form onSubmit={handleCreate} aria-label={tNav('team')} className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-4' data-testid='team-form'>
				<div>
					<label htmlFor='t-name' className='block text-xs text-white/70'>
						{tW('name')}
					</label>
					<input
						id='t-name'
						value={createName}
						onChange={e => setCreateName(e.target.value)}
						onBlur={() => {
							setNameTouched(true)
						}}
						required
						aria-invalid={nameTouched && !createName.trim() ? 'true' : undefined}
						aria-describedby={nameTouched && !createName.trim() ? 't-name-error' : undefined}
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					/>
					{(nameTouched && !createName.trim()) && (
						<p id='t-name-error' role='alert' className='mt-1 text-xs text-red-400' data-testid='team-name-error'>
							{tUsers('errors.nameRequired')}
						</p>
					)}
				</div>
				<div>
					<label htmlFor='t-role' className='block text-xs text-white/70'>
						{tW('role')}
					</label>
					<select
						id='t-role'
						value={createRole}
						onChange={e => setCreateRole(e.target.value as UserEntity['role'])}
						className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
					>
						{roleOptions.map(o => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor='t-status' className='block text-xs text-white/70'>
						{tW('status')}
					</label>
					<select
						id='t-status'
						value={createStatus}
						onChange={e => setCreateStatus(e.target.value as UserEntity['status'])}
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
						disabled={creating || !createName.trim()}
						className='rounded-md bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50'
					>
						{tUsers('addUser')}
					</button>
				</div>
			</form>

			<div className='overflow-x-auto rounded-lg border border-white/10'>
				<table className='min-w-full text-sm' aria-label={tNav('team')}>
					<thead className='text-left text-white/70'>
						<tr>
							<th scope='col' className='pb-2 pr-4'>{tW('name')}</th>
							<th scope='col' className='pb-2 pr-4'>{tW('role')}</th>
							<th scope='col' className='pb-2 pr-4'>{tW('status')}</th>
							<th scope='col' className='pb-2'>{tW('actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-white/10'>
						{loading && (
							<tr>
								<td colSpan={4} className='py-4 text-center text-white/70'>
									{tUsers('loading')}
								</td>
							</tr>
						)}
						{!loading && items.length === 0 && (
							<tr>
								<td colSpan={4} className='py-4 text-center text-white/70'>
									{tUsers('noResults')}
								</td>
							</tr>
						)}
						{items.map(u => (
							<tr key={u.id} data-testid='team-row' data-user-id={u.id}>
								<td className='py-2 pr-4'>{u.name}</td>
								<td className='py-2 pr-4'>
									{editingId === u.id ? (
										<select
											value={editRole}
											onChange={e => setEditRole(e.target.value as UserEntity['role'])}
											ref={editRoleRef}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
											data-testid='team-edit-role'
										>
											{roleOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										<span>{tUsers(
											u.role === 'Admin' ? 'roles.admin' : u.role === 'Editor' ? 'roles.editor' : 'roles.viewer',
										)}</span>
									)}
								</td>
								<td className='py-2 pr-4'>
									{editingId === u.id ? (
										<select
											value={editStatus}
											onChange={e => setEditStatus(e.target.value as UserEntity['status'])}
											className='w-full rounded-md border border-white/10 bg-white/5 p-2 outline-none focus:ring-2 focus:ring-blue-500'
											data-testid='team-edit-status'
										>
											{statusOptions.map(o => (
												<option key={o.value} value={o.value}>{o.label}</option>
											))}
										</select>
									) : (
										<span>{tUsers(u.status === 'active' ? 'status.active' : 'status.inactive')}</span>
									)}
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										{editingId === u.id ? (
											<>
												<button
													onClick={() => saveEdit(u.id)}
													type='button'
													className='rounded-md bg-green-600 px-2 py-1 text-sm hover:bg-green-500'
													data-testid='team-action-save'
												>
													{tUsers('save')}
												</button>
												<button
													onClick={cancelEdit}
													type='button'
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													data-testid='team-action-cancel'
												>
													{tUsers('cancel')}
												</button>
											</>
										) : (
											<>
												<button
													onClick={() => startEdit(u)}
													type='button'
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													aria-label={tW('edit')}
													data-testid='team-action-edit'
												>
													{tW('edit')}
												</button>
												<button
													onClick={() => handleDelete(u.id)}
													type='button'
													className='rounded-md bg-white/5 px-2 py-1 text-sm hover:bg-white/10'
													aria-label={tW('delete')}
													data-testid='team-action-delete'
												>
													{tW('delete')}
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

			{error && (
				<p role='alert' className='mt-3 text-sm text-red-400'>
					{error}
				</p>
			)}
		</section>
	)
}
