-- Migration 013: Stock triggers
-- Two SECURITY DEFINER trigger functions that automatically manage inventory:
-- 1. handle_sale_stock_decrement: decrements stock when a sale_item is inserted
-- 2. handle_sale_void_stock_restore: restores stock when a sale is voided

-- ============================================================
-- Auto-decrement stock on sale
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_sale_stock_decrement()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement product stock
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;

  -- Insert stock movement record
  INSERT INTO public.stock_movements (
    product_id, quantity_change, reason,
    reference_id, reference_type, created_by
  )
  SELECT
    NEW.product_id,
    -NEW.quantity,
    'sale',
    NEW.sale_id,
    'sale',
    s.cashier_id
  FROM public.sales s WHERE s.id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_sale_item_inserted
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sale_stock_decrement();

-- ============================================================
-- Restore stock on sale void
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_sale_void_stock_restore()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'voided' THEN
    -- Restore stock for each sale item
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + si.quantity
    FROM public.sale_items si
    WHERE si.sale_id = NEW.id AND si.product_id = p.id;

    -- Insert stock movement records
    INSERT INTO public.stock_movements (
      product_id, quantity_change, reason,
      reference_id, reference_type, notes, created_by
    )
    SELECT
      si.product_id,
      si.quantity,
      'sale_void',
      NEW.id,
      'sale',
      NEW.void_reason,
      NEW.voided_by
    FROM public.sale_items si
    WHERE si.sale_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_sale_voided
  AFTER UPDATE ON public.sales
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_sale_void_stock_restore();
