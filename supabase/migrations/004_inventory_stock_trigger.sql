-- Ensure the deployed database derives product stock from inventory batches.
CREATE OR REPLACE FUNCTION private.refresh_product_stock_from_batches()
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

REVOKE ALL ON FUNCTION private.refresh_product_stock_from_batches()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refresh_product_after_batch ON public.batches;
CREATE TRIGGER refresh_product_after_batch
AFTER INSERT OR UPDATE OR DELETE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION private.refresh_product_stock_from_batches();
