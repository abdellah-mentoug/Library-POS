-- Migration 012: Print Orders table
-- Tracks print/copy/bind/laminate/scan jobs for the print shop side of the business
-- Customer info is denormalized (customer_name, customer_phone) for quick display

CREATE TABLE public.print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,                           -- human-readable order number
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,                   -- denormalized for quick display
  customer_phone TEXT,
  service_type public.print_service_type NOT NULL DEFAULT 'printing',
  status public.print_order_status NOT NULL DEFAULT 'registered',
  description TEXT NOT NULL,                     -- "20 pages color, A4, double-sided"
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  linked_sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  file_paths TEXT[],                             -- array of Supabase Storage paths
  notes TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_print_orders_status ON public.print_orders(status);
CREATE INDEX idx_print_orders_customer ON public.print_orders(customer_id);
CREATE INDEX idx_print_orders_created ON public.print_orders(created_at DESC);
CREATE INDEX idx_print_orders_due ON public.print_orders(due_date)
  WHERE status NOT IN ('delivered', 'cancelled');

CREATE TRIGGER set_print_orders_updated_at
  BEFORE UPDATE ON public.print_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
