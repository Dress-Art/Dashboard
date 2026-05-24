-- =============================================================================
-- DressArt — Log persistant des notifications sortantes (WhatsApp / email / SMS).
--
-- Objectif :
--   - Garder une trace de chaque message envoyé aux clients, couturiers,
--     livreurs et admin pour audit + module Notifications côté dashboard.
--   - Rester volontairement lecture seule en pratique : les rows sont
--     insérées par les helpers serveur (service role) et seul l'admin
--     les consulte.
--
-- Pas de FK strictes vers orders/deliveries pour ne pas casser les inserts
-- en cas de suppression de ligne (on garde la trace historique).
--
-- Idempotente.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications_log (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
    event_type text NOT NULL,
    recipient text NOT NULL,
    subject text,
    body text NOT NULL,
    related_order_id uuid,
    related_delivery_id uuid,
    success boolean NOT NULL DEFAULT false,
    error text,
    sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_sent_at
    ON public.notifications_log (sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_log_channel
    ON public.notifications_log (channel);

CREATE INDEX IF NOT EXISTS idx_notifications_log_related_order_id
    ON public.notifications_log (related_order_id)
    WHERE related_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_log_related_delivery_id
    ON public.notifications_log (related_delivery_id)
    WHERE related_delivery_id IS NOT NULL;

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- SELECT : admin seul.
DROP POLICY IF EXISTS "notifications_log_admin_select" ON public.notifications_log;
CREATE POLICY "notifications_log_admin_select" ON public.notifications_log
FOR SELECT
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Pas de policy INSERT/UPDATE/DELETE : les inserts passent par le service
-- role (bypass RLS), et on n'autorise jamais la modification après coup.

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "notifications_log_admin_select" ON public.notifications_log;
-- DROP TABLE IF EXISTS public.notifications_log;
-- COMMIT;
