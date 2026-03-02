# Bookstore / Stationery & Print Shop Management -- Technical Blueprint

> **Generated:** 2026-02-26
> **Stack:** Next.js 15 (App Router) | Supabase (Auth + DB + Storage) | Tailwind CSS | shadcn/ui
> **Target:** Desktop browser, 1 admin (shop owner) + 1--2 employees
> **Sprint:** 2-day MVP

---

## Table of Contents

1. [Supabase Schema](#1-supabase-schema)
2. [Row-Level Security (RLS) Policies](#2-row-level-security-rls-policies)
3. [Auth and RBAC](#3-auth-and-rbac)
4. [Next.js App Structure](#4-nextjs-app-structure)
5. [POS Module](#5-pos-module)
6. [Barcode Handling](#6-barcode-handling)
7. [Print Order Workflow](#7-print-order-workflow)
8. [Reporting](#8-reporting)
9. [Key Libraries](#9-key-libraries)
10. [Gotchas and Risks](#10-gotchas-and-risks)
11. [MVP Scope and Build Order](#11-mvp-scope-and-build-order)

---

## 1. Supabase Schema

### 1.1 Enums

```sql
-- Role enum for user profiles
CREATE TYPE public.user_role AS ENUM ('admin', 'employee');

-- Sale payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'store_credit', 'split');

-- Sale status enum
CREATE TYPE public.sale_status AS ENUM ('completed', 'voided', 'refunded');

-- Print order status enum
CREATE TYPE public.print_order_status AS ENUM ('registered', 'in_progress', 'ready', 'delivered', 'cancelled');

-- Print service type enum
CREATE TYPE public.print_service_type AS ENUM ('printing', 'copying', 'binding', 'laminating', 'scanning', 'other');

-- Purchase order status enum
CREATE TYPE public.purchase_order_status AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');

-- Stock movement reason enum
CREATE TYPE public.stock_movement_reason AS ENUM (
  'sale',
  'sale_void',
  'purchase_received',
  'adjustment_add',
  'adjustment_remove',
  'stocktake',
  'return',
  'damaged',
  'initial'
);
```

### 1.2 Profiles Table

This extends `auth.users`. Every Supabase Auth user gets a row here via a trigger.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'employee',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role-based lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 1.3 Categories Table

Uses a parent/child self-referencing structure. Top-level categories are the 3 languages (Arabic, French, English). Second-level categories are subject + grade (e.g., "التربية الاسلامية السنة الاولى الابتدائي" = Islamic Education Year 1 Primary). See `supabase/seed.sql` for the full list of 60 categories (3 parents + 57 children).

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_active ON public.categories(is_active);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 1.4 Products Table

> **Real data note:** The shop's inventory is Moroccan school textbooks. All prices are in MAD (Moroccan Dirham). The `Référence` column in supplier invoices maps to `barcode` but is empty in the initial invoices -- the owner will scan each book's ISBN-13 barcode during setup using a USB barcode scanner. The `Prix` column in invoices is the **purchase price** (what the shop paid), not the selling price.

```sql
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
-- A generated column is possible but nullable selling_price makes it less useful:
-- margin_amount NUMERIC(10,2) GENERATED ALWAYS AS (selling_price - purchase_price) STORED

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
```

> **Note:** The trigram index (`gin_trgm_ops`) requires enabling the `pg_trgm` extension in Supabase. Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in the SQL editor.
> **Note:** `barcode` is `VARCHAR(13)` (not generic `TEXT`) because all products are school textbooks with ISBN-13/EAN-13 barcodes. It is nullable because existing stock won't have barcodes populated until the owner scans them in with a USB scanner during initial setup.
> **Note:** `selling_price` is nullable. The owner purchases inventory at `purchase_price` from the supplier and will set retail prices manually. Margin = `selling_price - purchase_price`.

### 1.5 Customers Table

```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  store_credit NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_phone ON public.customers(phone);

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 1.6 Suppliers Table

```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON public.suppliers USING gin (name gin_trgm_ops);

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 1.7 Sales Table

```sql
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
```

### 1.8 Sale Items Table

```sql
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
```

### 1.9 Stock Movements Table

```sql
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
```

### 1.10 Purchase Orders Table

```sql
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
```

### 1.11 Purchase Items Table

```sql
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
```

### 1.12 Print Orders Table

```sql
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
```

### 1.13 Database Trigger: Auto-Decrement Stock on Sale

```sql
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
```

### 1.14 Database Trigger: Restore Stock on Sale Void

```sql
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
```

### 1.15 Database Views for Reporting

```sql
-- Daily sales summary view
CREATE OR REPLACE VIEW public.v_daily_sales AS
SELECT
  DATE(s.created_at) AS sale_date,
  COUNT(*) AS transaction_count,
  SUM(s.total) AS total_revenue,
  SUM(s.tax_total) AS total_tax,
  SUM(s.discount_amount) AS total_discounts,
  AVG(s.total) AS average_basket_size
FROM public.sales s
WHERE s.status = 'completed'
GROUP BY DATE(s.created_at)
ORDER BY sale_date DESC;

-- Product performance view
CREATE OR REPLACE VIEW public.v_product_performance AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.barcode,
  p.category_id,
  c.name AS category_name,
  p.selling_price,
  p.purchase_price,
  p.stock_quantity,
  p.low_stock_threshold,
  COALESCE(SUM(si.quantity), 0) AS total_sold,
  COALESCE(SUM(si.line_total), 0) AS total_revenue,
  COALESCE(SUM(si.line_total) - SUM(si.cost_price * si.quantity), 0) AS total_profit
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.sale_items si ON si.product_id = p.id
LEFT JOIN public.sales s ON s.id = si.sale_id AND s.status = 'completed'
GROUP BY p.id, p.name, p.barcode, p.category_id, c.name, p.selling_price, p.purchase_price,
         p.stock_quantity, p.low_stock_threshold;

-- Low stock alert view
CREATE OR REPLACE VIEW public.v_low_stock AS
SELECT
  id, name, barcode, sku, stock_quantity, low_stock_threshold, category_id, selling_price
FROM public.products
WHERE is_active = TRUE
  AND stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;

-- Print order summary view
CREATE OR REPLACE VIEW public.v_print_order_summary AS
SELECT
  DATE(po.created_at) AS order_date,
  po.status,
  COUNT(*) AS order_count,
  SUM(po.total_price) AS total_value,
  SUM(CASE WHEN po.is_paid THEN po.total_price ELSE 0 END) AS paid_value,
  SUM(CASE WHEN NOT po.is_paid THEN po.total_price ELSE 0 END) AS unpaid_value
FROM public.print_orders po
GROUP BY DATE(po.created_at), po.status
ORDER BY order_date DESC, po.status;
```

### 1.16 Supabase Storage Bucket

```sql
-- Create the print-files bucket (run in Supabase SQL editor or dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'print-files',
  'print-files',
  FALSE,  -- private bucket
  52428800,  -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);
```

### 1.17 Entity Relationship Summary

```
profiles (1) ---< sales (many)          [cashier_id]
profiles (1) ---< stock_movements (many) [created_by]
profiles (1) ---< purchase_orders (many) [created_by]
profiles (1) ---< print_orders (many)   [created_by]

categories (1) ---< products (many)      [category_id]
categories (1) ---< categories (many)    [parent_id, self-ref]

products (1) ---< sale_items (many)      [product_id]
products (1) ---< stock_movements (many) [product_id]
products (1) ---< purchase_items (many)  [product_id]

sales (1) ---< sale_items (many)         [sale_id]
sales (1) ---o print_orders (0..1)       [linked_sale_id]

customers (1) ---< sales (many)          [customer_id]
customers (1) ---< print_orders (many)   [customer_id]

suppliers (1) ---< purchase_orders (many) [supplier_id]
purchase_orders (1) ---< purchase_items (many) [purchase_order_id]
```

No junction tables are required for the MVP. The schema is fully normalized for a single-store setup.

---

## 2. Row-Level Security (RLS) Policies

### 2.1 Design Philosophy

- **Admin** can see and do everything.
- **Employee** can see most data, can create sales and print orders, but cannot void sales, manage users, or delete products.
- All mutations through server actions use the **service role** key (bypasses RLS) for controlled writes, so write-side policies can be simpler.
- Read-side policies enforce role-based visibility.

### 2.2 Helper Function: Get User Role

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 2.3 Policies Per Table

#### profiles

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read all profiles (needed for display names)
CREATE POLICY "Profiles: anyone can read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

-- Admin can update any profile
CREATE POLICY "Profiles: admin can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Users can update their own profile (name, avatar only — role change handled server-side)
CREATE POLICY "Profiles: self can update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
```

#### categories

```sql
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories: authenticated can read"
  ON public.categories FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Categories: admin can insert"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Categories: admin can update"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Categories: admin can delete"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');
```

#### products

```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products: authenticated can read"
  ON public.products FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Products: admin can insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Products: admin can update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Products: admin can delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');
```

#### sales + sale_items

```sql
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read sales
CREATE POLICY "Sales: authenticated can read"
  ON public.sales FOR SELECT
  TO authenticated
  USING (TRUE);

-- All authenticated users can create sales (cashier role)
CREATE POLICY "Sales: authenticated can insert"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Only admin can void/update sales
CREATE POLICY "Sales: admin can update"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Sale items follow parent sale access
CREATE POLICY "Sale items: authenticated can read"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Sale items: authenticated can insert"
  ON public.sale_items FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);
```

#### stock_movements

```sql
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock movements: authenticated can read"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (TRUE);

-- Inserts are handled by triggers (SECURITY DEFINER) or server actions with service role
CREATE POLICY "Stock movements: admin can insert"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');
```

#### customers

```sql
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers: authenticated can read"
  ON public.customers FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Customers: authenticated can insert"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Customers: admin can update"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Customers: employee can update"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'employee');
```

#### suppliers

```sql
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers: authenticated can read"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Suppliers: admin can manage"
  ON public.suppliers FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
```

#### purchase_orders + purchase_items

```sql
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POs: authenticated can read"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "POs: admin can manage"
  ON public.purchase_orders FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "PO items: authenticated can read"
  ON public.purchase_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "PO items: admin can manage"
  ON public.purchase_items FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
```

#### print_orders

```sql
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Print orders: authenticated can read"
  ON public.print_orders FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Print orders: authenticated can insert"
  ON public.print_orders FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Print orders: authenticated can update"
  ON public.print_orders FOR UPDATE
  TO authenticated
  USING (TRUE);
```

#### Storage Policies (print-files bucket)

```sql
-- Allow authenticated users to upload files to print-files bucket
CREATE POLICY "Print files: authenticated can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'print-files');

-- Allow authenticated users to read files from print-files bucket
CREATE POLICY "Print files: authenticated can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'print-files');

-- Allow admin to delete files
CREATE POLICY "Print files: admin can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'print-files'
    AND (SELECT public.get_my_role()) = 'admin'
  );
```

---

## 3. Auth and RBAC

### 3.1 Package Installation

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 3.2 Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> **IMPORTANT:** The Supabase docs now use the term "publishable key" for the anon key. Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for clarity. The service role key must NEVER be exposed to the client.

### 3.3 Supabase Client Utilities

#### Browser Client -- `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### Server Client -- `lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — ignored if middleware
            // handles session refresh
          }
        },
      },
    }
  );
}
```

#### Admin Client (Service Role) -- `lib/supabase/admin.ts`

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### 3.4 Middleware -- `middleware.ts`

> **Note:** Next.js 15 uses `middleware.ts`. Next.js 16 renames it to `proxy.ts`. We target Next.js 15.

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 3.5 Role Check Utility -- `lib/auth.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export async function getAuthUser(): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return {
    id: user.id,
    email: user.email!,
    role: profile.role as UserRole,
    fullName: profile.full_name,
  };
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
```

### 3.6 Role-Based Route Protection Matrix

| Route                     | Admin | Employee | Notes                            |
| ------------------------- | ----- | -------- | -------------------------------- |
| `/login`                  | --    | --       | Public                           |
| `/` (dashboard)           | Yes   | Yes      | Different KPIs per role          |
| `/pos`                    | Yes   | Yes      | Core cashier functionality       |
| `/products`               | Yes   | View     | Employee can view only           |
| `/products/new`           | Yes   | No       | Admin creates products           |
| `/products/[id]/edit`     | Yes   | No       | Admin edits products             |
| `/categories`             | Yes   | View     | Employee can view only           |
| `/print-orders`           | Yes   | Yes      | Both can create and manage       |
| `/customers`              | Yes   | Yes      | Both can view and create         |
| `/suppliers`              | Yes   | No       | Admin only                       |
| `/purchases`              | Yes   | No       | Admin only                       |
| `/reports`                | Yes   | Limited  | Employee sees today's sales only |
| `/settings`               | Yes   | No       | Admin only                       |
| `/settings/users`         | Yes   | No       | Admin manages user accounts      |
| Void a sale (action)      | Yes   | No       | Server action checks role        |
| Delete product (action)   | Yes   | No       | Server action checks role        |
| Stock adjustment (action) | Yes   | No       | Server action checks role        |

### 3.7 Server Action Role Guard Pattern

```typescript
// lib/actions/guard.ts
"use server";

import { getAuthUser, requireAdmin, type AuthUser } from "@/lib/auth";

export async function adminAction<T>(
  fn: (user: AuthUser) => Promise<T>
): Promise<T> {
  const user = await requireAdmin();
  return fn(user);
}

export async function authAction<T>(
  fn: (user: AuthUser) => Promise<T>
): Promise<T> {
  const user = await getAuthUser();
  return fn(user);
}
```

Usage in a server action:

```typescript
"use server";

import { adminAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  return adminAction(async (user) => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: formData.get("name") as string,
        selling_price: formData.get("selling_price") ? parseFloat(formData.get("selling_price") as string) : null,
        barcode: formData.get("barcode") as string || null,
        category_id: formData.get("category_id") as string,
        purchase_price: parseFloat(formData.get("purchase_price") as string) || 0,
        tax_rate: parseFloat(formData.get("tax_rate") as string) || 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/products");
    return data;
  });
}
```

---

## 4. Next.js App Structure

### 4.1 Full Directory Tree

```
app/
  (auth)/
    login/
      page.tsx                    -- Client Component (login form)
    auth/
      callback/
        route.ts                  -- Route Handler (OAuth callback)
  (dashboard)/
    layout.tsx                    -- Server Component (sidebar, topbar, auth check)
    page.tsx                      -- Server Component (dashboard home with KPIs)

    pos/
      page.tsx                    -- Client Component (POS terminal)
      _components/
        cart.tsx                  -- Client (cart display + line items)
        product-search.tsx        -- Client (search bar + barcode input)
        product-grid.tsx          -- Client (quick-pick product buttons)
        payment-dialog.tsx        -- Client (payment method selection)
        receipt-preview.tsx       -- Client (receipt PDF preview)
        hold-cart-dialog.tsx      -- Client (park/recall carts)

    products/
      page.tsx                    -- Server Component (product list table)
      new/
        page.tsx                  -- Server Component (create product form wrapper)
      [id]/
        page.tsx                  -- Server Component (product detail)
        edit/
          page.tsx                -- Server Component (edit form wrapper)
      _components/
        product-form.tsx          -- Client (reusable create/edit form)
        product-table.tsx         -- Client (TanStack Table data table)
        product-filters.tsx       -- Client (category, stock status filters)
        barcode-label.tsx         -- Client (JsBarcode label preview)

    categories/
      page.tsx                    -- Server Component (category list)
      _components/
        category-form.tsx         -- Client (create/edit dialog)
        category-tree.tsx         -- Client (hierarchical display)

    print-orders/
      page.tsx                    -- Server Component (order list)
      new/
        page.tsx                  -- Server Component (new order form wrapper)
      [id]/
        page.tsx                  -- Server Component (order detail + status)
      _components/
        print-order-form.tsx      -- Client (create/edit with file upload)
        print-order-table.tsx     -- Client (filtered table)
        status-badge.tsx          -- Server (status display)
        file-upload.tsx           -- Client (drag & drop upload to Storage)
        status-update-dialog.tsx  -- Client (change status)

    customers/
      page.tsx                    -- Server Component (customer list)
      [id]/
        page.tsx                  -- Server Component (customer detail + history)
      _components/
        customer-form.tsx         -- Client (create/edit dialog)
        customer-table.tsx        -- Client (search + list)
        purchase-history.tsx      -- Server (sales history for customer)

    suppliers/
      page.tsx                    -- Server Component (supplier list, admin only)
      _components/
        supplier-form.tsx         -- Client
        supplier-table.tsx        -- Client

    purchases/
      page.tsx                    -- Server Component (PO list, admin only)
      new/
        page.tsx                  -- Server Component (create PO)
      [id]/
        page.tsx                  -- Server Component (PO detail)
        receive/
          page.tsx                -- Server Component (receive stock)
      _components/
        po-form.tsx               -- Client
        po-table.tsx              -- Client
        receive-form.tsx          -- Client (mark items received)

    reports/
      page.tsx                    -- Server Component (report hub)
      sales/
        page.tsx                  -- Server Component (sales report)
      products/
        page.tsx                  -- Server Component (product performance)
      stock/
        page.tsx                  -- Server Component (stock report)
      print-orders/
        page.tsx                  -- Server Component (print order report)
      _components/
        date-range-picker.tsx     -- Client (shadcn/ui date picker)
        sales-chart.tsx           -- Client (Recharts bar/line chart)
        report-table.tsx          -- Client (TanStack Table)
        export-buttons.tsx        -- Client (CSV + PDF export triggers)

    settings/
      page.tsx                    -- Server Component (settings hub, admin only)
      users/
        page.tsx                  -- Server Component (user management)
      store/
        page.tsx                  -- Server Component (store info, receipt config)
      _components/
        user-form.tsx             -- Client (create/edit user)
        user-table.tsx            -- Client
        store-form.tsx            -- Client

  api/
    reports/
      export-csv/
        route.ts                  -- Route Handler (stream CSV)
      export-pdf/
        route.ts                  -- Route Handler (generate PDF report)
    receipts/
      [saleId]/
        route.ts                  -- Route Handler (generate receipt PDF)

components/
  ui/                             -- shadcn/ui components (auto-generated)
  layout/
    sidebar.tsx                   -- Client (navigation sidebar)
    topbar.tsx                    -- Client (user menu, notifications)
    breadcrumbs.tsx               -- Server
  shared/
    data-table.tsx                -- Client (reusable TanStack Table wrapper)
    confirm-dialog.tsx            -- Client (reusable confirmation)
    loading-spinner.tsx           -- Server
    empty-state.tsx               -- Server
    search-input.tsx              -- Client

hooks/
  use-barcode-scanner.ts          -- Custom hook for USB scanner detection
  use-cart.ts                     -- Zustand store hook (re-export)
  use-debounce.ts                 -- Debounce utility hook

lib/
  supabase/
    client.ts                     -- Browser client
    server.ts                     -- Server client
    admin.ts                      -- Service role client
  auth.ts                         -- getAuthUser, requireAdmin
  actions/
    guard.ts                      -- adminAction, authAction wrappers
    products.ts                   -- Product CRUD server actions
    sales.ts                      -- Sale creation, void server actions
    categories.ts                 -- Category CRUD server actions
    customers.ts                  -- Customer CRUD server actions
    suppliers.ts                  -- Supplier CRUD server actions
    purchases.ts                  -- PO CRUD, receive stock actions
    print-orders.ts               -- Print order CRUD, status updates
    stock.ts                      -- Stock adjustment server actions
    auth-actions.ts               -- Sign in, sign up, sign out
  store/
    cart-store.ts                 -- Zustand cart store
  utils/
    format.ts                     -- Currency, date formatting
    receipt-pdf.ts                -- jsPDF receipt builder
    report-pdf.ts                 -- jsPDF report builder
    csv-export.ts                 -- CSV generation utility
    validation.ts                 -- Zod schemas for form validation
    constants.ts                  -- App-wide constants
  types/
    database.ts                   -- Supabase generated types
    cart.ts                       -- Cart-related TypeScript types
```

### 4.2 Server vs Client Component Decision Guide

| Component Type     | Rendering   | Why                                                |
| ------------------ | ----------- | -------------------------------------------------- |
| Page (data fetch)  | Server      | Fetch data, check auth, pass props down            |
| Layout (shell)     | Server      | Sidebar + topbar structure, auth context            |
| Data tables        | Client      | Interactive sorting, filtering, pagination          |
| Forms              | Client      | User input, validation, submission                  |
| Charts             | Client      | Recharts requires DOM                               |
| POS terminal       | Client      | Heavy interactivity, real-time cart                  |
| Status badges      | Server      | Simple render, no interactivity                      |
| Breadcrumbs        | Server      | Derived from URL, no interactivity                   |
| Loading/empty      | Server      | Pure presentation                                    |

### 4.3 Route Group Explanation

- `(auth)` -- Contains `/login` and `/auth/callback`. No sidebar layout. Public access.
- `(dashboard)` -- Contains all protected routes. Shares the sidebar/topbar layout. Requires authentication.

The parentheses in the folder name mean the group name is NOT included in the URL path. `/app/(dashboard)/pos/page.tsx` maps to URL `/pos`.

---

## 5. POS Module

### 5.1 Cart State Management with Zustand

```bash
npm install zustand
```

#### Cart Store -- `lib/store/cart-store.ts`

```typescript
import { create } from "zustand";

export interface CartItem {
  productId: string;
  name: string;
  barcode: string | null;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  taxAmount: number;
}

export interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  discountType: "fixed" | "percentage" | null;
  discountValue: number;
  notes: string;

  // Computed (derived in selectors)
  // Actions
  addItem: (product: Omit<CartItem, "quantity" | "discountAmount" | "lineTotal" | "taxAmount">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, amount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setCartDiscount: (type: "fixed" | "percentage" | null, value: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
}

function calculateLineItem(
  unitPrice: number,
  quantity: number,
  taxRate: number,
  discountAmount: number
): { lineTotal: number; taxAmount: number } {
  const subtotal = unitPrice * quantity - discountAmount;
  const taxAmount = subtotal * (taxRate / 100);
  const lineTotal = subtotal + taxAmount;
  return {
    lineTotal: Math.round(lineTotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customerId: null,
  customerName: null,
  discountType: null,
  discountValue: 0,
  notes: "",

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find(
        (item) => item.productId === product.productId
      );
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.productId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  ...calculateLineItem(
                    item.unitPrice,
                    item.quantity + 1,
                    item.taxRate,
                    item.discountAmount
                  ),
                }
              : item
          ),
        };
      }
      const calculated = calculateLineItem(
        product.unitPrice,
        1,
        product.taxRate,
        0
      );
      return {
        items: [
          ...state.items,
          { ...product, quantity: 1, discountAmount: 0, ...calculated },
        ],
      };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              ...calculateLineItem(
                item.unitPrice,
                quantity,
                item.taxRate,
                item.discountAmount
              ),
            }
          : item
      ),
    })),

  setItemDiscount: (productId, amount) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              discountAmount: amount,
              ...calculateLineItem(
                item.unitPrice,
                item.quantity,
                item.taxRate,
                amount
              ),
            }
          : item
      ),
    })),

  setCustomer: (id, name) =>
    set({ customerId: id, customerName: name }),

  setCartDiscount: (type, value) =>
    set({ discountType: type, discountValue: value }),

  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      customerId: null,
      customerName: null,
      discountType: null,
      discountValue: 0,
      notes: "",
    }),
}));

