-- ERP extensions: suppliers, procurement, finance, loyalty, promotions

-- ─── Loyalty tiers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  tier_key TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  min_points INT NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 1,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, tier_key)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_branch ON loyalty_tiers(branch_id);

-- Seed default tiers for every branch
INSERT INTO loyalty_tiers (branch_id, tier_key, name_ar, name_en, min_points, discount_percent, priority, color)
SELECT b.id, v.tier_key, v.name_ar, v.name_en, v.min_points, v.discount_percent, v.priority, v.color
FROM branches b
CROSS JOIN (
  VALUES
    ('bronze', 'برونزي', 'Bronze', 0, 0, 1, '#C4956A'),
    ('silver', 'فضي', 'Silver', 500, 3, 2, '#A8A8A8'),
    ('gold', 'ذهبي', 'Gold', 1500, 5, 3, '#D4AF37'),
    ('platinum', 'بلاتيني', 'Platinum', 4000, 8, 4, '#8FB996'),
    ('diamond', 'ماسي', 'Diamond', 10000, 12, 5, '#8B3A62')
) AS v(tier_key, name_ar, name_en, min_points, discount_percent, priority, color)
ON CONFLICT (branch_id, tier_key) DO NOTHING;

-- ─── Suppliers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_branch ON suppliers(branch_id) WHERE deleted_at IS NULL;

-- ─── Purchase orders ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  expected_date DATE,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, po_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name_ar TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON expenses(branch_id, expense_date DESC);

-- ─── Returns ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  return_number TEXT NOT NULL,
  refund_method TEXT NOT NULL,
  total_refund NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, return_number)
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT true,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Discounts & coupons ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  min_cart_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  coupon_type TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  min_cart_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, code)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Loyalty tiers
CREATE POLICY loyalty_tiers_read ON loyalty_tiers FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY loyalty_tiers_write ON loyalty_tiers FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager'])));

-- Suppliers
CREATE POLICY suppliers_read ON suppliers FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY suppliers_write ON suppliers FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'accountant'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'accountant'])));

-- Purchase orders
CREATE POLICY purchase_orders_read ON purchase_orders FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY purchase_orders_write ON purchase_orders FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'accountant'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'accountant'])));

CREATE POLICY purchase_order_items_read ON purchase_order_items FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY purchase_order_items_write ON purchase_order_items FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'accountant'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'warehouse', 'accountant'])));

-- Expenses
CREATE POLICY expenses_read ON expenses FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY expenses_write ON expenses FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'accountant'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'accountant'])));

-- Returns
CREATE POLICY returns_read ON returns FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY returns_write ON returns FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales'])));

CREATE POLICY return_items_read ON return_items FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY return_items_write ON return_items FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'cashier', 'sales'])));

-- Discounts & coupons
CREATE POLICY discounts_read ON discounts FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY discounts_write ON discounts FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'sales'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'sales'])));

CREATE POLICY coupons_read ON coupons FOR SELECT TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()));
CREATE POLICY coupons_write ON coupons FOR ALL TO authenticated
  USING (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'sales'])))
  WITH CHECK (branch_id = (SELECT public.app_current_branch_id()) AND (SELECT public.app_has_role(ARRAY['manager', 'sales'])));
