-- Trigger helper RPCs should not be callable by clients
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.refresh_order_payment_totals()',
    'public.refresh_product_stock_from_batches()',
    'public.refresh_shift_expected_cash()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END;
$$;
