# E2E authentifiés — TODO de mise en place

Les specs sous `e2e/` couvrent actuellement uniquement les flows publics et la
redirection des routes protégées. Pour valider le **parcours commande complet**
(commande confirmée → mesures validées → couture → livraison) en E2E, il faut
mettre en place une infrastructure d'auth de test.

## Étape 1 — Comptes de test

Provisionner dans le projet Supabase de test (idéalement séparé de prod) :

```sql
-- Admin
SELECT auth.users_create('admin.e2e@dressart.test', 'TestPass123!');
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
 WHERE email = 'admin.e2e@dressart.test';

-- Couturier (1 modèle qui lui appartient)
SELECT auth.users_create('couturier.e2e@dressart.test', 'TestPass123!');
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"couturier"}'::jsonb
 WHERE email = 'couturier.e2e@dressart.test';

-- Vendeur, agent, livreur — idem
```

## Étape 2 — Storage state Playwright

Créer un setup global qui se logge une fois et stocke la session :

```ts
// e2e/setup/auth.setup.ts
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

setup('auth admin', async ({ page }) => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase.auth.signInWithPassword({
        email: 'admin.e2e@dressart.test',
        password: 'TestPass123!',
    })
    // Injecter la session dans le storage Playwright
    await page.context().addCookies([{
        name: 'sb-access-token',
        value: data.session!.access_token,
        domain: 'localhost',
        path: '/',
    }])
    await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
```

Référencer dans `playwright.config.ts` :

```ts
projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'admin', use: { storageState: 'e2e/.auth/admin.json' }, dependencies: ['setup'] },
    { name: 'couturier', use: { storageState: 'e2e/.auth/couturier.json' }, dependencies: ['setup'] },
]
```

## Étape 3 — Specs à écrire

1. **Flow commande de bout en bout (admin)** : ouvrir une commande payée, valider mesures, transition `paid → measurements_validated → sewing → finishing → ready_for_delivery`, vérifier qu'une livraison est auto-créée
2. **Couturier voit ses commandes uniquement** : login couturier, ouvrir Orders, vérifier que seules les commandes utilisant un modèle qui lui appartient sont listées
3. **Vendeur voit ses commandes uniquement** : login vendeur, idem mais filtre via `fabric_id`
4. **CRUD client (couturier)** : créer un client, vérifier qu'il apparaît dans le listing, le supprimer, vérifier qu'il disparaît
5. **CRUD tissu (vendeur)** : créer un tissu, modifier son prix, vérifier qu'un autre vendeur ne peut pas le modifier (RLS)
6. **Sidebar RBAC** : pour chaque rôle, vérifier la liste exacte des modules visibles dans la sidebar

## Étape 4 — Cleanup

Chaque test devrait nettoyer ses données pour ne pas polluer le projet de test :

```ts
test.afterEach(async () => {
    // delete clients/tissus/orders créés pendant le test
})
```

Ou alors : projet Supabase dédié rebuilt avant chaque CI run.
