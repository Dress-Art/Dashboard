-- =============================================================================
-- DressArt — RLS sur `modeles` : couturier propriétaire (via professional_profiles),
-- lecture publique (le catalogue marketplace doit pouvoir afficher les modèles).
--
-- Pré-requis : la table `professional_profiles` existe avec une row par
-- couturier (auto-créée par le helper getMyProfessionalProfileId() côté code).
-- Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE public.modeles ENABLE ROW LEVEL SECURITY;

-- SELECT : public (la marketplace côté front consomme via anon key).
DROP POLICY IF EXISTS "modeles_public_select" ON public.modeles;
CREATE POLICY "modeles_public_select" ON public.modeles
FOR SELECT
USING (true);

-- INSERT : couturier sur ses propres modèles (professional_id ∈ ses profils).
DROP POLICY IF EXISTS "modeles_owner_insert" ON public.modeles;
CREATE POLICY "modeles_owner_insert" ON public.modeles
FOR INSERT
WITH CHECK (
    professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- UPDATE : idem.
DROP POLICY IF EXISTS "modeles_owner_update" ON public.modeles;
CREATE POLICY "modeles_owner_update" ON public.modeles
FOR UPDATE
USING (
    professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- DELETE : idem.
DROP POLICY IF EXISTS "modeles_owner_delete" ON public.modeles;
CREATE POLICY "modeles_owner_delete" ON public.modeles
FOR DELETE
USING (
    professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

COMMIT;
