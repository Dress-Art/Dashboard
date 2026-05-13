-- =============================================================================
-- DressArt — Migration: add professional_id to orders
-- Applies: add nullable professional_id FK to auth.users, backfill from modeles
-- Run with: `supabase db push` or execute in Supabase SQL editor
-- =============================================================================

BEGIN;

-- Add professional_id to orders (nullable)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS professional_id uuid
        REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_professional_id
    ON public.orders(professional_id);

COMMENT ON COLUMN public.orders.professional_id IS
    'Assigned couturier (auth.users.id). Nullable; populated from modeles.professional_id when available.';

-- Backfill from modeles table when order.model_id references a model
-- (safe: only fills NULL professional_id values).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modeles') THEN
        UPDATE public.orders o
        SET professional_id = m.professional_id
        FROM public.modeles m
        WHERE o.model_id = m.id
          AND o.professional_id IS NULL
          AND m.professional_id IS NOT NULL
          AND EXISTS (
              SELECT 1
              FROM auth.users u
              WHERE u.id = m.professional_id
          );
    END IF;
END$$;

COMMIT;
