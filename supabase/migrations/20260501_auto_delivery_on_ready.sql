-- =============================================================================
-- DressArt — Migration 6 : auto-création delivery quand order → ready_for_delivery
--
-- Pré-requis :
--   - migration 20260429_orders_lifecycle_and_assignments.sql (status enum 8)
--   - migration 20260429_deliveries.sql (table deliveries)
--
-- Objectif :
--   Quand le statut d'une commande passe à 'ready_for_delivery', insérer
--   automatiquement une ligne dans `deliveries` (status='pending') si aucune
--   n'existe déjà pour cette commande. Évite que l'admin doive créer la
--   livraison à la main.
--
-- Idempotence :
--   - Trigger AFTER UPDATE OF status (évite les triggers en cascade sur INSERT)
--   - INSERT conditionnel via NOT EXISTS → rejouable sans casse
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_delivery_on_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ne déclencher que sur la transition vers 'ready_for_delivery'
    IF NEW.status = 'ready_for_delivery' AND COALESCE(OLD.status, '') <> 'ready_for_delivery' THEN
        -- Idempotence : 1 livraison max par commande
        IF NOT EXISTS (
            SELECT 1 FROM public.deliveries WHERE order_id = NEW.id
        ) THEN
            INSERT INTO public.deliveries (
                order_id,
                customer_name,
                customer_phone,
                customer_address,
                status,
                priority
            ) VALUES (
                NEW.id,
                NEW.customer_name,
                NEW.customer_phone,
                COALESCE(NEW.specific_location, NEW.location, 'Adresse à préciser'),
                'pending',
                'normal'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_delivery_on_ready_trigger ON public.orders;
CREATE TRIGGER create_delivery_on_ready_trigger
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.create_delivery_on_ready();

COMMENT ON FUNCTION public.create_delivery_on_ready() IS
    'Trigger AFTER UPDATE OF status sur orders : crée une livraison pending si la commande passe à ready_for_delivery (idempotent).';

-- -----------------------------------------------------------------------------
-- Backfill : créer les livraisons pour les commandes déjà en ready_for_delivery
--            qui n'en ont pas encore (one-shot à l'application de la migration).
-- -----------------------------------------------------------------------------

INSERT INTO public.deliveries (
    order_id, customer_name, customer_phone, customer_address, status, priority
)
SELECT
    o.id,
    o.customer_name,
    o.customer_phone,
    COALESCE(o.specific_location, o.location, 'Adresse à préciser'),
    'pending',
    'normal'
FROM public.orders o
WHERE o.status = 'ready_for_delivery'
  AND NOT EXISTS (
      SELECT 1 FROM public.deliveries d WHERE d.order_id = o.id
  );

COMMIT;

-- =============================================================================
-- TESTS
-- =============================================================================
-- 1. Forcer une commande à ready_for_delivery (en admin) :
--    UPDATE orders SET status = 'ready_for_delivery' WHERE order_number = 'XXX';
--    SELECT id, order_id, status FROM deliveries WHERE order_id =
--        (SELECT id FROM orders WHERE order_number = 'XXX');
--    → 1 ligne pending
--
-- 2. Re-trigger (pas de doublon) :
--    UPDATE orders SET status = 'sewing' WHERE order_number = 'XXX';
--    UPDATE orders SET status = 'ready_for_delivery' WHERE order_number = 'XXX';
--    → toujours 1 seule livraison

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS create_delivery_on_ready_trigger ON public.orders;
-- DROP FUNCTION IF EXISTS public.create_delivery_on_ready();
-- COMMIT;
