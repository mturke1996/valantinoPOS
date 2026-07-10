-- Keep privileged helper and trigger functions outside the exposed API schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.app_current_branch_id() SET SCHEMA private;
ALTER FUNCTION public.app_current_role() SET SCHEMA private;
ALTER FUNCTION public.app_has_role(TEXT[]) SET SCHEMA private;
ALTER FUNCTION public.refresh_order_payment_totals() SET SCHEMA private;
ALTER FUNCTION public.refresh_shift_expected_cash() SET SCHEMA private;
DO $migration$
BEGIN
  IF to_regprocedure('public.refresh_product_stock_from_batches()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.refresh_product_stock_from_batches() SET SCHEMA private';
    EXECUTE 'REVOKE ALL ON FUNCTION private.refresh_product_stock_from_batches() FROM PUBLIC, anon, authenticated';
  END IF;
END
$migration$;

-- The SQL body is textual, so point it at the helper's new private location.
CREATE OR REPLACE FUNCTION private.app_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.app_current_role() = ANY(allowed_roles), false)
$$;

REVOKE ALL ON FUNCTION private.app_current_branch_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.app_current_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.app_has_role(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.app_current_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.app_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.app_has_role(TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION private.refresh_order_payment_totals()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.refresh_shift_expected_cash()
  FROM PUBLIC, anon, authenticated;

-- Separate write policies by command so read access is evaluated once and
-- UPDATE always has both USING and WITH CHECK safeguards.
DROP POLICY IF EXISTS categories_write_branch ON public.categories;
CREATE POLICY categories_insert_branch ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );
CREATE POLICY categories_update_branch ON public.categories
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );
CREATE POLICY categories_delete_branch ON public.categories
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );

DROP POLICY IF EXISTS products_write_branch ON public.products;
CREATE POLICY products_insert_branch ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );
CREATE POLICY products_update_branch ON public.products
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );
CREATE POLICY products_delete_branch ON public.products
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );

DROP POLICY IF EXISTS batches_write_branch ON public.batches;
CREATE POLICY batches_insert_branch ON public.batches
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );
CREATE POLICY batches_update_branch ON public.batches
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );
CREATE POLICY batches_delete_branch ON public.batches
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'warehouse']))
  );

DROP POLICY IF EXISTS customers_write_branch ON public.customers;
CREATE POLICY customers_insert_branch ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );
CREATE POLICY customers_update_branch ON public.customers
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );
CREATE POLICY customers_delete_branch ON public.customers
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );

DROP POLICY IF EXISTS orders_write_branch ON public.orders;
CREATE POLICY orders_insert_branch ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );
CREATE POLICY orders_update_branch ON public.orders
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );
CREATE POLICY orders_delete_branch ON public.orders
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );

DROP POLICY IF EXISTS order_items_write_branch ON public.order_items;
CREATE POLICY order_items_insert_branch ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );
CREATE POLICY order_items_update_branch ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );
CREATE POLICY order_items_delete_branch ON public.order_items
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );

DROP POLICY IF EXISTS events_write_branch ON public.events;
CREATE POLICY events_insert_branch ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'sales']))
  );
CREATE POLICY events_update_branch ON public.events
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'sales']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'sales']))
  );
CREATE POLICY events_delete_branch ON public.events
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'sales']))
  );

DROP POLICY IF EXISTS shifts_write_branch ON public.shifts;
CREATE POLICY shifts_insert_branch ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier']))
  );
CREATE POLICY shifts_update_branch ON public.shifts
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier']))
  );
CREATE POLICY shifts_delete_branch ON public.shifts
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager', 'cashier']))
  );

DROP POLICY IF EXISTS settings_write_branch ON public.settings;
CREATE POLICY settings_insert_branch ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager']))
  );
CREATE POLICY settings_update_branch ON public.settings
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager']))
  )
  WITH CHECK (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager']))
  );
CREATE POLICY settings_delete_branch ON public.settings
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT private.app_current_branch_id()) AND
    (SELECT private.app_has_role(ARRAY['manager']))
  );

CREATE INDEX IF NOT EXISTS idx_order_items_branch
  ON public.order_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch
  ON public.payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_branch
  ON public.order_status_history(branch_id);