// Selectors
export function useCartTotals() {
  return useCartStore((state) => {
    const itemSubtotal = state.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
      0
    );
    const itemTaxTotal = state.items.reduce(
      (sum, item) => sum + item.taxAmount,
      0
    );

    let cartDiscount = 0;
    if (state.discountType === "fixed") {
      cartDiscount = state.discountValue;
    } else if (state.discountType === "percentage") {
      cartDiscount = itemSubtotal * (state.discountValue / 100);
    }
    cartDiscount = Math.round(cartDiscount * 100) / 100;

    const subtotal = Math.round(itemSubtotal * 100) / 100;
    const taxTotal = Math.round(itemTaxTotal * 100) / 100;
    const total = Math.round((subtotal + taxTotal - cartDiscount) * 100) / 100;

    return {
      subtotal,
      taxTotal,
      cartDiscount,
      total,
      itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  });
}
```

### 5.2 Sale Finalization Server Action -- `lib/actions/sales.ts`

```typescript
"use server";

import { authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

interface SaleInput {
  items: {
    productId: string;
    productName: string;
    productBarcode: string | null;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    lineTotal: number;
  }[];
  customerId: string | null;
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  discountType: "fixed" | "percentage" | null;
  total: number;
  paymentMethod: "cash" | "card" | "transfer" | "store_credit" | "split";
  amountPaid: number;
  changeGiven: number;
  paymentDetails?: Record<string, unknown>;
  notes?: string;
}

export async function createSale(input: SaleInput) {
  return authAction(async (user) => {
    const supabase = createAdminClient();

    // Insert sale
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        customer_id: input.customerId,
        cashier_id: user.id,
        subtotal: input.subtotal,
        tax_total: input.taxTotal,
        discount_amount: input.discountAmount,
        discount_type: input.discountType,
        total: input.total,
        payment_method: input.paymentMethod,
        payment_details: input.paymentDetails ?? null,
        amount_paid: input.amountPaid,
        change_given: input.changeGiven,
        notes: input.notes ?? null,
      })
      .select("id, sale_number")
      .single();

    if (saleError) throw new Error(`Sale creation failed: ${saleError.message}`);

    // Insert sale items (triggers handle stock decrement)
    const saleItems = input.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName,
      product_barcode: item.productBarcode,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      cost_price: item.costPrice,
      tax_rate: item.taxRate,
      tax_amount: item.taxAmount,
      discount_amount: item.discountAmount,
      line_total: item.lineTotal,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) throw new Error(`Sale items failed: ${itemsError.message}`);

    revalidatePath("/pos");
    revalidatePath("/reports");

    return { saleId: sale.id, saleNumber: sale.sale_number };
  });
}

