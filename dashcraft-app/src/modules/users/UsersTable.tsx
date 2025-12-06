'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

interface UserRow {
	id: string
	name: string
	role: string
	status: 'active' | 'inactive'
}

function makeUsers(count = 8): UserRow[] {
    // Seed pour des données stables entre SSR et client
    faker.seed(42)
	return Array.from({length: count}).map(() => ({
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		role: faker.helpers.arrayElement(['Admin', 'Editor', 'Viewer']),
		status: faker.datatype.boolean() ? 'active' : 'inactive',
	}))
}

/**
 * UsersTable
 * Tableau utilisateurs mocké (faker).
 */
export function UsersTable() {
	const t = useTranslations('widgets.users')
	const users = makeUsers()
	return (
		<WidgetCard id='module-users' title={t('title')}>
			<div className='overflow-x-auto'>
				<table className='min-w-full text-sm'>
					<thead className='text-left text-white/70'>
						<tr>
							<th className='pb-2 pr-4'>{t('name')}</th>
							<th className='pb-2 pr-4'>{t('role')}</th>
							<th className='pb-2 pr-4'>{t('status')}</th>
							<th className='pb-2'>{t('actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-white/10'>
						{users.map(u => (
							<tr key={u.id}>
								<td className='py-2 pr-4'>{u.name}</td>
								<td className='py-2 pr-4'>{u.role}</td>
								<td className='py-2 pr-4'>
									<span
										className={
											u.status === 'active'
												? 'text-green-400'
												: 'text-amber-400'
										}
									>
										{u.status}
									</span>
								</td>
								<td className='py-2'>
									<div className='flex items-center gap-2'>
										<button className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'>
											{t('edit')}
										</button>
										<button className='rounded-md bg-white/5 px-2 py-1 hover:bg-white/10'>
											{t('delete')}
										</button>
									</div>
								</td>
							</tr>
							))}
						</tbody>
					</table>
				</div>
			</WidgetCard>
		)
}
