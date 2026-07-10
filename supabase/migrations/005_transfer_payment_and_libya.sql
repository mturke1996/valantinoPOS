-- Add bank transfer as a payment method
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer';