export async function voidSale(saleId: string, reason: string) {
  return authAction(async (user) => {
    if (user.role !== "admin") {
      throw new Error("Only admins can void sales");
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("sales")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
      })
      .eq("id", saleId)
      .eq("status", "completed"); // prevent double-void

    if (error) throw new Error(`Void failed: ${error.message}`);

    revalidatePath("/pos");
    revalidatePath("/reports");
  });
}
```

### 5.3 Payment Flow

The payment dialog supports these methods:

| Method       | Flow                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| Cash         | Enter amount tendered, system calculates change                                      |
| Card         | Optional reference field, amount = total (no change)                                 |
| Transfer     | Optional reference field, amount = total                                             |
| Store Credit | Check customer balance, deduct from `customers.store_credit`                         |
| Split        | Enter amount per method in a `paymentDetails` JSON object, validate sum equals total |

Split payment `paymentDetails` example:

```json
{
  "methods": [
    { "type": "cash", "amount": 50.00 },
    { "type": "card", "amount": 75.00, "reference": "TXN-123" }
  ]
}
```

### 5.4 Receipt PDF Generation with jsPDF

```bash
npm install jspdf
```

#### Receipt Builder -- `lib/utils/receipt-pdf.ts`

```typescript
import jsPDF from "jspdf";

