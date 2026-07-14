-- Rich delivery details and reliable branch realtime subscriptions.
-- Idempotent: safe to re-run if partially applied.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_delivery_fee_non_negative'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_fee_non_negative
      CHECK (delivery_fee >= 0) NOT VALID;
    ALTER TABLE public.orders
      VALIDATE CONSTRAINT orders_delivery_fee_non_negative;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_orders_branch_delivery_active
  ON public.orders (branch_id, delivery_date, delivery_time)
  WHERE deleted_at IS NULL
    AND status NOT IN ('completed', 'cancelled');

DO $$
DECLARE
  relation_name TEXT;
  realtime_tables TEXT[] := ARRAY[
    'products',
    'batches',
    'orders',
    'payments',
    'shifts',
    'customers',
    'user_profiles',
    'categories',
    'events',
    'returns',
    'discounts',
    'coupons',
    'suppliers',
    'expenses',
    'purchase_orders',
    'invoices',
    'inventory_movements',
    'loyalty_tiers',
    'settings'
  ];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    FOREACH relation_name IN ARRAY realtime_tables LOOP
      IF to_regclass(format('public.%I', relation_name)) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = relation_name
        )
      THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          relation_name
        );
      END IF;
    END LOOP;
  END IF;
END
$$;

-- Include previous row values so clients can reconcile updates and deletes.
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.settings REPLICA IDENTITY FULL;
