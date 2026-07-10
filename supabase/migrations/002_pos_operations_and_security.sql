-- Valentino ERP+POS — Operational tables, tenancy, policies and indexes
-- Designed to be applied after 001_core_schema.sql.

ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'delivery';
ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'reservation';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_en TEXT;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Authenticated users are explicitly attached to one branch.
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  role_key TEXT NOT NULL CHECK (
    role_key IN ('manager', 'cashier', 'sales', 'warehouse', 'accountant', 'delivery')
  ),
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  cashier_id UUID NOT NULL REFERENCES user_profiles(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_float >= 0),
  closing_count NUMERIC(12,2) CHECK (closing_count >= 0),
  expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (expected_cash >= 0),
  variance NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'open' AND closed_at IS NULL) OR
    (status = 'closed' AND closed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_shift_per_branch
  ON shifts(branch_id)
  WHERE status = 'open';

DO $$
BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT orders_shift_id_fkey
    FOREIGN KEY (shift_id) REFERENCES shifts(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  product_name_ar TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  weight_grams NUMERIC(14,3),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  shift_id UUID REFERENCES shifts(id),
  method payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  cash_amount NUMERIC(12,2) CHECK (cash_amount >= 0),
  card_amount NUMERIC(12,2) CHECK (card_amount >= 0),
  reference TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    method <> 'mixed' OR
    abs(COALESCE(cash_amount, 0) + COALESCE(card_amount, 0) - amount) < 0.01
  )
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'wedding', 'engagement', 'birth', 'success', 'graduation',
      'birthday', 'corporate', 'gift', 'other'
    )
  ),
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  packaging_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  gift_card_message TEXT,
  gift_card_phrase TEXT,
  special_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  invoice_number TEXT NOT NULL,
  qr_payload TEXT,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID REFERENCES user_profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Data integrity for core tables.
