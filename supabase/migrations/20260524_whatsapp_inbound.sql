-- =============================================================================
-- DressArt — Historique des messages WhatsApp entrants (Evolution API).
--
-- Objectif : permettre au module Chats côté dashboard d'afficher
--   - un inbox groupé par numéro,
--   - la trace de chaque message (commande ou texte libre) reçu,
--   - les commandes reconnues (CLAIM, PICKUP, etc.) avec le résultat.
--
-- Les outbound sont déjà persistés dans `notifications_log` (channel='whatsapp')
-- côté serveur, pas besoin d'une seconde table pour ça.
--
-- Idempotente.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_messages (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    from_phone text NOT NULL,
    body text,
    media_url text,
    /** Identifiant de la commande reconnue (claim_order / delivery_status) ou NULL. */
    command_type text,
    /** Résumé du traitement webhook : 'handled' | 'ignored:<reason>'. */
    handled_status text,
    raw_payload jsonb,
    received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_received_at
    ON public.whatsapp_inbound_messages (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_from_phone
    ON public.whatsapp_inbound_messages (from_phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_command_type
    ON public.whatsapp_inbound_messages (command_type)
    WHERE command_type IS NOT NULL;

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

-- SELECT : admin uniquement.
DROP POLICY IF EXISTS "whatsapp_inbound_admin_select" ON public.whatsapp_inbound_messages;
CREATE POLICY "whatsapp_inbound_admin_select" ON public.whatsapp_inbound_messages
FOR SELECT
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Pas de policy INSERT/UPDATE/DELETE : seul le service role (webhook) insère.

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "whatsapp_inbound_admin_select" ON public.whatsapp_inbound_messages;
-- DROP TABLE IF EXISTS public.whatsapp_inbound_messages;
-- COMMIT;
