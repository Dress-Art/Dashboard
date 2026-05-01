-- =============================================================================
-- DressArt — Migration 1 : Suivi de fabrication + CRM clients
--
-- À appliquer dans Supabase Studio (SQL Editor) ou via supabase CLI :
--   supabase db push
--
-- Effets :
-- 0. Crée la table `clients` si absente (CRM dashboard couturier/agent)
-- 1. Étend orders.status à 8 valeurs (6 étapes de fabrication + livré + annulé)
-- 2. Backfill des anciens statuts (in_progress → sewing, completed → delivered)
-- 3. Ajoute orders.client_id (FK vers clients) pour les commandes offline
-- 4. Garantit clients.created_by_agent_id (suivi par l'agent)
--
-- Idempotente : peut être rejouée sans casse.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Créer la table `clients` (CRM dashboard) si absente
--    Spec : un client peut exister sans compte marketplace (auth.users).
--    `phone` est la clé naturelle de réconciliation (toujours normaliser
--    via digits-only avant comparaison côté code).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    address text,
    city text,
    postal_code text,
    notes text,
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended')),
    -- Couturier propriétaire du dossier client (vue CRM atelier)
    professional_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Réconciliation avec compte marketplace (rempli si phone matche auth.users.phone)
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Agent qui a créé ce client (sera ajouté dans la section 4 si table préexistante)
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_phone           ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_professional_id ON public.clients(professional_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id         ON public.clients(user_id);

-- Trigger updated_at (réutilise handle_updated_at déjà utilisée par orders)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
        CREATE TRIGGER set_clients_updated_at
            BEFORE UPDATE ON public.clients
            FOR EACH ROW
            EXECUTE FUNCTION handle_updated_at();
    END IF;
END$$;

COMMENT ON TABLE  public.clients IS
    'CRM dashboard : clients enregistrés par couturier ou agent. Peuvent ne pas avoir de compte marketplace (auth.users) — réconciliation via phone digits-only.';
COMMENT ON COLUMN public.clients.phone IS
    'Format mixte accepté en stockage (E164, local, etc.). TOUJOURS normaliser via regexp_replace(phone, ''[^0-9]'', '''', ''g'') avant comparaison.';
COMMENT ON COLUMN public.clients.professional_id IS
    'Couturier propriétaire du dossier client (vue CRM atelier).';
COMMENT ON COLUMN public.clients.user_id IS
    'Compte marketplace lié si réconciliation phone réussie. NULL = client offline pur.';

-- -----------------------------------------------------------------------------
-- 1. Migrer le check constraint orders.status (4 → 8 valeurs)
-- -----------------------------------------------------------------------------

-- Drop l'ancien check
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Backfill : mapper les anciennes valeurs vers les nouvelles
-- 'confirmed'   → 'confirmed'   (inchangé, étape 1)
-- 'in_progress' → 'sewing'      (étape 4 : couture en cours)
-- 'completed'   → 'delivered'   (état terminal succès)
-- 'cancelled'   → 'cancelled'   (inchangé)
UPDATE public.orders SET status = 'sewing'    WHERE status = 'in_progress';
UPDATE public.orders SET status = 'delivered' WHERE status = 'completed';

-- Re-add le check avec les 8 nouvelles valeurs
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
    status = ANY (ARRAY[
        'confirmed'::text,              -- 1. Commande confirmée
        'paid'::text,                   -- 2. Paiement reçu
        'measurements_validated'::text, -- 3. Mesures validées
        'sewing'::text,                 -- 4. Couture en cours
        'finishing'::text,              -- 5. Finitions
        'ready_for_delivery'::text,     -- 6. Prêt pour livraison
        'delivered'::text,              -- terminal succès
        'cancelled'::text               -- terminal échec
    ])
);

-- -----------------------------------------------------------------------------
-- 2. Ajouter orders.client_id (CRM offline)
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS client_id uuid
        REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_client_id
    ON public.orders(client_id);

COMMENT ON COLUMN public.orders.client_id IS
    'Lien vers clients (CRM dashboard) pour commandes offline. NULL = commande online via marketplace.';

-- -----------------------------------------------------------------------------
-- 4. Garantir clients.created_by_agent_id (idempotent même si table préexiste)
-- -----------------------------------------------------------------------------

ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS created_by_agent_id uuid
        REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_created_by_agent_id
    ON public.clients(created_by_agent_id);

COMMENT ON COLUMN public.clients.created_by_agent_id IS
    'Agent qui a enregistré ce client (différent de professional_id = couturier propriétaire). Permet à l''agent de filtrer ses commandes via clients.created_by_agent_id.';

COMMIT;

-- =============================================================================
-- ROLLBACK (à garder pour info, NE PAS exécuter)
-- =============================================================================
-- BEGIN;
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- UPDATE public.orders SET status = 'in_progress' WHERE status IN ('paid','measurements_validated','sewing','finishing','ready_for_delivery');
-- UPDATE public.orders SET status = 'completed'   WHERE status = 'delivered';
-- ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
--     status = ANY (ARRAY['confirmed','in_progress','completed','cancelled'])
-- );
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS client_id;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS created_by_agent_id;
-- -- DROP TABLE public.clients;  -- attention : destructif. À ne lancer que si la table était vide avant migration.
-- COMMIT;
