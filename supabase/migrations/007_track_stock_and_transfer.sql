-- Product stock tracking flag + transfer payment method (if missing)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT false;

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer';