DO $$
BEGIN
  ALTER TABLE products
    ADD CONSTRAINT products_prices_nonnegative
    CHECK (
      cost_price >= 0 AND retail_price > 0 AND
      wholesale_price >= 0 AND stock_quantity >= 0 AND min_stock >= 0
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT orders_amounts_valid
    CHECK (
      subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND
      total >= 0 AND paid_amount >= 0 AND paid_amount <= total
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE batches
    ADD CONSTRAINT batches_quantity_nonnegative CHECK (quantity >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Cover foreign keys and high-frequency operational queries.
CREATE INDEX IF NOT EXISTS idx_categories_branch
  ON categories(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent
  ON categories(parent_id) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_branch_slug_active
  ON categories(branch_id, slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode_active
  ON products(branch_id, barcode)
  WHERE deleted_at IS NULL AND barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS idx_products_branch_active
  ON products(branch_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_branch
  ON batches(branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_product_number
  ON batches(product_id, batch_number);
CREATE INDEX IF NOT EXISTS idx_customers_branch
  ON customers(branch_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone_active
  ON customers(branch_id, phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> '';
CREATE INDEX IF NOT EXISTS idx_orders_customer
  ON orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shift
  ON orders(shift_id) WHERE shift_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_schedule_active
  ON orders(branch_id, delivery_date, delivery_time)
  WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch
  ON inventory_movements(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch
  ON inventory_movements(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
  ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_branch
  ON user_profiles(branch_id, role_key) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_shifts_cashier
  ON shifts(cashier_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product
  ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_batch
  ON order_items(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_order
  ON payments(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_shift
  ON payments(shift_id, created_at) WHERE shift_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_by
  ON payments(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_branch
  ON events(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_branch
  ON invoices(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by
  ON order_status_history(changed_by) WHERE changed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch
  ON audit_logs(branch_id, created_at DESC);

-- Consistent updated_at values.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'branches', 'categories', 'products', 'batches', 'customers',
    'orders', 'user_profiles', 'shifts', 'events'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_%1$s_updated_at ON public.%1$I',
      target_table
    );
    EXECUTE format(
      'CREATE TRIGGER set_%1$s_updated_at BEFORE UPDATE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
      target_table
    );
  END LOOP;
END
$$;

-- Payments are immutable; order balances are derived transactionally.
CREATE OR REPLACE FUNCTION public.refresh_order_payment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_order_id UUID;
  paid NUMERIC(12,2);
  order_total NUMERIC(12,2);
BEGIN
  target_order_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.order_id
    ELSE NEW.order_id
  END;

  SELECT COALESCE(sum(amount), 0)
    INTO paid
    FROM public.payments
   WHERE order_id = target_order_id;

  SELECT total
    INTO order_total
    FROM public.orders
   WHERE id = target_order_id
   FOR UPDATE;

  UPDATE public.orders
     SET paid_amount = LEAST(paid, order_total),
         payment_status = CASE
           WHEN paid <= 0 THEN 'unpaid'::payment_status
           WHEN paid >= order_total THEN 'paid'::payment_status
           ELSE 'partial'::payment_status
         END,
         updated_at = now()
   WHERE id = target_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_order_after_payment ON payments;
CREATE TRIGGER refresh_order_after_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION public.refresh_order_payment_totals();

CREATE OR REPLACE FUNCTION public.refresh_shift_expected_cash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_shift_id UUID;
BEGIN
  target_shift_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.shift_id
    ELSE NEW.shift_id
  END;

  IF target_shift_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  UPDATE public.shifts shift_row
     SET expected_cash = shift_row.opening_float + COALESCE((
       SELECT sum(
         CASE
           WHEN payment_row.method = 'cash' THEN
             COALESCE(payment_row.cash_amount, payment_row.amount)
           WHEN payment_row.method = 'mixed' THEN
             COALESCE(payment_row.cash_amount, 0)
           ELSE 0
         END
       )
       FROM public.payments payment_row
       WHERE payment_row.shift_id = target_shift_id
     ), 0),
     updated_at = now()
   WHERE shift_row.id = target_shift_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_shift_after_payment ON payments;
CREATE TRIGGER refresh_shift_after_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION public.refresh_shift_expected_cash();

CREATE OR REPLACE FUNCTION public.refresh_product_stock_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_product_id UUID;
BEGIN
  target_product_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.product_id
    ELSE NEW.product_id
  END;

  UPDATE public.products product_row
     SET stock_quantity = COALESCE((
       SELECT sum(batch_row.quantity)
         FROM public.batches batch_row
        WHERE batch_row.product_id = target_product_id
          AND batch_row.quantity > 0
     ), 0),
     updated_at = now()
   WHERE product_row.id = target_product_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_product_after_batch ON batches;
CREATE TRIGGER refresh_product_after_batch
AFTER INSERT OR UPDATE OR DELETE ON batches
FOR EACH ROW EXECUTE FUNCTION public.refresh_product_stock_from_batches();

-- Tenant helpers. Security-definer functions avoid recursive profile RLS.
CREATE OR REPLACE FUNCTION public.app_current_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT branch_id
    FROM public.user_profiles
   WHERE id = (SELECT auth.uid())
     AND is_active
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role_key
    FROM public.user_profiles
   WHERE id = (SELECT auth.uid())
     AND is_active
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.app_current_role() = ANY(allowed_roles), false)
$$;

REVOKE ALL ON FUNCTION public.app_current_branch_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_current_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_has_role(TEXT[]) TO authenticated;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Public reference data for authenticated application users.
DROP POLICY IF EXISTS roles_read_authenticated ON roles;
CREATE POLICY roles_read_authenticated ON roles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS permissions_read_authenticated ON permissions;
CREATE POLICY permissions_read_authenticated ON permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS role_permissions_read_authenticated ON role_permissions;
CREATE POLICY role_permissions_read_authenticated ON role_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_read_branch ON user_profiles;
CREATE POLICY profiles_read_branch ON user_profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid()) OR (
      branch_id = (SELECT public.app_current_branch_id()) AND
      (SELECT public.app_has_role(ARRAY['manager']))
    )
  );
DROP POLICY IF EXISTS profiles_manage_branch ON user_profiles;
CREATE POLICY profiles_manage_branch ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );

DROP POLICY IF EXISTS branches_read_current ON branches;
CREATE POLICY branches_read_current ON branches
  FOR SELECT TO authenticated
  USING (id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS branches_manage_current ON branches;
CREATE POLICY branches_manage_current ON branches
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  )
  WITH CHECK (
    id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );

DROP POLICY IF EXISTS categories_read_branch ON categories;
CREATE POLICY categories_read_branch ON categories
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS categories_write_branch ON categories;
CREATE POLICY categories_write_branch ON categories
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse']))
  );

DROP POLICY IF EXISTS products_read_branch ON products;
CREATE POLICY products_read_branch ON products
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS products_write_branch ON products;
CREATE POLICY products_write_branch ON products
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse']))
  );

DROP POLICY IF EXISTS batches_read_branch ON batches;
CREATE POLICY batches_read_branch ON batches
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS batches_write_branch ON batches;
CREATE POLICY batches_write_branch ON batches
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse']))
  );

DROP POLICY IF EXISTS customers_read_branch ON customers;
CREATE POLICY customers_read_branch ON customers
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS customers_write_branch ON customers;
CREATE POLICY customers_write_branch ON customers
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );

DROP POLICY IF EXISTS orders_read_branch ON orders;
CREATE POLICY orders_read_branch ON orders
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS orders_write_branch ON orders;
CREATE POLICY orders_write_branch ON orders
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );

DROP POLICY IF EXISTS order_items_read_branch ON order_items;
CREATE POLICY order_items_read_branch ON order_items
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS order_items_write_branch ON order_items;
CREATE POLICY order_items_write_branch ON order_items
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales']))
  );

DROP POLICY IF EXISTS payments_read_branch ON payments;
CREATE POLICY payments_read_branch ON payments
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS payments_insert_branch ON payments;
CREATE POLICY payments_insert_branch ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'accountant']))
  );

DROP POLICY IF EXISTS events_read_branch ON events;
CREATE POLICY events_read_branch ON events
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS events_write_branch ON events;
CREATE POLICY events_write_branch ON events
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'sales']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'sales']))
  );

