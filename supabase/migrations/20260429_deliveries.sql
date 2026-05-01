-- =============================================================================
-- DressArt — Migration 3 : Table `deliveries` + RLS
--
-- Pré-requis : migrations 20260429_orders_lifecycle_and_assignments.sql
--              et 20260429_rls_clients.sql appliquées (helper is_admin existe).
--
-- Modèle :
--   - 1 livraison = 1 commande (FK orders.id, ON DELETE CASCADE)
--   - status aligné sur DeliveryStatus côté front (6 valeurs)
--   - tracking_info JSONB pour contextuel (current_location, ETA, photos)
--   - Snapshot adresse/nom : si le client est modifié plus tard, l'historique
--     livraison reste cohérent
--
-- Idempotente : peut être rejouée.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Table deliveries
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Snapshot client au moment de la création (résiste à la modif/suppression)
    customer_name    text NOT NULL,
    customer_phone   text,
    customer_address text NOT NULL,

    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled'
    )),
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN (
        'low', 'normal', 'high', 'urgent'
    )),

    estimated_time       timestamptz,
    actual_delivery_time timestamptz,
    notes                text,
    tracking_info        jsonb DEFAULT '{}'::jsonb,

    assigned_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id  ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON public.deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status    ON public.deliveries(status);

-- Trigger updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        DROP TRIGGER IF EXISTS set_deliveries_updated_at ON public.deliveries;
        CREATE TRIGGER set_deliveries_updated_at
            BEFORE UPDATE ON public.deliveries
            FOR EACH ROW
            EXECUTE FUNCTION handle_updated_at();
    END IF;
END$$;

COMMENT ON TABLE public.deliveries IS
    'Livraisons DressArt. 1 livraison = 1 commande. Snapshot adresse/nom client au moment de l''assignation pour résister aux modifs ultérieures.';
COMMENT ON COLUMN public.deliveries.tracking_info IS
    'JSONB libre : { current_location, estimated_arrival, delivery_notes, photo_urls, ... }';

-- -----------------------------------------------------------------------------
-- 2. RLS
--    admin   → tout
--    livreur → ses livraisons (driver_id = auth.uid()), transitions forward
--    couturier/agent/client → pas d'accès direct (commande via orders)
-- -----------------------------------------------------------------------------

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_delete" ON public.deliveries;

-- SELECT : admin OU livreur assigné
CREATE POLICY "deliveries_select" ON public.deliveries
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR driver_id = auth.uid()
);

-- INSERT : admin uniquement (création de la livraison à l'assignation)
CREATE POLICY "deliveries_insert" ON public.deliveries
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- UPDATE : admin OU livreur sur sa propre livraison (si pas déjà delivered/cancelled)
CREATE POLICY "deliveries_update" ON public.deliveries
FOR UPDATE TO authenticated
USING (
    public.is_admin()
    OR (driver_id = auth.uid() AND status IN ('assigned', 'picked_up', 'in_transit'))
)
WITH CHECK (
    public.is_admin()
    OR (driver_id = auth.uid() AND status IN ('picked_up', 'in_transit', 'delivered'))
);

-- DELETE : admin uniquement
CREATE POLICY "deliveries_delete" ON public.deliveries
FOR DELETE TO authenticated
USING (public.is_admin());

COMMIT;

-- =============================================================================
-- TESTS
-- =============================================================================
-- 1. Vérifier les colonnes :
--    \d public.deliveries
--
-- 2. Vérifier RLS et policies :
--    SELECT relrowsecurity FROM pg_class WHERE relname = 'deliveries';
--    SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid = 'public.deliveries'::regclass;
--
-- 3. Insérer une livraison (en admin) :
--    INSERT INTO deliveries (order_id, customer_name, customer_address)
--    SELECT id, customer_name, COALESCE(specific_location, location, 'à préciser')
--    FROM orders WHERE status = 'ready_for_delivery' LIMIT 1;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.deliveries CASCADE;
-- COMMIT;