interface ReceiptData {
  saleNumber: number;
  date: string;
  cashierName: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  changeGiven: number;
}

interface StoreConfig {
  name: string;
  address: string;
  phone: string;
  taxId?: string;
}

export function generateReceiptPDF(
  data: ReceiptData,
  store: StoreConfig
): jsPDF {
  // 80mm thermal receipt width = ~226 points at 72dpi
  // Use mm units for clarity. Width = 80mm. Height = dynamic.
  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  // Estimate height: header(30) + items(items*6) + totals(40) + footer(20)
  const estimatedHeight = 30 + data.items.length * 6 + 60 + 20;
  const doc = new jsPDF({
    unit: "mm",
    format: [pageWidth, Math.max(estimatedHeight, 100)],
  });

  let y = 8;
  const fontSize = {
    title: 12,
    normal: 8,
    small: 7,
  };

  // Store header
  doc.setFontSize(fontSize.title);
  doc.text(store.name, pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(fontSize.small);
  doc.text(store.address, pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text(`Tel: ${store.phone}`, pageWidth / 2, y, { align: "center" });
  if (store.taxId) {
    y += 4;
    doc.text(`Tax ID: ${store.taxId}`, pageWidth / 2, y, { align: "center" });
  }

  // Separator
  y += 4;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Sale info
  doc.setFontSize(fontSize.normal);
  doc.text(`Receipt #${data.saleNumber}`, margin, y);
  y += 4;
  doc.text(`Date: ${data.date}`, margin, y);
  y += 4;
  doc.text(`Cashier: ${data.cashierName}`, margin, y);
  if (data.customerName) {
    y += 4;
    doc.text(`Customer: ${data.customerName}`, margin, y);
  }

  // Separator
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Column headers
  doc.setFontSize(fontSize.small);
  doc.text("Item", margin, y);
  doc.text("Qty", margin + contentWidth * 0.55, y, { align: "right" });
  doc.text("Price", margin + contentWidth * 0.75, y, { align: "right" });
  doc.text("Total", margin + contentWidth, y, { align: "right" });
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items
  data.items.forEach((item) => {
    // Truncate long names
    const name =
      item.name.length > 22 ? item.name.substring(0, 22) + ".." : item.name;
    doc.text(name, margin, y);
    doc.text(String(item.quantity), margin + contentWidth * 0.55, y, {
      align: "right",
    });
    doc.text(item.unitPrice.toFixed(2), margin + contentWidth * 0.75, y, {
      align: "right",
    });
    doc.text(item.lineTotal.toFixed(2), margin + contentWidth, y, {
      align: "right",
    });
    y += 5;
  });

  // Separator
  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Totals
  doc.setFontSize(fontSize.normal);
  const printTotal = (label: string, value: number) => {
    doc.text(label, margin, y);
    doc.text(value.toFixed(2), margin + contentWidth, y, { align: "right" });
    y += 4;
  };

  printTotal("Subtotal:", data.subtotal);
  if (data.taxTotal > 0) printTotal("Tax:", data.taxTotal);
  if (data.discountAmount > 0) printTotal("Discount:", -data.discountAmount);

  // Grand total (bold)
  doc.setFontSize(fontSize.title);
  printTotal("TOTAL:", data.total);
  doc.setFontSize(fontSize.normal);

  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Payment info
  printTotal(`Paid (${data.paymentMethod}):`, data.amountPaid);
  if (data.changeGiven > 0) printTotal("Change:", data.changeGiven);

  // Footer
  y += 4;
  doc.setFontSize(fontSize.small);
  doc.text("Thank you for your purchase!", pageWidth / 2, y, {
    align: "center",
  });
  y += 4;
  doc.text("Goods sold are not returnable", pageWidth / 2, y, {
    align: "center",
  });

  return doc;
}
```

### 5.5 Printing the Receipt

Two approaches, both browser-based:

**Approach A: Open PDF in new tab and trigger print dialog**

```typescript
const doc = generateReceiptPDF(data, storeConfig);
const pdfBlob = doc.output("blob");
const url = URL.createObjectURL(pdfBlob);
const printWindow = window.open(url);
if (printWindow) {
  printWindow.addEventListener("load", () => {
    printWindow.print();
  });
}
```

**Approach B: Use react-to-print for direct DOM printing (simpler, no PDF)**

```bash
npm install react-to-print
```

Create a hidden receipt component, ref it, and call `useReactToPrint()`. This is faster for thermal printers that work best with the browser print dialog set to the correct paper size. This avoids PDF rendering overhead.

**Recommended for MVP:** Use Approach A (jsPDF). It produces a physical artifact (PDF file) that can be saved, emailed, or reprinted later.

### 5.6 POS Edge Cases

1. **Barcode not found:** Show "Product not found" toast with option to search by name or add new product.
2. **Zero/negative stock:** Allow sale (backorder behavior) but show a warning badge. Some shops sell display items.
3. **Price changed during open cart:** Price is captured at the moment the item is added. The cart does NOT update retroactively if a product's price changes. This is standard POS behavior.
4. **Network failure mid-checkout:** The `createSale` server action will fail. The cart state is preserved in Zustand (memory). User retries when connection returns. For a 2-day MVP, this is acceptable. Offline queueing deferred to v2.
5. **Concurrent cashier sessions:** Each browser tab has its own Zustand store. No shared state conflicts.
6. **Voided transaction:** Admin-only action. Triggers stock restoration via database trigger. Records void reason and user.
7. **Split payment rounding:** Each payment method amount is entered explicitly. Validate that the sum of payments >= total before confirming.
8. **Receipt printer failure:** PDF opens in browser tab as fallback. User can retry print or save PDF.
9. **Duplicate barcode scan:** If the same barcode is scanned twice, quantity increments by 1 each time (desired behavior for most scanners).

---

## 6. Barcode Handling

> **Real data note:** All products are Moroccan school textbooks with ISBN-13 / EAN-13 barcodes (13-digit numeric). The `barcode` column is `VARCHAR(13)`. The shop owner has a USB barcode scanner and will scan each book during initial inventory setup. The `Référence` column in supplier invoices was empty (supplier did not fill it in), so barcodes are seeded as `NULL` and will be populated via scanning.

### 6.1 USB Barcode Scanner (Keyboard Wedge)

USB barcode scanners operate as HID keyboard devices. They "type" the barcode digits rapidly and append a terminator (usually Enter/Return).

#### Hook: `hooks/use-barcode-scanner.ts`

```typescript
import { useEffect, useCallback, useRef } from "react";

interface UseBarcodeScanner {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;        // minimum barcode length to accept
  maxDelay?: number;         // max ms between keystrokes to consider it a scan
  terminatorKey?: string;    // key that ends the scan (default: Enter)
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 4,
  maxDelay = 50,
  terminatorKey = "Enter",
}: UseBarcodeScanner) {
  const buffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;

      // If too much time has passed, reset the buffer
      if (timeSinceLastKey > maxDelay && buffer.current.length > 0) {
        buffer.current = "";
      }

      lastKeyTime.current = now;

      if (event.key === terminatorKey) {
        // Scanner has finished sending the barcode
        if (buffer.current.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          onScanRef.current(buffer.current);
        }
        buffer.current = "";
        return;
      }

      // Only accept printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Only add to buffer if the timing suggests scanner input
        if (buffer.current.length === 0 || timeSinceLastKey <= maxDelay) {
          buffer.current += event.key;
        }
      }
    },
    [enabled, minLength, maxDelay, terminatorKey]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [handleKeyDown, enabled]);
}
```

#### Usage in POS Page

```typescript
"use client";

