This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## DashCraft – Documentation rapide

### Scripts
- `npm run dev` démarre le serveur de dev (App Router)
- `npm run build` construit l’app
- `npm run start` lance l’app buildée
- `npm run lint` exécute ESLint (config Next.js)
- `npm run test` lance la suite Vitest (jsdom)

### Internationalisation (next-intl)
- Messages: `src/messages/fr.json`, `src/messages/en.json`
- Détection via cookie `NEXT_LOCALE` (pas de préfixe d’URL)
- Switch langue dans `Topbar` (boutons FR/EN)

### Thème et icônes
- Thème sombre par défaut, toggle dans `Topbar`
- Icônes HeroIcons via `src/lib/icons.tsx` avec fallback outline côté SSR
  pour éviter toute divergence d’hydratation

### Drag & Drop (dnd-kit)
- Grille: `src/components/dashboard/DraggableGrid.tsx`
- Import client-only via `DraggableGridClient` pour éviter SSR mismatch

### Données mockées déterministes
- Faker seedé (`faker.seed(42)`) dans les modules mockés
- Dates au format ISO (`toISOString`) pour stabilité SSR/CSR

### Tests & Accessibilité
- Vitest + Testing Library + jest-axe (`vitest.setup.ts`)
- Tests d’intégration: Users, Notifications, Analytics, Icon, Topbar, DraggableGrid
- A11y: assertions `axe` pour WCAG de base

### Configuration Dashboard
- Fichier central: `src/config/dashboard.json` (ordre/visibilité des modules)

### Dépannage
- Avertissement lockfiles multiples: conservez `dashcraft-app/package-lock.json` et
  supprimez les autres lockfiles parents pour éviter les warnings npm.
