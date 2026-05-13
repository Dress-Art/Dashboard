-- =============================================================================
-- DressArt — Storage bucket `delivery-proofs` + RLS pour preuves de livraison.
--
-- Pré-requis : 20260512_deliveries_tracking_proof.sql (colonne `proof_url`).
--
-- Objectif : permettre au livreur d'uploader une photo (signature, paquet posé
-- sur le pas-de-porte, etc.) depuis /me/deliveries au moment de marquer la
-- livraison `delivered`. L'URL signée est ensuite stockée dans
-- `deliveries.proof_url` et consultable par admin + client via le lien public
-- de tracking.
--
-- Convention path : `<delivery_id>/<filename>`.
-- Idempotente.
-- =============================================================================

BEGIN;

-- 1. Création du bucket (private, signed URLs uniquement).
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS — on s'appuie sur le fait que le path commence par `<delivery_id>/`.
--    L'helper `split_part(name, '/', 1)::uuid` donne le delivery_id.

-- SELECT : admin OU livreur assigné à la delivery correspondante.
DROP POLICY IF EXISTS "delivery_proofs_select" ON storage.objects;
CREATE POLICY "delivery_proofs_select" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'delivery-proofs'
    AND (
        -- admin
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.deliveries d
             WHERE d.id::text = split_part(name, '/', 1)
               AND d.driver_id = auth.uid()
        )
    )
);

-- INSERT : livreur assigné à la delivery uniquement (admin passe par signed URL côté serveur si besoin).
DROP POLICY IF EXISTS "delivery_proofs_insert" ON storage.objects;
CREATE POLICY "delivery_proofs_insert" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'delivery-proofs'
    AND EXISTS (
        SELECT 1 FROM public.deliveries d
         WHERE d.id::text = split_part(name, '/', 1)
           AND d.driver_id = auth.uid()
    )
);

-- UPDATE : livreur propriétaire (au cas où il réuploade).
DROP POLICY IF EXISTS "delivery_proofs_update" ON storage.objects;
CREATE POLICY "delivery_proofs_update" ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'delivery-proofs'
    AND EXISTS (
        SELECT 1 FROM public.deliveries d
         WHERE d.id::text = split_part(name, '/', 1)
           AND d.driver_id = auth.uid()
    )
);

-- DELETE : admin uniquement.
DROP POLICY IF EXISTS "delivery_proofs_delete" ON storage.objects;
CREATE POLICY "delivery_proofs_delete" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'delivery-proofs'
    AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
);

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "delivery_proofs_select" ON storage.objects;
-- DROP POLICY IF EXISTS "delivery_proofs_insert" ON storage.objects;
-- DROP POLICY IF EXISTS "delivery_proofs_update" ON storage.objects;
-- DROP POLICY IF EXISTS "delivery_proofs_delete" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'delivery-proofs';
-- COMMIT;