DROP POLICY IF EXISTS shifts_read_branch ON shifts;
CREATE POLICY shifts_read_branch ON shifts
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS shifts_write_branch ON shifts;
CREATE POLICY shifts_write_branch ON shifts
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier']))
  );

DROP POLICY IF EXISTS inventory_movements_read_branch ON inventory_movements;
CREATE POLICY inventory_movements_read_branch ON inventory_movements
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS inventory_movements_insert_branch ON inventory_movements;
CREATE POLICY inventory_movements_insert_branch ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'cashier']))
  );

DROP POLICY IF EXISTS invoices_read_branch ON invoices;
CREATE POLICY invoices_read_branch ON invoices
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS invoices_insert_branch ON invoices;
CREATE POLICY invoices_insert_branch ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'accountant']))
  );

DROP POLICY IF EXISTS status_history_read_branch ON order_status_history;
CREATE POLICY status_history_read_branch ON order_status_history
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS status_history_insert_branch ON order_status_history;
CREATE POLICY status_history_insert_branch ON order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales', 'delivery']))
  );

DROP POLICY IF EXISTS audit_logs_read_branch ON audit_logs;
CREATE POLICY audit_logs_read_branch ON audit_logs
  FOR SELECT TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );
DROP POLICY IF EXISTS audit_logs_insert_branch ON audit_logs;
CREATE POLICY audit_logs_insert_branch ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()));

DROP POLICY IF EXISTS settings_read_branch ON settings;
CREATE POLICY settings_read_branch ON settings
  FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
DROP POLICY IF EXISTS settings_write_branch ON settings;
CREATE POLICY settings_write_branch ON settings
  FOR ALL TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  )
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );

-- The service role remains the only actor allowed to provision profiles.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON
  categories, products, batches, customers, orders, order_items,
  events, shifts, settings
TO authenticated;
GRANT INSERT ON
  payments, inventory_movements, invoices, order_status_history, audit_logs
TO authenticated;
GRANT UPDATE ON branches, user_profiles TO authenticated;
