-- =============================================================================
-- DressArt — Migration 4 : Réconciliation phone clients ↔ auth.users
--
-- Pré-requis : table public.clients existe (migration 1).
--
-- Objectif :
--   1. Quand on insère/modifie un client CRM avec un phone, lookup automatique
--      dans auth.users par phone (digits-only, 8 derniers chiffres) et set
--      clients.user_id si match trouvé.
--   2. Quand un nouveau user marketplace est créé (via OTP), backfill
--      clients.user_id pour les clients existants matchant son phone.
--
-- Comparaison : 8 derniers digits (numéro local Bénin), insensible aux préfixes
-- pays (+229, 00229, 229) et séparateurs (espaces, points, tirets).
--
-- Idempotente.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper : phone_digits_tail(text) — extrait les N derniers digits
--    Évite de répéter regexp_replace + right() partout.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.phone_digits_tail(p text, n int DEFAULT 8)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p IS NULL OR p = '' THEN ''
        ELSE right(regexp_replace(p, '[^0-9]', '', 'g'), n)
    END;
$$;

-- -----------------------------------------------------------------------------
-- 1. Trigger BEFORE INSERT/UPDATE sur public.clients
--    Si NEW.user_id est NULL et NEW.phone est défini, cherche un auth.users
--    matchant sur les 8 derniers digits.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_client_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    matched_user_id uuid;
    tail text;
BEGIN
    -- Si user_id déjà lié manuellement, ne pas écraser
    IF NEW.user_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    tail := public.phone_digits_tail(NEW.phone, 8);
    IF length(tail) < 8 THEN
        RETURN NEW;
    END IF;

    SELECT u.id INTO matched_user_id
    FROM auth.users u
    WHERE u.phone IS NOT NULL
      AND public.phone_digits_tail(u.phone, 8) = tail
    LIMIT 1;

    IF matched_user_id IS NOT NULL THEN
        NEW.user_id := matched_user_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_client_to_user_trigger ON public.clients;
CREATE TRIGGER match_client_to_user_trigger
    BEFORE INSERT OR UPDATE OF phone ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.match_client_to_user();

COMMENT ON FUNCTION public.match_client_to_user() IS
    'Trigger BEFORE INSERT/UPDATE sur clients : auto-fill user_id si phone matche un auth.users.phone (8 derniers digits).';

-- -----------------------------------------------------------------------------
-- 2. Trigger AFTER INSERT/UPDATE sur auth.users
--    Quand un user marketplace est créé/modifié (changement de phone via OTP),
--    backfill les clients.user_id pour tous les clients dont le phone matche
--    et qui n'ont pas encore de user_id.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_user_to_clients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    tail text;
BEGIN
    tail := public.phone_digits_tail(NEW.phone, 8);
    IF length(tail) < 8 THEN
        RETURN NEW;
    END IF;

    UPDATE public.clients
       SET user_id = NEW.id
     WHERE user_id IS NULL
       AND public.phone_digits_tail(phone, 8) = tail;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_user_to_clients_trigger ON auth.users;
CREATE TRIGGER link_user_to_clients_trigger
    AFTER INSERT OR UPDATE OF phone ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.link_user_to_clients();

COMMENT ON FUNCTION public.link_user_to_clients() IS
    'Trigger AFTER INSERT/UPDATE sur auth.users : backfill clients.user_id pour les clients orphelins matchant le phone.';

-- -----------------------------------------------------------------------------
-- 3. Backfill initial (one-shot) : pour les clients déjà créés sans user_id
-- -----------------------------------------------------------------------------
UPDATE public.clients c
   SET user_id = u.id
  FROM auth.users u
 WHERE c.user_id IS NULL
   AND public.phone_digits_tail(u.phone, 8) = public.phone_digits_tail(c.phone, 8)
   AND public.phone_digits_tail(c.phone, 8) <> ''
   AND length(public.phone_digits_tail(c.phone, 8)) >= 8;

COMMIT;

-- =============================================================================
-- TESTS
-- =============================================================================
-- 1. Vérifier les triggers actifs :
--    SELECT trigger_name, event_object_table FROM information_schema.triggers
--    WHERE trigger_name LIKE '%client%' OR trigger_name LIKE '%user%';
--
-- 2. Test forward (créer client après user) :
--    -- Créer un user de test avec phone (via Auth)
--    -- Puis : INSERT INTO clients (name, phone, professional_id) VALUES ('Test', '+229 61 19 89 41', '<uid>');
--    -- Vérifier : SELECT user_id FROM clients WHERE name = 'Test'; → doit être l'UID du user
--
-- 3. Test reverse (créer user après client) :
--    -- INSERT INTO clients (name, phone, professional_id) VALUES ('Bob', '61 19 89 42', '<uid>');
--    -- Puis créer user via Auth avec phone +22961198942
--    -- Vérifier : SELECT user_id FROM clients WHERE name = 'Bob'; → doit être l'UID du nouveau user
--
-- 4. Test phone trop court (ne matche pas) :
--    -- INSERT INTO clients (name, phone, professional_id) VALUES ('Bug', '123', '<uid>');
--    -- Vérifier : user_id reste NULL (rien à matcher)

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS match_client_to_user_trigger ON public.clients;
-- DROP TRIGGER IF EXISTS link_user_to_clients_trigger ON auth.users;
-- DROP FUNCTION IF EXISTS public.match_client_to_user();
-- DROP FUNCTION IF EXISTS public.link_user_to_clients();
-- DROP FUNCTION IF EXISTS public.phone_digits_tail(text, int);
-- COMMIT;