import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useCartStore } from "@/lib/store/cart-store";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function PosPage() {
  const addItem = useCartStore((s) => s.addItem);
  const supabase = createClient();

  const handleBarcodeScan = async (barcode: string) => {
    const { data: product, error } = await supabase
      .from("products")
      .select("id, name, barcode, selling_price, purchase_price, tax_rate")
      .eq("barcode", barcode)
      .eq("is_active", true)
      .single();

    if (error || !product) {
      toast.error(`Product not found: ${barcode}`);
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      unitPrice: product.selling_price,
      costPrice: product.purchase_price,
      taxRate: product.tax_rate,
    });

    toast.success(`Added: ${product.name}`);
  };

  useBarcodeScanner({ onScan: handleBarcodeScan });

  // ... rest of POS UI
}
```

### 6.2 Camera-Based Barcode Scanning Fallback

For mobile stocktaking or when no USB scanner is available.

```bash
npm install @zxing/browser @zxing/library
```

#### Component: `components/shared/camera-scanner.tsx`

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
        if (result) {
          onScan(result.getText());
        }
        // err is expected when no barcode is detected in frame
      })
      .catch((e) => {
        setError("Camera access denied or not available.");
        console.error(e);
      });

    return () => {
      // Cleanup: stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
      {error ? (
        <div className="text-white p-4">
          <p>{error}</p>
          <button onClick={onClose} className="mt-4 underline">
            Close
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full max-w-md rounded-lg"
            autoPlay
            playsInline
          />
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-white text-black rounded"
          >
            Close Scanner
          </button>
        </>
      )}
    </div>
  );
}
```

### 6.3 Barcode Label Generation (Product Labels)

```bash
npm install jsbarcode
```

#### Component: `products/_components/barcode-label.tsx`

```typescript
"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeLabelProps {
  value: string;
  productName: string;
  price: number;
  format?: string; // "EAN13", "CODE128", "UPC", etc.
}

export function BarcodeLabel({
  value,
  productName,
  price,
  format = "EAN13",   // Default to EAN-13 (all products are ISBN-13 textbooks)
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (e) {
        console.error("Barcode generation failed:", e);
      }
    }
  }, [value, format]);

  return (
    <div className="inline-block border p-2 text-center bg-white">
      <p className="text-xs font-medium truncate max-w-[200px]">
        {productName}
      </p>
      <svg ref={svgRef} />
      <p className="text-sm font-bold">{price.toFixed(2)} MAD</p>
    </div>
  );
}
```

Print labels by selecting products and rendering `BarcodeLabel` components into a printable page via `window.print()` or `react-to-print`.

---

## 7. Print Order Workflow

### 7.1 Status State Machine

```
registered --> in_progress --> ready --> delivered
     |              |           |
     +--> cancelled <-----------+
```

Rules:
- Any status can transition to `cancelled`.
- Status can only move forward (no going from `ready` back to `in_progress`).
- When status changes to `delivered` AND `is_paid = false`, prompt for payment (convert to sale).

### 7.2 File Upload to Supabase Storage

```typescript
// Inside a Client Component
"use client";

import { createClient } from "@/lib/supabase/client";

async function uploadPrintFile(file: File, orderId: string): Promise<string> {
  const supabase = createClient();

  const fileExt = file.name.split(".").pop();
  const filePath = `${orderId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("print-files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return data.path;
}

async function getSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from("print-files")
    .createSignedUrl(filePath, 3600); // 1 hour validity

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}
```

### 7.3 Print Order Server Actions -- `lib/actions/print-orders.ts`

```typescript
"use server";

import { authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

interface CreatePrintOrderInput {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceType: "printing" | "copying" | "binding" | "laminating" | "scanning" | "other";
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  filePaths: string[];
  notes?: string;
  dueDate?: string;
}

export async function createPrintOrder(input: CreatePrintOrderInput) {
  return authAction(async (user) => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("print_orders")
      .insert({
        customer_id: input.customerId || null,
        customer_name: input.customerName,
        customer_phone: input.customerPhone || null,
        service_type: input.serviceType,
        description: input.description,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        total_price: input.totalPrice,
        file_paths: input.filePaths,
        notes: input.notes || null,
        due_date: input.dueDate || null,
        created_by: user.id,
      })
      .select("id, order_number")
      .single();

    if (error) throw new Error(`Create failed: ${error.message}`);

    revalidatePath("/print-orders");
    return data;
  });
}

export async function updatePrintOrderStatus(
  orderId: string,
  newStatus: "in_progress" | "ready" | "delivered" | "cancelled"
) {
  return authAction(async (user) => {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "ready") updateData.completed_at = new Date().toISOString();
    if (newStatus === "delivered") updateData.delivered_at = new Date().toISOString();

    const { error } = await supabase
      .from("print_orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) throw new Error(`Status update failed: ${error.message}`);

    revalidatePath("/print-orders");
    revalidatePath(`/print-orders/${orderId}`);
  });
}

