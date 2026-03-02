-- Migration 011: Purchase Orders and Purchase Items tables
-- Tracks supplier orders (e.g., textbook shipments from Nabil Habachi)
-- purchase_items links individual products to their purchase order

-- ============================================================
-- Purchase Orders table
-- ============================================================
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number SERIAL,                              -- human-readable PO number
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  status public.purchase_order_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  expected_date DATE,
  received_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);

CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Purchase Items table
-- ============================================================
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL              -- unit_cost * quantity_ordered
);

CREATE INDEX idx_purchase_items_po ON public.purchase_items(purchase_order_id);
CREATE INDEX idx_purchase_items_product ON public.purchase_items(product_id);
