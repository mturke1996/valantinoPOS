-- Offline sync uses upsert (INSERT ... ON CONFLICT DO UPDATE), which needs UPDATE RLS.
-- Append-only tables previously had INSERT+SELECT only, causing 403 on sync.

DROP POLICY IF EXISTS invoices_update_branch ON invoices;
CREATE POLICY invoices_update_branch ON invoices
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'accountant']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'accountant']))
  );

DROP POLICY IF EXISTS payments_update_branch ON payments;
CREATE POLICY payments_update_branch ON payments
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'accountant']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'accountant']))
  );

DROP POLICY IF EXISTS inventory_movements_update_branch ON inventory_movements;
CREATE POLICY inventory_movements_update_branch ON inventory_movements
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'cashier']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'cashier']))
  );

DROP POLICY IF EXISTS audit_logs_update_branch ON audit_logs;
CREATE POLICY audit_logs_update_branch ON audit_logs
  FOR UPDATE TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()));

DROP POLICY IF EXISTS status_history_update_branch ON order_status_history;
CREATE POLICY status_history_update_branch ON order_status_history
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );

GRANT UPDATE ON invoices, payments, inventory_movements, audit_logs, order_status_history TO authenticated;
