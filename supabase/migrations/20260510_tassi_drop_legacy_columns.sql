-- =============================================================================
-- DressArt — Migration 9 : drop des colonnes Tassi spéculatives sur `deliveries`
--
-- Pré-requis : migrations 20260501_deliveries_tassi_link.sql et
--              20260509_deliveries_tassi_shipment_id.sql appliquées.
--
-- Pourquoi : les colonnes `tassi_*` ajoutées à `deliveries` ne respectaient pas
-- la spec officielle Tassi. La spec (§4.2) impose une **table dédiée
-- `tassi_shipments`** pour orchestrer le polling, l'historique de statuts, la
-- liaison avec la commande, et la double validation Dress Art (Tassi atteste
-- la remise + client confirme la conformité).
--
-- Cette migration retire les colonnes spéculatives. La table `tassi_shipments`
-- est créée par la migration suivante (20260510_tassi_shipments_table.sql).
--
-- Idempotente.
-- =============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_deliveries_tassi_shipment_id;
DROP INDEX IF EXISTS idx_deliveries_tassi_package_id;
DROP INDEX IF EXISTS idx_deliveries_tassi_tracking;

ALTER TABLE public.deliveries
    DROP COLUMN IF EXISTS tassi_shipment_id,
    DROP COLUMN IF EXISTS tassi_package_id,
    DROP COLUMN IF EXISTS tassi_tracking_number,
    DROP COLUMN IF EXISTS tassi_payload;

COMMIT;

-- =============================================================================
-- ROLLBACK (à appliquer uniquement si la migration suivante n'a pas tourné)
-- =============================================================================
-- BEGIN;
-- ALTER TABLE public.deliveries
--     ADD COLUMN IF NOT EXISTS tassi_shipment_id text,
--     ADD COLUMN IF NOT EXISTS tassi_package_id bigint,
--     ADD COLUMN IF NOT EXISTS tassi_tracking_number text,
--     ADD COLUMN IF NOT EXISTS tassi_payload jsonb;
-- COMMIT;
