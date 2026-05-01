-- =============================================================================
-- DressArt — Migration 2 : RLS sur public.clients
--
-- Pré-requis : migration 20260429_orders_lifecycle_and_assignments.sql appliquée.
--
-- Modèle d'accès :
--   admin      → tout (lecture/écriture/suppression)
--   couturier  → ses propres clients (professional_id = auth.uid())
--                + (TODO v2) clients des commandes qui lui sont assignées
--   agent      → les clients qu'il a créés (created_by_agent_id = auth.uid())
--   client     → sa propre fiche (user_id = auth.uid()) en lecture seule
--   livreur    → aucun accès à clients
--
-- Le rôle est lu depuis `auth.jwt() -> 'app_metadata' ->> 'role'`.
-- Idempotente : peut être rejouée sans casse.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper : is_admin() — bypasse les vérifications de rôle dans les policies
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
        false
    );
$$;

-- Helper : current_role() — lit le rôle applicatif depuis le JWT
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        'client'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_role()  TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Activer RLS sur public.clients
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop des éventuelles anciennes policies (idempotent)
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

-- -----------------------------------------------------------------------------
-- SELECT : admin OU propriétaire couturier OU agent créateur OU client lui-même
-- -----------------------------------------------------------------------------
CREATE POLICY "clients_select" ON public.clients
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR professional_id     = auth.uid()
    OR created_by_agent_id = auth.uid()
    OR user_id             = auth.uid()
);

-- -----------------------------------------------------------------------------
-- INSERT : couturier insère pour lui-même, agent doit se marquer créateur
-- -----------------------------------------------------------------------------
CREATE POLICY "clients_insert" ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        public.app_role() = 'couturier'
        AND professional_id = auth.uid()
    )
    OR (
        public.app_role() = 'agent'
        AND created_by_agent_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- UPDATE : admin OU propriétaire OU créateur agent
-- WITH CHECK identique à USING : empêche de transférer le client à un autre
-- propriétaire en passant par UPDATE.
-- -----------------------------------------------------------------------------
CREATE POLICY "clients_update" ON public.clients
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR professional_id     = auth.uid()
    OR created_by_agent_id = auth.uid()
)
WITH CHECK (
    public.is_admin()
    OR professional_id     = auth.uid()
    OR created_by_agent_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- DELETE : admin uniquement (sécurité — on ne perd pas un client par mégarde)
-- -----------------------------------------------------------------------------
CREATE POLICY "clients_delete" ON public.clients
FOR DELETE
TO authenticated
USING (
    public.is_admin()
);

COMMIT;

-- =============================================================================
-- TESTS RAPIDES (à exécuter après migration, en remplaçant <UID>)
-- =============================================================================
-- 1. Voir l'état RLS :
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname = 'clients' AND relnamespace = 'public'::regnamespace;
--    → relrowsecurity doit être TRUE
--
-- 2. Lister les policies actives :
--    SELECT polname, polcmd, polqual, polwithcheck FROM pg_policy
--    WHERE polrelid = 'public.clients'::regclass;
--    → 4 lignes (select/insert/update/delete)
--
-- 3. Test manuel via Supabase Studio (Auth → impersonate user) :
--    a) Connecté en `admin`     → SELECT * FROM clients ; doit tout retourner
--    b) Connecté en `couturier` → ne voit que ses clients (professional_id = uid)
--    c) Connecté en `agent`     → ne voit que les clients qu'il a créés
--    d) Connecté en `livreur`   → liste vide

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "clients_select" ON public.clients;
-- DROP POLICY IF EXISTS "clients_insert" ON public.clients;
-- DROP POLICY IF EXISTS "clients_update" ON public.clients;
-- DROP POLICY IF EXISTS "clients_delete" ON public.clients;
-- ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS public.is_admin();
-- DROP FUNCTION IF EXISTS public.app_role();
-- COMMIT;
