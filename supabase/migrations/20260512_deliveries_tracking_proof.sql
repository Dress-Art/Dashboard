-- =============================================================================
-- DressArt — Migration : enrichissement `deliveries` pour le tracking public
--                       + preuve de livraison (proof) + acquittement client.
--
-- Pré-requis : 20260429_deliveries.sql (table deliveries existe).
--
-- Objectif : permettre un parcours « livraison maison » complet sans Tassi :
--   - chaque livraison expose un token UUID public → lien client
--     `https://www.dressart.studio/track/<tracking_token>`
--   - le livreur peut uploader une preuve (photo signée) à la remise
--   - le client peut acquitter (signed_at + signed_by_name) — donnée juridique
--     si litige
--
-- Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE public.deliveries
    ADD COLUMN IF NOT EXISTS tracking_token uuid
        NOT NULL DEFAULT extensions.uuid_generate_v4(),
    ADD COLUMN IF NOT EXISTS proof_url text,
    ADD COLUMN IF NOT EXISTS signed_at timestamptz,
    ADD COLUMN IF NOT EXISTS signed_by_name text;

-- Index UNIQUE sur le token : utilisé pour résoudre la livraison depuis le
-- lien public, et garantit l'unicité du lien.
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_tracking_token
    ON public.deliveries(tracking_token);

COMMENT ON COLUMN public.deliveries.tracking_token IS
    'UUID public exposé dans https://www.dressart.studio/track/<token> pour le suivi côté client final. Auto-généré à la création.';
COMMENT ON COLUMN public.deliveries.proof_url IS
    'URL de la preuve de remise (photo, signature scannée). Uploadée par le livreur depuis /me/deliveries au moment de marquer la livraison effective.';
COMMENT ON COLUMN public.deliveries.signed_at IS
    'Timestamp de l''acquittement par le client (clic sur le lien tracking ou action livreur). Donnée juridique en cas de litige.';
COMMENT ON COLUMN public.deliveries.signed_by_name IS
    'Nom de la personne ayant réceptionné (si différent du client titulaire de la commande). Saisi par le livreur au moment de la remise.';

-- -----------------------------------------------------------------------------
-- Backfill : générer un tracking_token pour les livraisons existantes
-- (le DEFAULT ne s'applique qu'aux INSERT futurs).
-- -----------------------------------------------------------------------------
UPDATE public.deliveries
   SET tracking_token = extensions.uuid_generate_v4()
 WHERE tracking_token IS NULL;

-- -----------------------------------------------------------------------------
-- Élargir le check status pour autoriser 'failed' en plus des statuts existants
-- (utile pour livraison maison : tentative ratée non irréversible, ≠ 'cancelled').
-- Optionnel — à activer si on veut différencier.
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
-- ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check CHECK (
--     status IN ('pending','assigned','picked_up','in_transit','delivered','cancelled','failed')
-- );

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_deliveries_tracking_token;
-- ALTER TABLE public.deliveries
--     DROP COLUMN IF EXISTS tracking_token,
--     DROP COLUMN IF EXISTS proof_url,
--     DROP COLUMN IF EXISTS signed_at,
--     DROP COLUMN IF EXISTS signed_by_name;
-- COMMIT;
