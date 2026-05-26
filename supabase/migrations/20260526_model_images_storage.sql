-- =============================================================================
-- DressArt — Storage bucket public `model-images` pour la vitrine des modèles.
--
-- Objectif : chaque couturier peut uploader 1 image par modèle (photo du
-- vêtement) depuis le dashboard. Le bucket est public en lecture pour que la
-- marketplace puisse afficher l'image sans signed URL.
--
-- Path convention : `<professional_id>/<model_id>/<filename>`.
-- RLS : INSERT/UPDATE/DELETE limités au couturier propriétaire ; admin tout.
-- Idempotente.
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('model-images', 'model-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- SELECT : public (lecture ouverte — la marketplace consomme les URLs).
DROP POLICY IF EXISTS "model_images_public_select" ON storage.objects;
CREATE POLICY "model_images_public_select" ON storage.objects
FOR SELECT
USING (bucket_id = 'model-images');

-- INSERT : couturier sur ses propres modèles (path commence par son user_id) OU admin.
DROP POLICY IF EXISTS "model_images_owner_insert" ON storage.objects;
CREATE POLICY "model_images_owner_insert" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'model-images'
    AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
);

-- UPDATE : mêmes règles que INSERT.
DROP POLICY IF EXISTS "model_images_owner_update" ON storage.objects;
CREATE POLICY "model_images_owner_update" ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'model-images'
    AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
);

-- DELETE : idem.
DROP POLICY IF EXISTS "model_images_owner_delete" ON storage.objects;
CREATE POLICY "model_images_owner_delete" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'model-images'
    AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
);

COMMIT;