export async function convertPrintOrderToSale(orderId: string) {
  return authAction(async (user) => {
    const supabase = createAdminClient();

    // Fetch the print order
    const { data: order, error: fetchError } = await supabase
      .from("print_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) throw new Error("Order not found");
    if (order.is_paid) throw new Error("Order already paid");

    // Create a sale for this print order
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        customer_id: order.customer_id,
        cashier_id: user.id,
        subtotal: order.total_price,
        tax_total: 0,
        discount_amount: 0,
        total: order.total_price,
        payment_method: "cash", // will be overridden by caller
        amount_paid: order.total_price,
        change_given: 0,
        notes: `Print order #${order.order_number}`,
      })
      .select("id, sale_number")
      .single();

    if (saleError) throw new Error(`Sale creation failed: ${saleError.message}`);

    // Link sale to print order and mark as paid
    await supabase
      .from("print_orders")
      .update({
        is_paid: true,
        linked_sale_id: sale.id,
      })
      .eq("id", orderId);

    revalidatePath("/print-orders");
    revalidatePath("/pos");

    return sale;
  });
}
```

### 7.4 Print Order Form UX

The print order form includes:
- Customer lookup (search existing or enter name/phone manually)
- Service type dropdown
- Description textarea (what to print, specs)
- Quantity and unit price inputs (auto-calculates total)
- File upload zone (drag-and-drop, multiple files)
- Due date picker
- Notes field

---

## 8. Reporting

### 8.1 Report Queries via Supabase Views

The views defined in Section 1.15 (`v_daily_sales`, `v_product_performance`, `v_low_stock`, `v_print_order_summary`) are queryable from the Supabase JS client just like tables:

```typescript
// Server Component: fetch daily sales report
const supabase = await createClient();

// Daily sales for a date range
const { data: dailySales } = await supabase
  .from("v_daily_sales")
  .select("*")
  .gte("sale_date", startDate)
  .lte("sale_date", endDate)
  .order("sale_date", { ascending: false });

// Low stock products
const { data: lowStock } = await supabase
  .from("v_low_stock")
  .select("*")
  .order("stock_quantity", { ascending: true });

// Product performance
const { data: topProducts } = await supabase
  .from("v_product_performance")
  .select("*")
  .order("total_sold", { ascending: false })
  .limit(20);
```

### 8.2 Dashboard KPIs (Server Component Query)

```typescript
// app/(dashboard)/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Today's sales summary
  const { data: todaySales } = await supabase
    .from("v_daily_sales")
    .select("*")
    .eq("sale_date", today)
    .single();

  // Pending print orders
  const { count: pendingPrintOrders } = await supabase
    .from("print_orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["registered", "in_progress"]);

  // Low stock count
  const { count: lowStockCount } = await supabase
    .from("v_low_stock")
    .select("*", { count: "exact", head: true });

  // Recent sales (last 10)
  const { data: recentSales } = await supabase
    .from("sales")
    .select("id, sale_number, total, payment_method, created_at, status")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    // Render KPI cards, recent sales table, charts
    // Pass data to client chart components
  );
}
```

### 8.3 CSV Export -- `lib/utils/csv-export.ts`

```typescript
export function generateCSV(
  headers: string[],
  rows: Record<string, unknown>[]
): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Escape values containing commas or quotes
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### 8.4 PDF Report Generation -- `lib/utils/report-pdf.ts`

```typescript
import jsPDF from "jspdf";

interface ReportConfig {
  title: string;
  dateRange: string;
  columns: { header: string; key: string; width: number; align?: "left" | "right" | "center" }[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string }[];
}

export function generateReportPDF(config: ReportConfig): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.text(config.title, pageWidth / 2, y, { align: "center" });
  y += 8;

  // Date range
  doc.setFontSize(10);
  doc.text(config.dateRange, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Table header
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  let x = margin;
  config.columns.forEach((col) => {
    doc.text(col.header, x, y, { align: col.align || "left" });
    x += col.width;
  });
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Table rows
  doc.setFont("helvetica", "normal");
  config.rows.forEach((row) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    x = margin;
    config.columns.forEach((col) => {
      const val = String(row[col.key] ?? "");
      doc.text(val, x, y, { align: col.align || "left" });
      x += col.width;
    });
    y += 5;
  });

  // Summary
  if (config.summary) {
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    config.summary.forEach(({ label, value }) => {
      doc.text(`${label}: ${value}`, margin, y);
      y += 5;
    });
  }

  return doc;
}
```

### 8.5 Route Handler for CSV Export -- `app/api/reports/export-csv/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const reportType = searchParams.get("type");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  let csv = "";

  if (reportType === "sales") {
    const { data } = await supabase
      .from("v_daily_sales")
      .select("*")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate)
      .order("sale_date", { ascending: false });

    if (data) {
      const headers = ["sale_date", "transaction_count", "total_revenue", "total_tax", "total_discounts", "average_basket_size"];
      csv = headers.join(",") + "\n";
      csv += data
        .map((row) => headers.map((h) => row[h as keyof typeof row]).join(","))
        .join("\n");
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${reportType}-report-${startDate}-${endDate}.csv"`,
    },
  });
}
```

---

## 9. Key Libraries

### 9.1 Complete Package List

```bash
# Core framework
npm install next@15 react@19 react-dom@19

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI
npm install tailwindcss @tailwindcss/postcss postcss
npx shadcn@latest init

# State management
npm install zustand

# Data tables
npm install @tanstack/react-table

# Charts
npm install recharts

# PDF generation
npm install jspdf

# Barcode generation (labels)
npm install jsbarcode

# Barcode scanning (camera fallback)
npm install @zxing/browser @zxing/library

# Form validation
npm install zod

# Date handling
npm install date-fns

# Printing
npm install react-to-print

# Toast notifications (part of shadcn/ui, or use sonner)
npx shadcn@latest add sonner
```

### 9.2 shadcn/ui Components to Install

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add separator
npx shadcn@latest add sheet
npx shadcn@latest add textarea
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add form
npx shadcn@latest add skeleton
npx shadcn@latest add alert
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
npx shadcn@latest add switch
```

### 9.3 Library Notes and Breaking Changes

| Library               | Version   | Notes                                                                 |
| --------------------- | --------- | --------------------------------------------------------------------- |
| Next.js               | 15.x      | App Router stable. `middleware.ts` still works. Renamed to `proxy.ts` in v16. Do NOT use `proxy.ts` with Next.js 15. |
| @supabase/ssr         | 0.5+      | Replaces @supabase/auth-helpers. Use `getAll`/`setAll` cookie pattern only. Never use `get`/`set`/`remove`. |
| @supabase/supabase-js | 2.47+     | The anon key is now called "publishable key" in docs, but the env var can be named anything. |
| Zustand               | 5.x       | Major version since late 2024. The `create` API is unchanged. Middleware approach is stable. |
| @tanstack/react-table | 8.x       | Headless -- you control all markup. Integrates perfectly with shadcn/ui `<Table>`. |
| Recharts              | 2.15+     | Built on D3. Client-side only. Use `"use client"` directive on chart components. |
| jsPDF                 | 2.5+      | Client-side PDF. Works in browser and Node.js. No tree-shaking issues with Next.js. |
| JsBarcode             | 3.11+     | Renders to SVG, Canvas, or IMG. Supports EAN-13, EAN-8, UPC-A, CODE128, CODE39. |
| @zxing/browser        | 0.1+      | Camera barcode scanning. Peer depends on @zxing/library. Both are required. |
| react-to-print        | 3.0+      | v3 uses `useReactToPrint` hook. Moved from class refs to functional approach. |
| date-fns              | 4.x       | Major rewrite with tree-shakeable imports. Use `import { format } from "date-fns"`. |
| Zod                   | 3.24+     | Standard schema validation. Integrates with React Hook Form via `@hookform/resolvers/zod`. |

---

## 10. Gotchas and Risks

### 10.1 Supabase Realtime

- **Do NOT use Realtime for the MVP.** It adds complexity (websocket management, subscription cleanup, state reconciliation) with minimal benefit for a 1-3 user shop.
- If added later (v2), Realtime subscriptions in Next.js must be created in Client Components only. They cannot run in Server Components.
- React Strict Mode in development double-mounts components, causing duplicate subscriptions. Always return a cleanup function from `useEffect`.
- Supabase Realtime has message throughput limits on the free tier. For a small shop, this is not a concern.

### 10.2 PDF Generation in Next.js

