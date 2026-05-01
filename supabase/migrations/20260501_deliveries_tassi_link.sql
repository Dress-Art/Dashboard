-- =============================================================================
-- DressArt — Migration 7 : liaison `deliveries` ↔ Tassi.pro
--
-- Pré-requis : 20260429_deliveries.sql (table deliveries existe).
--
-- Objectif :
--   Permettre de tracker un Tassi `package` côté DressArt :
--   - tassi_package_id : ID numérique côté Tassi (nullable tant qu'on n'a pas
--                        encore créé le colis chez Tassi)
--   - tassi_tracking_number : numéro public (utilisé pour générer un lien
--                              de tracking dans la modale livraison)
--   - tassi_payload : snapshot brut de la réponse Tassi (pour debug)
--
-- Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE public.deliveries
    ADD COLUMN IF NOT EXISTS tassi_package_id      bigint,
    ADD COLUMN IF NOT EXISTS tassi_tracking_number text,
    ADD COLUMN IF NOT EXISTS tassi_payload         jsonb;

CREATE INDEX IF NOT EXISTS idx_deliveries_tassi_package_id
    ON public.deliveries(tassi_package_id)
    WHERE tassi_package_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_tassi_tracking
    ON public.deliveries(tassi_tracking_number)
    WHERE tassi_tracking_number IS NOT NULL;

COMMENT ON COLUMN public.deliveries.tassi_package_id IS
    'ID numérique du package Tassi (null tant que la livraison n''a pas été créée chez Tassi).';
COMMENT ON COLUMN public.deliveries.tassi_tracking_number IS
    'Tracking number Tassi exposable au client final (lien public sur https://live.tassi.pro/...).';
COMMENT ON COLUMN public.deliveries.tassi_payload IS
    'Snapshot JSONB de la dernière réponse Tassi pour debug + audit.';

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- ALTER TABLE public.deliveries
--     DROP COLUMN IF EXISTS tassi_package_id,
--     DROP COLUMN IF EXISTS tassi_tracking_number,
--     DROP COLUMN IF EXISTS tassi_payload;
-- DROP INDEX IF EXISTS idx_deliveries_tassi_package_id;
-- DROP INDEX IF EXISTS idx_deliveries_tassi_tracking;
-- COMMIT;
