-- Migration 009: Sales and Sale Items tables
-- Sales records with full payment details and void tracking
-- Sale items are denormalized snapshots (product_name, cost_price) for historical accuracy

-- ============================================================
-- Sales table
-- ============================================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number SERIAL,                                 -- human-readable receipt number
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES public.profiles(id),
  subtotal NUMERIC(10,2) NOT NULL,
  tax_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,   -- whole-sale discount
  discount_type TEXT CHECK (discount_type IN ('fixed', 'percentage')),
  total NUMERIC(10,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  payment_details JSONB,                              -- split tender details, card ref, etc.
  amount_paid NUMERIC(10,2) NOT NULL,
  change_given NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.sale_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id),
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_created ON public.sales(created_at DESC);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_date ON public.sales(created_at::date);

-- ============================================================
-- Sale Items table
-- ============================================================
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,                     -- denormalized for receipt history
  product_barcode TEXT,                           -- denormalized
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,             -- price at time of sale
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,   -- cost at time of sale (for margin)
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL              -- (unit_price * quantity) - discount + tax
);

CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);