- **jsPDF runs client-side.** It uses the Canvas API internally. Do NOT attempt to run it in a Server Component or server action.
- For server-side PDF generation (e.g., scheduled reports), use an API Route Handler and run jsPDF there (Route Handlers run in Node.js, which has Canvas polyfills, but it is simpler to generate PDFs client-side and download them).
- **@react-pdf/renderer** is an alternative for React-component-based PDFs, but it had bugs in Next.js 14 and requires `serverComponentsExternalPackages` config. Avoid it for the MVP; jsPDF is simpler.
- **Puppeteer** produces pixel-perfect PDFs from HTML but requires a Chromium binary. Avoid for the MVP. It is heavy (~300MB), slow to cold-start, and complex to deploy.

### 10.3 Browser Print Dialog

- You CANNOT programmatically control the browser print dialog. You cannot set paper size, margins, or printer selection. The user must configure their thermal printer paper size (80mm) in OS printer settings.
- `window.print()` opens the native print dialog. There is no way to bypass it.
- **Workaround:** Use jsPDF to generate an 80mm-wide PDF, open it in a new tab, and let the user print from there. The PDF dimensions will hint at the correct paper size.
- Chrome's print preview can be slow for large documents. Keep receipts simple (text only, no images).

### 10.4 Supabase Auth Cookie Handling

- **CRITICAL:** The `@supabase/ssr` package requires both `getAll()` and `setAll()` cookie methods. Using the old `get()`, `set()`, `remove()` pattern will cause silent auth failures.
- The middleware MUST call `supabase.auth.getUser()` on every request to refresh tokens. If you skip this, sessions will expire unexpectedly.
- Server Components cannot write cookies. The middleware handles cookie writes. The `try/catch` in the server client's `setAll` is intentional and expected.

### 10.5 Stock Integrity

- Stock decrements happen via a database trigger (`on_sale_item_inserted`). This is atomic and avoids race conditions that would occur with application-level stock updates.
- Negative stock is allowed by design. Some shops sell items they will restock. Add a check constraint if you want to prevent it: `ALTER TABLE products ADD CONSTRAINT positive_stock CHECK (stock_quantity >= 0);`
- The void trigger restores stock. Ensure the void action is admin-only to prevent accidental stock inflation.

### 10.6 SERIAL Columns for Human-Readable Numbers

- `sale_number`, `po_number`, `order_number` use PostgreSQL `SERIAL` type. These auto-increment and are guaranteed unique within the table.
- SERIAL values are NOT gap-free. If a transaction is rolled back, the number is consumed. This is normal and expected in retail systems.
- Do NOT use these as primary keys. Use UUID primary keys for all foreign key references. SERIAL is for display only.

### 10.7 Supabase Free Tier Limits

- 500MB database storage
- 1GB file storage
- 50,000 monthly active users (auth)
- 2GB bandwidth
- For a single small shop, these limits are generous. Monitor storage usage if handling many print order files.

### 10.8 Next.js 15 Specific

- `cookies()` from `next/headers` is now async in Next.js 15. Always `await cookies()`.
- Server Actions must be in files with `"use server"` directive at the top, or individual functions must have the directive.
- `revalidatePath` and `revalidateTag` are the primary cache invalidation mechanisms after mutations.
- Route Handlers (`route.ts`) in the App Router handle GET, POST, PUT, DELETE as exported functions.

### 10.9 Data Validation

- ALWAYS validate input in server actions using Zod before database operations. Never trust client-side form data.
- Example pattern:

```typescript
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1).max(255),
  purchase_price: z.number().min(0),
  selling_price: z.number().positive().optional().nullable(),
  barcode: z.string().max(13).optional(),
  category_id: z.string().uuid().optional(),
  tax_rate: z.number().min(0).max(100).default(0),
});

// In server action:
const parsed = ProductSchema.safeParse(input);
if (!parsed.success) {
  throw new Error(`Validation failed: ${parsed.error.message}`);
}
```

---

## 11. MVP Scope and Build Order

### 11.1 Two-Day Sprint Plan

#### Day 1 Morning (4 hours): Foundation

| # | Task                                | Time   |
|---|-------------------------------------|--------|
| 1 | `npx create-next-app@15` with Tailwind, TypeScript | 10 min |
| 2 | `npx shadcn@latest init` + install all UI components | 15 min |
| 3 | Set up Supabase project, copy keys to `.env.local` | 10 min |
| 4 | Run full SQL schema (Section 1) in Supabase SQL editor | 20 min |
| 5 | Run RLS policies (Section 2) in SQL editor | 15 min |
| 6 | Create Storage bucket for print files | 5 min  |
| 7 | Create Supabase client utilities (Section 3.3) | 15 min |
| 8 | Create middleware (Section 3.4) | 15 min |
| 9 | Build login page with email/password | 30 min |
| 10 | Build dashboard layout (sidebar + topbar) | 45 min |
| 11 | Build dashboard home page with placeholder KPIs | 30 min |
| 12 | Create first admin user via Supabase dashboard, test login | 10 min |

**Checkpoint:** Login works. Dashboard layout renders. Sidebar navigates.

#### Day 1 Afternoon (4 hours): POS + Products

| # | Task                                | Time   |
|---|-------------------------------------|--------|
| 13 | Build product list page (data table) | 45 min |
| 14 | Build product create/edit form | 40 min |
| 15 | Build category CRUD (simple dialog) | 30 min |
| 16 | Build POS page layout (2 panels: product search + cart) | 30 min |
| 17 | Implement Zustand cart store | 20 min |
| 18 | Implement product search + barcode scanner hook | 30 min |
| 19 | Implement payment dialog (cash only for now) | 25 min |
| 20 | Implement `createSale` server action | 20 min |

**Checkpoint:** Can add products, scan barcodes, build a cart, checkout with cash.

#### Day 2 Morning (4 hours): Print Orders + Receipts + Customers

| # | Task                                | Time   |
|---|-------------------------------------|--------|
| 21 | Build receipt PDF generation (jsPDF) | 40 min |
| 22 | Add card + transfer payment methods | 20 min |
| 23 | Build customer list + create/edit | 30 min |
| 24 | Link customers to POS sales | 15 min |
| 25 | Build print order list page | 30 min |
| 26 | Build print order create form with file upload | 40 min |
| 27 | Build print order detail + status update | 30 min |
| 28 | Convert print order to sale (payment flow) | 15 min |

**Checkpoint:** Full POS with receipts. Print order workflow functional. Customers linkable.

#### Day 2 Afternoon (4 hours): Reports + Polish

| # | Task                                | Time   |
|---|-------------------------------------|--------|
| 29 | Build dashboard KPIs (real data) | 30 min |
| 30 | Build daily sales chart (Recharts) | 25 min |
| 31 | Build sales report page with date range | 30 min |
| 32 | Build low stock report | 20 min |
| 33 | CSV export for sales report | 20 min |
| 34 | Build void sale flow (admin only) | 20 min |
| 35 | Add role-based UI guards (hide admin-only buttons for employees) | 20 min |
| 36 | Run `supabase/seed.sql` (215 real products from invoices) | 5 min  |
| 37 | Test end-to-end: login, POS, receipt, print order, report, void | 30 min |
| 38 | Bug fixes and polish | remaining |

**Checkpoint:** Full MVP functional. Demo-ready.

### 11.2 What to Simplify for MVP

| Feature                | Full Version             | MVP Simplification                        |
| ---------------------- | ------------------------ | ----------------------------------------- |
| Payment methods        | Cash, card, transfer, credit, split | Cash + card + transfer only. No split. |
| Tax calculation        | Per-product tax rates    | Single flat tax rate in app settings      |
| Receipt template       | Customizable per store   | Hardcoded store info in constants         |
| Product images         | Upload + display         | Skip. Text-only product list.             |
| Customer loyalty       | Points, tiers, rewards   | Skip entirely. Just name + contact.       |
| Barcode labels         | Batch print labels       | Single label preview only.                |
| Stock alerts           | Email/push notifications | Dashboard badge only.                     |
| Supplier management    | Full CRUD + PO workflow  | Basic supplier list. No purchase orders.  |
| Reports PDF export     | Formatted PDF reports    | CSV export only.                          |
| Camera scanner         | ZXing integration        | Skip. USB scanner only.                   |

