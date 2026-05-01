'use client'

import {type ReactNode} from 'react'

/**
 * Layout partagé des pages d'authentification (login, forgot-password,
 * reset-password, not-authorized).
 *
 * Split-screen :
 *   - Gauche : panneau de marque DressArt (caché sur mobile)
 *   - Droite : formulaire centré
 *
 * L'objectif est d'éviter le « dépaysement » entre le dashboard et l'auth :
 * mêmes typographies, même palette N&B, même rounded-xl/lg que le reste.
 */
interface AuthLayoutProps {
    title: string
    subtitle?: string
    children: ReactNode
    /** Petit message en pied de carte (lien retour, etc.). */
    footer?: ReactNode
}

export function AuthLayout({title, subtitle, children, footer}: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex bg-white dark:bg-black">
            {/* Panneau de marque (gauche, caché < lg) */}
            <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black dark:bg-gray-950 text-white">
                {/* Pattern décoratif (cercles diffus) */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/3 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                </div>

                <div className="relative flex flex-col justify-between p-12 w-full">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold text-lg">
                                D
                            </div>
                            <span className="text-xl font-semibold tracking-tight">DressArt</span>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight">
                            L&apos;atelier de couture qui orchestre tout le parcours.
                        </h2>
                        <p className="text-white/70 text-lg leading-relaxed">
                            Commandes, mesures, production, livraisons — gérez tout depuis une seule console.
                        </p>
                        <ul className="space-y-3 text-sm text-white/80">
                            <li className="flex items-start gap-3">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                Suivi de fabrication en 6 étapes
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                Couturiers, agents, vendeurs et livreurs synchronisés
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                Réconciliation auto des clients online / offline
                            </li>
                        </ul>
                    </div>

                    <p className="text-xs text-white/40">
                        © {new Date().getFullYear()} DressArt — Espace professionnel
                    </p>
                </div>
            </aside>

            {/* Panneau formulaire (droite) */}
            <main className="flex-1 flex items-center justify-center px-4 py-12 lg:px-12">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo mobile (visible < lg) */}
                    <div className="lg:hidden flex items-center gap-2 justify-center">
                        <div className="w-9 h-9 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg">
                            D
                        </div>
                        <span className="text-xl font-semibold tracking-tight text-black dark:text-white">DressArt</span>
                    </div>

                    <div className="text-center lg:text-left">
                        <h1 className="text-2xl lg:text-3xl font-bold text-black dark:text-white tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
                        )}
                    </div>

                    <div>{children}</div>

                    {footer && (
                        <div className="text-center lg:text-left text-sm text-gray-600 dark:text-gray-400">
                            {footer}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
