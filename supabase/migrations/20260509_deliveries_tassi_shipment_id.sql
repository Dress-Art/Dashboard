-- =============================================================================
-- DressArt — Migration 8 : ajout deliveries.tassi_shipment_id
--
-- Pré-requis : 20260501_deliveries_tassi_link.sql appliquée
--              (colonnes tassi_package_id / tassi_tracking_number /
--               tassi_payload déjà présentes).
--
-- Pourquoi cette migration séparée :
--   - L'ancienne migration assumait que `tassi_package_id` (bigint) suffisait
--     pour identifier un colis Tassi. Le sondage live de l'API confirme
--     `/packages/{numericId}` mais la doc équipe utilise `shipment_id` text
--     (`shp_*`) comme identifiant canonique.
--   - On ajoute `tassi_shipment_id text` comme nouvelle clé primaire de match
--     côté DressArt (utilisée par le polling et par l'éventuel webhook futur).
--   - `tassi_package_id` reste pour rétro-compat — utilisable comme fallback
--     si l'endpoint /shipments n'est pas exposé.
--
-- Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE public.deliveries
    ADD COLUMN IF NOT EXISTS tassi_shipment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_tassi_shipment_id
    ON public.deliveries(tassi_shipment_id)
    WHERE tassi_shipment_id IS NOT NULL;

COMMENT ON COLUMN public.deliveries.tassi_shipment_id IS
    'ID texte du shipment Tassi (format `shp_*`). Clé canonique côté Tassi pour le polling et les futurs webhooks. Une livraison DressArt ↔ un shipment Tassi (UNIQUE).';

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_deliveries_tassi_shipment_id;
-- ALTER TABLE public.deliveries DROP COLUMN IF EXISTS tassi_shipment_id;
-- COMMIT;
