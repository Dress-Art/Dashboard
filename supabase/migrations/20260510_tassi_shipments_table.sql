-- =============================================================================
-- DressArt — Migration 10 : table `tassi_shipments` + colonnes orders
--
-- Pré-requis :
--   - 20260510_tassi_drop_legacy_columns.sql (drop des colonnes spéculatives)
--   - Helper public.is_admin() / public.app_role() (migration 2)
--
-- Crée la structure exacte définie par la spec Tassi/DressArt §4.2 :
--   1. Colonnes manquantes sur `orders` : couturier_confection_completed_at,
--      agent_id (si pas déjà présent)
--   2. Table `tassi_shipments` : orchestration shipment Tassi + double
--      validation Dress Art (Tassi delivered + confirmation client)
--   3. Index partiels pour le polling (spec §4.2)
--   4. RLS basique : admin tout, couturier ses shipments, agent ses
--      affiliés, client le sien (lecture seule)
--
-- Idempotente.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Colonnes orders requises pour le one-click (spec §4.1)
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS couturier_confection_completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_agent_id
    ON public.orders(agent_id)
    WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.orders.couturier_confection_completed_at IS
    'Timestamp ISO du clic « Confection terminée » par le couturier. Pré-condition au one-click livraison (spec §6.1).';
COMMENT ON COLUMN public.orders.agent_id IS
    'Agent affilié au client de cette commande, si applicable. Permet l''autorisation agent dans assertCanLaunchDelivery (spec §6.6).';

-- -----------------------------------------------------------------------------
-- 2. Table tassi_shipments — spec §4.2 (verbatim)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tassi_shipments (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tassi_id text UNIQUE NOT NULL,
    client_reference text UNIQUE NOT NULL,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

    -- Acteurs
    couturier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_by_role text NOT NULL CHECK (created_by_role IN ('couturier', 'agent', 'admin')),

    -- Statut côté Tassi (alimenté par polling) — 9 valeurs de la spec §9.1
    tassi_status text NOT NULL CHECK (tassi_status IN (
        'created',
        'label_generated',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'exception',
        'returned',
        'canceled'
    )),
    tassi_status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    carrier_code text,
    tracking_url text,
    label_url text,
    tassi_delivered_at timestamptz,

    -- Statut côté Dress Art (validation client) — spec §5.1
    client_confirmed_at timestamptz,
    client_confirmed_tacit boolean NOT NULL DEFAULT false,
    client_disputed_at timestamptz,
    client_dispute_reason text,
    tacit_confirm_due_at timestamptz,

    -- Statut métier global — 7 valeurs spec §5.1
    delivery_status text NOT NULL CHECK (delivery_status IN (
        'preparing',
        'shipping_created',
        'in_delivery',
        'awaiting_client_confirmation',
        'confirmed',
        'disputed',
        'delivery_failed'
    )),

    -- Saisie minimale couturier (champ optionnel — spec §6.7)
    couturier_notes text,

    -- Pilotage du polling Tassi
    last_polled_at timestamptz,
    next_poll_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    poll_attempts int NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,

    raw_payload jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index partiels — spec §4.2
CREATE INDEX IF NOT EXISTS idx_tassi_shipments_next_poll
    ON public.tassi_shipments(next_poll_at)
    WHERE is_terminal = false;

CREATE INDEX IF NOT EXISTS idx_tassi_shipments_tacit_due
    ON public.tassi_shipments(tacit_confirm_due_at)
    WHERE delivery_status = 'awaiting_client_confirmation';

CREATE INDEX IF NOT EXISTS idx_tassi_shipments_order_id
    ON public.tassi_shipments(order_id);

CREATE INDEX IF NOT EXISTS idx_tassi_shipments_couturier_id
    ON public.tassi_shipments(couturier_id);

CREATE INDEX IF NOT EXISTS idx_tassi_shipments_agent_id
    ON public.tassi_shipments(agent_id)
    WHERE agent_id IS NOT NULL;

-- Trigger updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        DROP TRIGGER IF EXISTS set_tassi_shipments_updated_at ON public.tassi_shipments;
        CREATE TRIGGER set_tassi_shipments_updated_at
            BEFORE UPDATE ON public.tassi_shipments
            FOR EACH ROW
            EXECUTE FUNCTION handle_updated_at();
    END IF;
END$$;

COMMENT ON TABLE public.tassi_shipments IS
    'Orchestration des envois Tassi avec double validation Dress Art (Tassi atteste la remise + client confirme la conformité). 1 ligne par commande Dress Art. Polling toutes les 5 min via cron.';

-- -----------------------------------------------------------------------------
-- 3. RLS — spec §10 (sécurité non négociable)
-- -----------------------------------------------------------------------------

ALTER TABLE public.tassi_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tassi_shipments_select" ON public.tassi_shipments;
DROP POLICY IF EXISTS "tassi_shipments_insert" ON public.tassi_shipments;
DROP POLICY IF EXISTS "tassi_shipments_update" ON public.tassi_shipments;
DROP POLICY IF EXISTS "tassi_shipments_delete" ON public.tassi_shipments;

-- SELECT : admin OU couturier propriétaire OU agent affilié OU client de l'order
CREATE POLICY "tassi_shipments_select" ON public.tassi_shipments
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR couturier_id = auth.uid()
    OR agent_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = public.tassi_shipments.order_id
          AND o.user_id = auth.uid()
    )
);

-- INSERT : admin OU couturier propriétaire OU agent affilié.
-- L'utilisateur doit s'inscrire lui-même comme `created_by_user_id` (anti-spoofing).
CREATE POLICY "tassi_shipments_insert" ON public.tassi_shipments
FOR INSERT TO authenticated
WITH CHECK (
    created_by_user_id = auth.uid()
    AND (
        public.is_admin()
        OR (public.app_role() = 'couturier' AND couturier_id = auth.uid())
        OR (public.app_role() = 'agent' AND agent_id = auth.uid())
    )
);

-- UPDATE : admin (polling cron) OU client confirmation (le client ne touche
-- que ses propres ordres, voir routes /api/deliveries/[id]/confirm|dispute
-- qui font la vérification ownership avant l'UPDATE).
-- Pour simplifier : seul l'admin via service role peut UPDATE — les actions
-- client passent par les routes API qui s'authentifient en service role.
CREATE POLICY "tassi_shipments_update" ON public.tassi_shipments
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE : admin uniquement
CREATE POLICY "tassi_shipments_delete" ON public.tassi_shipments
FOR DELETE TO authenticated
USING (public.is_admin());

COMMIT;

-- =============================================================================
-- TESTS
-- =============================================================================
-- 1. Vérifier la table :
--    \d public.tassi_shipments
--
-- 2. Vérifier RLS active :
--    SELECT relrowsecurity FROM pg_class WHERE relname = 'tassi_shipments';
--    SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid = 'public.tassi_shipments'::regclass;
--
-- 3. Vérifier les nouvelles colonnes orders :
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'orders'
--      AND column_name IN ('couturier_confection_completed_at', 'agent_id');

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.tassi_shipments CASCADE;
-- ALTER TABLE public.orders
--     DROP COLUMN IF EXISTS couturier_confection_completed_at,
--     DROP COLUMN IF EXISTS agent_id;
-- COMMIT;
