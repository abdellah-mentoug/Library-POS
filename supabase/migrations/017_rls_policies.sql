-- Migration 017: Row-Level Security policies for all tables and storage
-- Design philosophy:
--   Admin can see and do everything.
--   Employee can see most data, create sales and print orders,
--   but cannot void sales, manage users, or delete products.
--   Write-side mutations go through server actions with the service role key.

-- ============================================================
-- PROFILES
-- ============================================================
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

-- Users can update their own profile (name, avatar only -- role change handled server-side)
CREATE POLICY "Profiles: self can update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- CATEGORIES
-- ============================================================
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

-- ============================================================
-- PRODUCTS
-- ============================================================
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

-- ============================================================
-- SALES
-- ============================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- SALE ITEMS
-- ============================================================
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Sale items follow parent sale access
CREATE POLICY "Sale items: authenticated can read"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Sale items: authenticated can insert"
  ON public.sale_items FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
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

-- ============================================================
-- CUSTOMERS
-- ============================================================
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

-- ============================================================
-- SUPPLIERS
-- ============================================================
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

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POs: authenticated can read"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "POs: admin can manage"
  ON public.purchase_orders FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- PURCHASE ITEMS
-- ============================================================
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PO items: authenticated can read"
  ON public.purchase_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "PO items: admin can manage"
  ON public.purchase_items FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- PRINT ORDERS
-- ============================================================
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

-- ============================================================
-- STORAGE: print-files bucket
-- ============================================================

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