### 11.3 What to Defer to v2

| Feature                       | Reason to Defer                          |
| ----------------------------- | ---------------------------------------- |
| ISBN auto-fill from barcode scan | See Section 11.4 below                |
| Offline mode / PWA            | Requires IndexedDB queue, sync logic     |
| Supabase Realtime             | Not needed for 1-3 concurrent users      |
| Purchase order workflow       | Admin can adjust stock manually for now   |
| Split tender payments         | Edge case; cash/card covers 95% of sales |
| Customer store credit         | Requires balance tracking + deduction     |
| Barcode label batch printing  | Nice-to-have, not essential              |
| Sales by employee report      | Standard reports cover MVP               |
| Product images upload         | Text descriptions suffice                |
| Multi-store support           | Single-store for MVP                     |
| Audit log / activity trail    | created_at/updated_at columns suffice    |
| Email receipts                | PDF download covers the need             |
| Dark mode                     | Purely cosmetic                          |
| Mobile-responsive POS         | Desktop browser target for MVP           |
| Return/refund workflow        | Admin can void + re-sell for now         |

### 11.4 v2 Opportunity: ISBN Auto-Fill from Barcode Scan

Since all products in this shop are **Moroccan school textbooks with ISBN-13 barcodes**, a high-value v2 feature would be auto-filling product details when a barcode is scanned during product creation or initial setup.

**How it would work:**

1. Owner scans a book's ISBN-13 barcode with the USB scanner
2. System looks up the ISBN against one or more databases:
   - **Open Library API** (`https://openlibrary.org/isbn/{isbn}.json`) -- free, no API key, has many Moroccan textbooks
   - **Google Books API** (`https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`) -- free tier available
   - **A local Moroccan curriculum ISBN database** (if one exists or can be built from ministry of education data)
3. Auto-populate: product name, subject, grade level, category, publisher, cover image URL
4. Owner confirms or edits the auto-filled data, then sets the selling price

**Why this is valuable:**
- The shop has 215+ textbooks that all need barcode scanning during initial setup
- Without auto-fill, the owner must manually type each product name while scanning
- With auto-fill, scanning = done -- the name, category, and grade are filled automatically
- Future restocking: scan a new book, it auto-creates the product entry

**Implementation notes:**
- Call the ISBN API from a server action (not client-side, to avoid CORS issues)
- Cache results in a `isbn_cache` table to avoid redundant API calls
- Fallback gracefully: if ISBN not found, just fill in the barcode and let the owner type the name
- Map the book's subject/grade from API metadata to the existing category tree

---

## Appendix A: TypeScript Types Generation

Generate types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id your-project-id > lib/types/database.ts
```

Then use them:

```typescript
import { Database } from "@/lib/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type Sale = Database["public"]["Tables"]["sales"]["Row"];
```

## Appendix B: Seed Data (Real Supplier Invoices)

The file `supabase/seed.sql` contains **real data** parsed from 3 supplier invoice `.xlsx` files in `/seed-data/`. Run it in the Supabase SQL editor after creating the schema.

### Source Files

| File | Language | Line Items | Subtotal (MAD) |
|------|----------|-----------|-----------------|
| `Copie de LIBRAIRIE AL HABACHI (Enregistré automatiquement).xlsx` | Arabic | 102 | 9,238.49 |
| `Copie de LIBRAIRIE AL HABACHI Francais.xlsx` | French | 95 | 17,873.00 |
| `Copie de LIBRAIRIE AL HABACHI ANGLAIS.xlsx` | English | 18 | 4,370.00 |
| **Total** | | **215** | **31,481.49** |

All three invoices are from the same supplier with a 20% discount applied.

### Supplier

| Field | Value |
|-------|-------|
| Name | مكتبة الحبشي / Librairie Al Habachi |
| Contact | Nabil Habachi / نبيل حبشي |
| Address | Hay Alamal 9 Juillet N°46, Settat 26000 |
| Phone | 0661892286 / 05 23 40 65 36 |
| Email | elim.technique@gmail.com |

### What `seed.sql` contains

1. **1 supplier** -- Nabil Habachi / مكتبة الحبشي (the shop's main supplier)
2. **60 categories** -- 3 top-level (Arabic, French, English) + 57 subcategories (subject + grade extracted from Arabic invoice headers; French and English items sit under their language parent)
3. **215 products** -- All textbooks from the invoices, with `purchase_price` from the invoice `Prix` column, `barcode = NULL` (owner will scan ISBN-13 during setup), `selling_price = NULL` (owner will set retail prices manually)
4. **3 purchase orders** -- One per invoice file, status = `received`
5. **215 purchase items** -- Line items linking products to their purchase orders

### Post-Seed Setup Steps

After running `seed.sql`:

1. Create the admin user via Supabase Auth (email/password signup)
2. Copy the admin user UUID from `auth.users`
3. Run: `UPDATE public.purchase_orders SET created_by = '<admin-uuid>';`
4. Owner scans each book with USB barcode scanner to populate `barcode` field
5. Owner sets `selling_price` for each product

### Sample Customers (add manually or via the app)

```sql
INSERT INTO public.customers (name, email, phone) VALUES
  ('Walk-in Customer', NULL, NULL);
```

## Appendix C: Store Configuration Constants

```typescript
// lib/utils/constants.ts
export const STORE_CONFIG = {
  name: "مكتبة / Library Bookshop & Print",
  address: "Settat, Morocco",
  phone: "", // owner to fill in
  taxId: "",
  currency: "MAD",
  currencySymbol: "MAD ",  // Moroccan Dirham, prefix format
  defaultTaxRate: 0, // Morocco has VAT but small bookshops may be exempt
  receiptFooter: "!شكرا لزيارتكم / Merci de votre visite!",
  receiptDisclaimer: "Goods sold are not returnable without receipt.",
};
```

## Appendix D: Zod Validation Schemas

```typescript
// lib/utils/validation.ts
import { z } from "zod";

export const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().optional(),
  barcode: z.string().max(13, "Barcode must be 13 chars max (ISBN-13/EAN-13)").optional(),
  sku: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  purchase_price: z.coerce.number().min(0, "Purchase price must be non-negative"),
  selling_price: z.coerce.number().positive("Selling price must be positive").optional().nullable(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),
  unit: z.string().default("piece"),
});

export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const PrintOrderSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  customer_id: z.string().uuid().optional().nullable(),
  service_type: z.enum(["printing", "copying", "binding", "laminating", "scanning", "other"]),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().min(0),
  total_price: z.coerce.number().min(0),
  notes: z.string().optional(),
  due_date: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
```

## Appendix E: Format Utilities

```typescript
// lib/utils/format.ts
import { format, formatDistanceToNow } from "date-fns";
import { STORE_CONFIG } from "./constants";

export function formatCurrency(amount: number): string {
  return `${STORE_CONFIG.currencySymbol}${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM dd, yyyy");
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM dd, yyyy HH:mm");
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatSaleNumber(num: number): string {
  return `#${String(num).padStart(6, "0")}`;
}

export function formatOrderNumber(num: number): string {
  return `PO-${String(num).padStart(4, "0")}`;
}

export function formatPrintOrderNumber(num: number): string {
  return `PR-${String(num).padStart(4, "0")}`;
}
```

---

## Document Verification Sources

The following sources were consulted and verified during the research phase:

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Next.js Middleware (proxy.js)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- v16 rename noted, using middleware.ts for v15
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth Server-Side for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase SSR Client Creation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase AI Prompt: Next.js Auth](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Storage Upload API](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Views](https://supabase.com/docs/guides/graphql/views)
- [jsPDF npm](https://www.npmjs.com/package/jspdf)
- [JsBarcode](https://github.com/lindell/JsBarcode)
- [@zxing/browser](https://www.npmjs.com/package/@zxing/browser)
- [TanStack Table v8](https://tanstack.com/table/v8)
- [Recharts](https://recharts.github.io/en-US/guide/installation/)
- [Zustand](https://zustand.docs.pmnd.rs/)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table)
- [react-to-print](https://www.npmjs.com/package/react-to-print)
- [PapaParse](https://www.papaparse.com/)

---

*End of Blueprint*
