'use client'

import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {useAuthContext} from '@/contexts/AuthContext'
import {AuthLayout} from '@/components/layout/AuthLayout'
import {ROLE_LABELS_FR} from '@/lib/roles'
import {notify} from '@/lib/toast'

/**
 * Affichée quand un utilisateur authentifié n'a pas de rôle professionnel.
 * Cas typiques :
 *   - compte créé via la marketplace (rôle `client` ou pas de rôle)
 *   - compte qui n'a pas encore été provisionné par un admin
 */
export default function NotAuthorizedPage() {
    const router = useRouter()
    const {user, role, signOut} = useAuthContext()

    const handleSignOut = async () => {
        try {
            await signOut()
            notify.success('Déconnecté')
            router.push('/login')
        } catch (err) {
            notify.error(err)
        }
    }

    return (
        <AuthLayout
            title="Accès non autorisé"
            subtitle="Le dashboard DressArt est réservé aux professionnels (couturier, agent, livreur, vendeur, admin)."
            footer={
                <Link href="/login" className="font-medium text-black dark:text-white hover:underline">
                    ← Retour à la page de connexion
                </Link>
            }
        >
            <div className="space-y-4">
                {user && (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm space-y-1">
                        <p className="text-gray-600 dark:text-gray-400">Compte connecté :</p>
                        <p className="font-medium text-black dark:text-white truncate">{user.email || user.phone}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Rôle détecté :{' '}
                            <span className="font-medium">
                                {role ? ROLE_LABELS_FR[role] : 'Aucun rôle assigné'}
                            </span>
                        </p>
                    </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl text-sm">
                    Si tu penses que c&apos;est une erreur, demande à un administrateur DressArt de te
                    provisionner avec le bon rôle (couturier, agent, vendeur ou livreur).
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold transition-colors"
                >
                    Se déconnecter
                </button>
            </div>
        </AuthLayout>
    )
}
