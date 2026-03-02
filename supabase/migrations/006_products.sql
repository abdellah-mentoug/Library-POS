-- Migration 006: Products table
-- Moroccan school textbooks. All prices in MAD (Moroccan Dirham).
-- barcode is VARCHAR(13) for ISBN-13/EAN-13 format, nullable until owner scans each book.
-- selling_price is nullable -- owner sets retail prices manually after purchase.
-- Margin = selling_price - purchase_price (computed, not stored).

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  barcode VARCHAR(13) UNIQUE,                   -- ISBN-13 / EAN-13 format; NULL until scanned
  sku TEXT UNIQUE,                              -- internal SKU (optional)
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,  -- what the shop paid the supplier
  selling_price NUMERIC(10,2),                      -- retail price; NULL until owner sets it
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,     -- percentage, e.g. 15.00
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  unit TEXT NOT NULL DEFAULT 'piece',           -- piece, pack, box, ream, etc.
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Margin is computed, not stored: margin = selling_price - purchase_price
-- Query example: SELECT name, selling_price - purchase_price AS margin FROM products;

CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_low_stock ON public.products(stock_quantity, low_stock_threshold)
  WHERE is_active = TRUE;
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
