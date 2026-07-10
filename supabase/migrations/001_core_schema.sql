-- Valentino ERP+POS — Core Schema Migration 001
-- Run via Supabase CLI: supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE order_status AS ENUM (
  'received', 'reviewing', 'preparing', 'packaging',
  'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'
);
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'mixed', 'credit');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
CREATE TYPE order_type AS ENUM ('pos', 'event', 'online');
CREATE TYPE unit_type AS ENUM ('piece', 'gram', 'kilo', 'box', 'carton');
CREATE TYPE inventory_movement_type AS ENUM (
  'add', 'deduct', 'transfer', 'waste', 'expiry', 'sale', 'return', 'adjust'
);

-- Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles & Permissions
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  parent_id UUID REFERENCES categories(id),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  category_id UUID REFERENCES categories(id),
  sku TEXT NOT NULL,
  barcode TEXT,
  name_ar TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC(12,2) DEFAULT 0,
  retail_price NUMERIC(12,2) NOT NULL,
  wholesale_price NUMERIC(12,2) NOT NULL,
  unit_type unit_type DEFAULT 'piece',
  weight_grams NUMERIC,
  origin TEXT,
  min_stock INT DEFAULT 0,
  stock_quantity NUMERIC DEFAULT 0,
  is_bundle BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, sku)
);

CREATE INDEX idx_products_barcode ON products(branch_id, barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;

-- Batches (FEFO)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  branch_id UUID REFERENCES branches(id),
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  cost_per_unit NUMERIC(12,2) NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_batches_fefo ON batches(product_id, expiry_date ASC) WHERE quantity > 0;

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  notes TEXT,
  birthday DATE,
  loyalty_tier_id UUID,
  loyalty_points INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  order_count INT DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  wholesale_pricing BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers(branch_id, phone) WHERE deleted_at IS NULL;

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  type order_type DEFAULT 'pos',
  status order_status DEFAULT 'received',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'unpaid',
  delivery_date DATE,
  delivery_time TIME,
  delivery_address TEXT,
  notes TEXT,
  assigned_to UUID,
  shift_id UUID,
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, order_number)
);

CREATE INDEX idx_orders_status ON orders(branch_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_delivery ON orders(branch_id, delivery_date);

-- Inventory movements (immutable)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  type inventory_movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inv_mov_product ON inventory_movements(product_id, created_at DESC);

-- Audit logs (append-only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  UNIQUE(branch_id, key)
);

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
