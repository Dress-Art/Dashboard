import '@testing-library/jest-dom'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import {render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {AdminSettings} from './admin-settings'

// Mock i18n: retourner des libellés stables (EN)
vi.mock('next-intl', () => {
	return {
		useTranslations: (ns?: string) => {
			const maps: Record<string, Record<string, string>> = {
				nav: {team: 'Team'},
				'widgets.users': {
					name: 'Name',
					role: 'Role',
					status: 'Status',
					actions: 'Actions',
					edit: 'Edit',
					delete: 'Delete',
				},
				'pages.users': {
					addUser: 'Add',
					save: 'Save',
					cancel: 'Cancel',
					loading: 'Loading...',
					noResults: 'No results',
					deleteConfirm: 'Delete this user?',
					'roles.admin': 'Administrator',
					'roles.editor': 'Editor',
					'roles.viewer': 'Viewer',
					'status.active': 'Active',
					'status.inactive': 'Inactive',
					'live.created': 'User created',
					'live.updated': 'User updated',
					'live.deleted': 'User deleted',
					'errors.nameRequired': 'Name is required',
				},
			}
			return (key: string) => maps[ns ?? '']?.[key] ?? `${ns}.${key}`
		},
	}
})

// Stub confirm pour les tests de suppression
const originalConfirm = window.confirm
beforeEach(() => {
	localStorage.clear()
	vi.restoreAllMocks()
	window.confirm = originalConfirm
})

describe('AdminSettings (unit)', () => {
	test('Validation: submit désactivé quand nom vide ou espaces, required présent', async () => {
		render(<AdminSettings />)
		const input = await screen.findByLabelText('Name')
		const submit = screen.getByRole('button', {name: /Add/i})

		// required
		expect(input).toBeRequired()
		// initialement désactivé
		expect(submit).toBeDisabled()

		// espaces -> toujours désactivé
		await userEvent.clear(input)
		await userEvent.type(input, '   ')
		expect(submit).toBeDisabled()

		// live region vide
		expect(screen.getByTestId('team-live-region')).toHaveTextContent('')
	})

	test('Validation A11y: annonce d\'erreur au blur + aria-invalid/-describedby', async () => {
		render(<AdminSettings />)
		const input = await screen.findByLabelText('Name')
		// Assurer l'état vide
		await userEvent.clear(input)
		// Déclencher blur
		input.blur()
		// Live region annonce l'erreur
		await screen.findByText('Name is required')
		// Attributs ARIA
		expect(input).toHaveAttribute('aria-invalid', 'true')
		expect(input).toHaveAttribute('aria-describedby', 't-name-error')
		const err = screen.getByTestId('team-name-error')
		expect(err).toHaveAttribute('id', 't-name-error')
		expect(err).toHaveAttribute('role', 'alert')
		expect(err).toHaveTextContent('Name is required')

		// Corriger avec une valeur valide
		await userEvent.type(input, 'Daisy')
		input.blur()
		expect(input).not.toHaveAttribute('aria-invalid')
		expect(screen.queryByTestId('team-name-error')).toBeNull()
		// Bouton activé
		expect(screen.getByRole('button', {name: /Add/i})).toBeEnabled()
	})

	test('Annulation d\'édition: valeurs inchangées, pas d\'annonce update', async () => {
		render(<AdminSettings />)

		// créer un utilisateur
		const input = await screen.findByLabelText('Name')
		await userEvent.type(input, 'Alice')
		await userEvent.click(screen.getByRole('button', {name: /Add/i}))
		// annonce création
		await screen.findByText('User created')

		// vérifier ligne et valeurs initiales
		const row = (await screen.findAllByTestId('team-row'))[0]
		expect(within(row).getByText('Alice')).toBeInTheDocument()
		expect(within(row).getByText(/Viewer/i)).toBeInTheDocument()
		expect(within(row).getByText(/Active/i)).toBeInTheDocument()

		// passer en édition, changer, puis annuler
		await userEvent.click(within(row).getByTestId('team-action-edit'))
		await userEvent.selectOptions(within(row).getByTestId('team-edit-role'), 'Editor')
		await userEvent.selectOptions(within(row).getByTestId('team-edit-status'), 'inactive')
		await userEvent.click(within(row).getByTestId('team-action-cancel'))

		// valeurs visibles inchangées
		expect(within(row).getByText(/Viewer/i)).toBeInTheDocument()
		expect(within(row).getByText(/Active/i)).toBeInTheDocument()
		// pas d'annonce update
		expect(screen.getByTestId('team-live-region')).not.toHaveTextContent('User updated')
	})

	test('Édition (save): annonce update et valeurs visibles changent', async () => {
		render(<AdminSettings />)

		// créer un utilisateur
		const input = await screen.findByLabelText('Name')
		await userEvent.type(input, 'Bob')
		await userEvent.click(screen.getByRole('button', {name: /Add/i}))
		await screen.findByText('User created')

		const row = (await screen.findAllByTestId('team-row'))[0]
		await userEvent.click(within(row).getByTestId('team-action-edit'))
		await userEvent.selectOptions(within(row).getByTestId('team-edit-role'), 'Editor')
		await userEvent.selectOptions(within(row).getByTestId('team-edit-status'), 'inactive')
		await userEvent.click(within(row).getByTestId('team-action-save'))

		// annonce + rendu
		await screen.findByText('User updated')
		expect(within(row).getByText(/Editor/i)).toBeInTheDocument()
		expect(within(row).getByText(/Inactive/i)).toBeInTheDocument()
	})

	test('Suppression: confirmation et annonce deleted', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true)
		render(<AdminSettings />)

		const input = await screen.findByLabelText('Name')
		await userEvent.type(input, 'Carl')
		await userEvent.click(screen.getByRole('button', {name: /Add/i}))
		await screen.findByText('User created')

		const row = (await screen.findAllByTestId('team-row'))[0]
		await userEvent.click(within(row).getByTestId('team-action-delete'))

		await screen.findByText('User deleted')
	})
})
