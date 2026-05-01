-- =============================================================================
-- DressArt — Migration 5 : tissus.vendor_id + RLS catalogue tissus
--
-- Pré-requis : table public.tissus existe (DDL initial fourni),
--              helper public.is_admin() / public.app_role() (migration 2).
--
-- Modèle :
--   - chaque tissu a un vendor_id (FK auth.users) — propriétaire/créateur
--   - SELECT : ouvert à admin + vendeur + couturier (catalogue partagé)
--   - INSERT/UPDATE : admin OU vendeur sur ses propres tissus
--   - DELETE : admin uniquement
--
-- Idempotente.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Ajouter vendor_id (propriétaire du tissu)
-- -----------------------------------------------------------------------------

ALTER TABLE public.tissus
    ADD COLUMN IF NOT EXISTS vendor_id uuid
        REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tissus_vendor_id
    ON public.tissus(vendor_id);

COMMENT ON COLUMN public.tissus.vendor_id IS
    'Vendeur propriétaire du tissu. NULL = legacy ou tissu admin générique. RLS s''appuie dessus pour limiter les opérations vendeur à ses propres tissus.';

-- -----------------------------------------------------------------------------
-- 2. Activer RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.tissus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tissus_select" ON public.tissus;
DROP POLICY IF EXISTS "tissus_insert" ON public.tissus;
DROP POLICY IF EXISTS "tissus_update" ON public.tissus;
DROP POLICY IF EXISTS "tissus_delete" ON public.tissus;

-- SELECT : catalogue partagé pour admin + vendeur + couturier + agent
-- (Le client final voit le catalogue côté marketplace, pas via dashboard.)
CREATE POLICY "tissus_select" ON public.tissus
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR public.app_role() IN ('vendeur', 'couturier', 'agent')
);

-- INSERT : admin OU vendeur qui s'attribue le tissu (vendor_id = auth.uid())
CREATE POLICY "tissus_insert" ON public.tissus
FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        public.app_role() = 'vendeur'
        AND vendor_id = auth.uid()
    )
);

-- UPDATE : admin OU vendeur sur ses propres tissus.
-- WITH CHECK identique : interdit de transférer un tissu à un autre vendeur via UPDATE.
CREATE POLICY "tissus_update" ON public.tissus
FOR UPDATE TO authenticated
USING (
    public.is_admin()
    OR (public.app_role() = 'vendeur' AND vendor_id = auth.uid())
)
WITH CHECK (
    public.is_admin()
    OR (public.app_role() = 'vendeur' AND vendor_id = auth.uid())
);

-- DELETE : admin uniquement
CREATE POLICY "tissus_delete" ON public.tissus
FOR DELETE TO authenticated
USING (public.is_admin());

COMMIT;

-- =============================================================================
-- TESTS
-- =============================================================================
-- 1. Vérifier la colonne et l'index :
--    \d public.tissus
--
-- 2. Vérifier RLS et policies :
--    SELECT relrowsecurity FROM pg_class WHERE relname = 'tissus';
--    SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid = 'public.tissus'::regclass;
--
-- 3. Tester en tant que vendeur (impersonate via Studio) :
--    -- INSERT : doit accepter avec vendor_id = mon uid, refuser sinon
--    INSERT INTO tissus (nom, prix_metre, vendor_id) VALUES ('Bazin riche', 12500, auth.uid());
--    -- UPDATE : ne doit pouvoir modifier que ses propres tissus
--    UPDATE tissus SET prix_metre = 13000 WHERE nom = 'Bazin riche';
--    -- DELETE : doit échouer
--    DELETE FROM tissus WHERE nom = 'Bazin riche';
--
-- 4. Tester en tant que couturier : SELECT OK, INSERT/UPDATE/DELETE rejetés.

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "tissus_select" ON public.tissus;
-- DROP POLICY IF EXISTS "tissus_insert" ON public.tissus;
-- DROP POLICY IF EXISTS "tissus_update" ON public.tissus;
-- DROP POLICY IF EXISTS "tissus_delete" ON public.tissus;
-- ALTER TABLE public.tissus DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tissus DROP COLUMN IF EXISTS vendor_id;
-- COMMIT;
