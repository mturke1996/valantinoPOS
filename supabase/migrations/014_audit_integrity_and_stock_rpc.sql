-- Harden append-only integrity, delivery order scope, and multi-terminal stock.
-- Also revoke anon EXECUTE on SECURITY DEFINER helpers (least privilege).

-- ─── Atomic batch quantity adjustment from inventory movements ───────────────
CREATE OR REPLACE FUNCTION private.apply_inventory_movement_to_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_rows integer;
BEGIN
  IF NEW.batch_id IS NULL OR NEW.quantity = 0 THEN
    RETURN NEW;
  END IF;

  -- "add"/receive upserts the batch with full quantity already — do not re-apply.
  -- Sale/return paths sync movements only (no absolute batch upsert) for multi-terminal safety.
  IF NEW.type NOT IN ('sale', 'return') THEN
    RETURN NEW;
  END IF;

  UPDATE public.batches
     SET quantity = quantity + NEW.quantity,
         updated_at = now()
   WHERE id = NEW.batch_id
     AND branch_id = NEW.branch_id
     AND quantity + NEW.quantity >= 0;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows = 0 THEN
    RAISE EXCEPTION 'insufficient stock or missing batch for movement %', NEW.id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_inventory_movement_to_batch()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS apply_inventory_movement_to_batch ON public.inventory_movements;
CREATE TRIGGER apply_inventory_movement_to_batch
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION private.apply_inventory_movement_to_batch();

-- ─── Audit logs: insert-only (no UPDATE for authenticated) ───────────────────
DROP POLICY IF EXISTS audit_logs_update_branch ON public.audit_logs;
REVOKE UPDATE ON public.audit_logs FROM authenticated;

-- ─── Payments: prefer insert; keep UPDATE for manager corrections only ───────
DROP POLICY IF EXISTS payments_update_branch ON public.payments;
CREATE POLICY payments_update_branch ON public.payments
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );

-- ─── Delivery: status/assignment only — remove full update/delete ────────────
DROP POLICY IF EXISTS orders_update_branch ON public.orders;
CREATE POLICY orders_update_branch ON public.orders
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );

-- Narrow delivery updates via trigger (block money-field tampering)
CREATE OR REPLACE FUNCTION private.restrict_delivery_order_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role_key INTO current_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF current_role = 'delivery' THEN
    IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
       OR NEW.order_number IS DISTINCT FROM OLD.order_number
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    THEN
      RAISE EXCEPTION 'delivery role cannot modify financial or identity order fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.restrict_delivery_order_updates()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS restrict_delivery_order_updates ON public.orders;
CREATE TRIGGER restrict_delivery_order_updates
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.restrict_delivery_order_updates();

DROP POLICY IF EXISTS orders_delete_branch ON public.orders;
CREATE POLICY orders_delete_branch ON public.orders
  FOR DELETE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );

-- ─── Revoke anon EXECUTE on SECURITY DEFINER RPCs (lint 0028) ────────────────
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.app_current_branch_id()',
    'public.app_current_role()',
    'public.app_has_role(text[])',
    'public.manager_create_invite(text, integer)',
    'public.provision_first_admin_profile(text, text)',
    'public.redeem_branch_invite(text, text, text)',
    'public.refresh_order_payment_totals()',
    'public.refresh_product_stock_from_batches()',
    'public.refresh_shift_expected_cash()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXCEPTION
      WHEN undefined_function THEN
        NULL;
    END;
  END LOOP;
END;
$$;

-- Keep authenticated EXECUTE only where intentional for app RPCs
GRANT EXECUTE ON FUNCTION public.manager_create_invite(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_first_admin_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_branch_invite(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_has_role(text[]) TO authenticated;
