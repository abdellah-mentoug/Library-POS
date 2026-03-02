-- Migration 010: Stock Movements table
-- Audit trail for all inventory changes (sales, voids, purchases, adjustments, etc.)
-- quantity_change: positive = stock in, negative = stock out

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,              -- positive = in, negative = out
  reason public.stock_movement_reason NOT NULL,
  reference_id UUID,                            -- sale_id, purchase_order_id, etc.
  reference_type TEXT,                          -- 'sale', 'purchase_order', 'adjustment'
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements(reference_id, reference_type);
