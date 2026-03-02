# Execution Plan -- Library POS System

Generated from: research.md
Date: 2026-02-28

---

## Overview

A point-of-sale and print-order management system for a Moroccan bookshop and print shop in Settat, Morocco. The shop sells school textbooks (Arabic, French, English) and provides printing/copying/binding services. The system is designed for 1 admin (shop owner) plus 1-2 employees, running in a desktop browser.

### Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database & Auth:** Supabase (PostgreSQL, Auth, Storage)
- **Styling:** Tailwind CSS v4
- **Component Library:** shadcn/ui
- **State Management:** Zustand (POS cart)
- **Data Tables:** TanStack React Table v8
- **Charts:** Recharts
- **PDF Generation:** jsPDF (receipts and reports, client-side only)
- **Barcode:** JsBarcode (label generation), USB keyboard-wedge scanner hook
- **Validation:** Zod
- **Dates:** date-fns

### Key Architectural Decisions

1. All database writes go through Next.js Server Actions using the Supabase service role key (bypasses RLS). Read-side RLS enforces role visibility.
2. POS cart state lives in a Zustand store (client-side memory). No persistence across page reloads for MVP.
3. Stock decrements are handled by a PostgreSQL trigger on `sale_items` INSERT, not by application code. This is atomic and race-condition-free.
4. PDF generation (receipts, reports) runs client-side only via jsPDF. Never attempt to run jsPDF in Server Components or Server Actions.
5. The middleware refreshes auth tokens on every request and redirects unauthenticated users to `/login`.
6. Currency is MAD (Moroccan Dirham). All prices use `NUMERIC(10,2)`.
7. `selling_price` is nullable -- the owner sets retail prices manually after inventory is loaded.
8. `barcode` is `VARCHAR(13)` nullable -- the owner scans ISBN-13 barcodes with a USB scanner during setup.

---

## Prerequisites & Environment Setup

### Required Tools

| Tool             | Version     | Purpose                           |
| ---------------- | ----------- | --------------------------------- |
| Node.js          | 20+ LTS     | Runtime                           |
| npm              | 10+         | Package manager (ships with Node) |
| Git              | Any recent  | Version control                   |
| Supabase account | Free tier   | Database, Auth, Storage           |
| Web browser      | Chrome/Edge | Development and production use    |

### Supabase Project Setup (Manual -- before any code)

1. Go to https://supabase.com and create a new project.
2. Note the project URL and keys from Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key -- NEVER expose to client)
3. In the SQL Editor, enable the trigram extension: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### Environment Variables

Create `.env.local` in the project root with these variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Add `.env.local` to `.gitignore` (Next.js does this by default).

---

## Phase 0: Project Bootstrap

### Objective

Scaffold a clean Next.js 15 app with all dependencies installed, Tailwind CSS configured, shadcn/ui initialized, and the dev server running cleanly with zero errors before writing any feature code.

### Steps

#### 0.1 Create the Next.js project

Run from the project root directory (`C:\Users\Mr\Desktop\Library`):

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

If the directory is not empty (it contains `research.md`, `seed-data/`, `supabase/`, etc.), the scaffold tool may warn. Accept the prompt to proceed -- it will not overwrite existing files.

If the scaffold refuses because the directory is not empty, create the app in a temp directory and move files:

```bash
npx create-next-app@15 temp-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

Then move all generated files and folders (except `.git` if present) from `temp-app/` into the project root and delete `temp-app/`.

#### 0.2 Install core dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zustand
npm install @tanstack/react-table
npm install recharts
npm install jspdf
npm install jsbarcode
npm install zod
npm install date-fns
npm install react-to-print
npm install sonner
```

Note: `@zxing/browser` and `@zxing/library` (camera barcode scanning) are deferred to v2 per research.md Section 11.2. Do NOT install them now.

#### 0.3 Install dev dependencies

```bash
npm install -D @types/jsbarcode
```

#### 0.4 Initialize shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:

- Style: Default
- Base color: Neutral (or Slate)
- CSS variables: Yes
- Path aliases already set via `@/*`

This creates `components.json` and sets up the `src/components/ui/` directory.

#### 0.5 Install all required shadcn/ui components

Run each command one at a time. These install into `src/components/ui/`:

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
npx shadcn@latest add sonner
```

#### 0.6 Create the `.env.local` file

Create `src/../.env.local` (project root) with the three Supabase env vars listed in the Prerequisites section above. Use actual values from the Supabase dashboard.

#### 0.7 Create directory structure

Create the following empty directories to establish the project skeleton. Every file and folder listed here will be populated in subsequent phases:

```
src/lib/supabase/          -- Supabase client utilities
src/lib/actions/           -- Server actions
src/lib/store/             -- Zustand stores
src/lib/utils/             -- Formatting, PDF, CSV, validation, constants
src/lib/types/             -- TypeScript types
src/hooks/                 -- Custom React hooks
src/components/layout/     -- Sidebar, topbar, breadcrumbs
src/components/shared/     -- Reusable components (data-table, confirm-dialog, etc.)
src/app/(auth)/login/      -- Login page
src/app/(auth)/auth/callback/ -- OAuth callback route
src/app/(dashboard)/       -- All protected pages
src/app/(dashboard)/pos/_components/
src/app/(dashboard)/products/_components/
src/app/(dashboard)/products/new/
src/app/(dashboard)/products/[id]/edit/
src/app/(dashboard)/categories/_components/
src/app/(dashboard)/print-orders/_components/
src/app/(dashboard)/print-orders/new/
src/app/(dashboard)/print-orders/[id]/
src/app/(dashboard)/customers/_components/
src/app/(dashboard)/customers/[id]/
src/app/(dashboard)/suppliers/_components/
src/app/(dashboard)/purchases/_components/
src/app/(dashboard)/purchases/new/
src/app/(dashboard)/purchases/[id]/receive/
src/app/(dashboard)/reports/_components/
src/app/(dashboard)/reports/sales/
src/app/(dashboard)/reports/products/
src/app/(dashboard)/reports/stock/
src/app/(dashboard)/reports/print-orders/
src/app/(dashboard)/settings/_components/
src/app/(dashboard)/settings/users/
src/app/(dashboard)/settings/store/
src/app/api/reports/export-csv/
src/app/api/reports/export-pdf/
src/app/api/receipts/[saleId]/
```

#### 0.8 Verify the dev server starts

```bash
npm run dev
```

Open `http://localhost:3000` in the browser. Confirm the default Next.js page renders with no console errors.

### Verification

- [ ] `npm run dev` starts without errors
- [ ] Browser loads `http://localhost:3000` successfully
- [ ] All shadcn/ui components are present in `src/components/ui/`
- [ ] `.env.local` exists with all three Supabase variables
- [ ] `tsconfig.json` has the `@/*` path alias pointing to `./src/*`

### Dependencies

None -- this is the first phase.

---

## Phase 1: Database Schema & Seed Data

### Objective

Create all database tables, enums, indexes, constraints, triggers, views, and the storage bucket in Supabase. Then run the seed data to populate the database with 215 real products. All SQL is executed via the Supabase SQL Editor or via migration files applied with the Supabase CLI.

### Approach

Create numbered migration SQL files in `supabase/migrations/`. The implementing engineer can either:

- (A) Paste each migration file into the Supabase SQL Editor and run it, OR
- (B) Use the Supabase CLI (`npx supabase db push`) if the CLI is configured.

Option A is simpler for the MVP and is the recommended approach.

### Steps

#### 1.1 Create migration file: Extensions

**File:** `supabase/migrations/001_extensions.sql`

```sql
-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

#### 1.2 Create migration file: Enums

**File:** `supabase/migrations/002_enums.sql`

Define all 7 enum types exactly as specified in research.md Section 1.1:

```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'employee');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'store_credit', 'split');
CREATE TYPE public.sale_status AS ENUM ('completed', 'voided', 'refunded');
CREATE TYPE public.print_order_status AS ENUM ('registered', 'in_progress', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.print_service_type AS ENUM ('printing', 'copying', 'binding', 'laminating', 'scanning', 'other');
CREATE TYPE public.purchase_order_status AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
CREATE TYPE public.stock_movement_reason AS ENUM (
  'sale', 'sale_void', 'purchase_received', 'adjustment_add',
  'adjustment_remove', 'stocktake', 'return', 'damaged', 'initial'
);
```

#### 1.3 Create migration file: Utility functions

**File:** `supabase/migrations/003_utility_functions.sql`

The `update_updated_at()` trigger function is shared by multiple tables. Create it first.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 1.4 Create migration file: Profiles table

**File:** `supabase/migrations/004_profiles.sql`

Create the `profiles` table exactly as specified in research.md Section 1.2. Include:

- Table definition with all columns (id UUID PK references auth.users, full_name TEXT NOT NULL, role user_role DEFAULT 'employee', avatar_url TEXT, is_active BOOLEAN DEFAULT TRUE, created_at, updated_at)
- Index: `idx_profiles_role ON public.profiles(role)`
- Trigger function: `handle_new_user()` -- auto-creates a profile row when a new auth.users row is inserted. Uses `SECURITY DEFINER`. Reads `full_name` and `role` from `raw_user_meta_data`.
- Trigger: `on_auth_user_created` AFTER INSERT ON `auth.users` executes `handle_new_user()`
- Trigger: `set_profiles_updated_at` BEFORE UPDATE executes `update_updated_at()`

Copy the exact SQL from research.md Section 1.2.

#### 1.5 Create migration file: Categories table

**File:** `supabase/migrations/005_categories.sql`

Create the `categories` table exactly as specified in research.md Section 1.3. Include:

- Table definition (id UUID PK, name TEXT NOT NULL UNIQUE, description TEXT, parent_id UUID self-referencing FK ON DELETE SET NULL, sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at, updated_at)
- Indexes: `idx_categories_parent`, `idx_categories_active`
- Trigger: `set_categories_updated_at`

#### 1.6 Create migration file: Products table

**File:** `supabase/migrations/006_products.sql`

Create the `products` table exactly as specified in research.md Section 1.4. Include:

- Table definition with all columns:
  - id UUID PK DEFAULT gen_random_uuid()
  - name TEXT NOT NULL
  - description TEXT
  - barcode VARCHAR(13) UNIQUE (nullable -- ISBN-13/EAN-13)
  - sku TEXT UNIQUE (nullable)
  - category_id UUID FK to categories ON DELETE SET NULL
  - purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0
  - selling_price NUMERIC(10,2) (nullable)
  - tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0
  - stock_quantity INTEGER NOT NULL DEFAULT 0
  - low_stock_threshold INTEGER NOT NULL DEFAULT 3
  - unit TEXT NOT NULL DEFAULT 'piece'
  - image_url TEXT
  - is_active BOOLEAN NOT NULL DEFAULT TRUE
  - created_at, updated_at
- Indexes: `idx_products_barcode`, `idx_products_sku`, `idx_products_category`, `idx_products_active`, `idx_products_low_stock` (partial WHERE is_active = TRUE), `idx_products_name_trgm` (GIN trigram)
- Trigger: `set_products_updated_at`

#### 1.7 Create migration file: Customers table

**File:** `supabase/migrations/007_customers.sql`

Create the `customers` table exactly as specified in research.md Section 1.5. Include:

- Table definition (id, name, email, phone, address, notes, store_credit NUMERIC(10,2) DEFAULT 0, created_at, updated_at)
- Indexes: `idx_customers_name` (GIN trigram), `idx_customers_phone`
- Trigger: `set_customers_updated_at`

#### 1.8 Create migration file: Suppliers table

**File:** `supabase/migrations/008_suppliers.sql`

Create the `suppliers` table exactly as specified in research.md Section 1.6. Include:

- Table definition (id, name, contact_person, email, phone, address, notes, is_active DEFAULT TRUE, created_at, updated_at)
- Index: `idx_suppliers_name` (GIN trigram)
- Trigger: `set_suppliers_updated_at`

#### 1.9 Create migration file: Sales and Sale Items tables

**File:** `supabase/migrations/009_sales.sql`

Create both tables exactly as specified in research.md Sections 1.7 and 1.8. Include:

**sales table:**

- id UUID PK
- sale_number SERIAL (human-readable receipt number)
- customer_id UUID FK to customers ON DELETE SET NULL
- cashier_id UUID NOT NULL FK to profiles
- subtotal, tax_total, discount_amount NUMERIC(10,2)
- discount_type TEXT CHECK (IN ('fixed', 'percentage'))
- total NUMERIC(10,2) NOT NULL
- payment_method payment_method NOT NULL
- payment_details JSONB
- amount_paid NUMERIC(10,2) NOT NULL
- change_given NUMERIC(10,2) DEFAULT 0
- status sale_status DEFAULT 'completed'
- notes TEXT
- voided_at TIMESTAMPTZ, voided_by UUID FK to profiles, void_reason TEXT
- created_at TIMESTAMPTZ
- Indexes: idx_sales_cashier, idx_sales_customer, idx_sales_created (DESC), idx_sales_status, idx_sales_date

**sale_items table:**

- id UUID PK
- sale_id UUID NOT NULL FK to sales ON DELETE CASCADE
- product_id UUID FK to products ON DELETE SET NULL
- product_name TEXT NOT NULL (denormalized)
- product_barcode TEXT (denormalized)
- quantity INTEGER NOT NULL CHECK (quantity > 0)
- unit_price, cost_price, tax_rate, tax_amount, discount_amount, line_total NUMERIC
- Indexes: idx_sale_items_sale, idx_sale_items_product

#### 1.10 Create migration file: Stock Movements table

**File:** `supabase/migrations/010_stock_movements.sql`

Create the table exactly as specified in research.md Section 1.9:

- id UUID PK
- product_id UUID NOT NULL FK to products ON DELETE CASCADE
- quantity_change INTEGER NOT NULL (positive = in, negative = out)
- reason stock_movement_reason NOT NULL
- reference_id UUID, reference_type TEXT
- notes TEXT
- created_by UUID NOT NULL FK to profiles
- created_at TIMESTAMPTZ
- Indexes: idx_stock_movements_product, idx_stock_movements_created (DESC), idx_stock_movements_reference (composite)

#### 1.11 Create migration file: Purchase Orders and Purchase Items tables

**File:** `supabase/migrations/011_purchase_orders.sql`

Create both tables exactly as specified in research.md Sections 1.10 and 1.11:

**purchase_orders table:**

- id UUID PK, po_number SERIAL, supplier_id UUID NOT NULL FK to suppliers, status purchase_order_status DEFAULT 'draft', subtotal/tax_total/total NUMERIC(10,2) DEFAULT 0, notes TEXT, expected_date DATE, received_date TIMESTAMPTZ, created_by UUID NOT NULL FK to profiles, created_at, updated_at
- Indexes: idx_purchase_orders_supplier, idx_purchase_orders_status
- Trigger: set_purchase_orders_updated_at

**purchase_items table:**

- id UUID PK, purchase_order_id UUID NOT NULL FK to purchase_orders ON DELETE CASCADE, product_id UUID NOT NULL FK to products, quantity_ordered INTEGER CHECK > 0, quantity_received INTEGER DEFAULT 0, unit_cost NUMERIC(10,2), line_total NUMERIC(10,2)
- Indexes: idx_purchase_items_po, idx_purchase_items_product

#### 1.12 Create migration file: Print Orders table

**File:** `supabase/migrations/012_print_orders.sql`

Create the table exactly as specified in research.md Section 1.12:

- id UUID PK, order_number SERIAL, customer_id UUID FK to customers ON DELETE SET NULL, customer_name TEXT NOT NULL, customer_phone TEXT, service_type print_service_type DEFAULT 'printing', status print_order_status DEFAULT 'registered', description TEXT NOT NULL, quantity INTEGER DEFAULT 1, unit_price/total_price NUMERIC(10,2), is_paid BOOLEAN DEFAULT FALSE, linked_sale_id UUID FK to sales ON DELETE SET NULL, file_paths TEXT[], notes TEXT, due_date TIMESTAMPTZ, completed_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, created_by UUID NOT NULL FK to profiles, created_at, updated_at
- Indexes: idx_print_orders_status, idx_print_orders_customer, idx_print_orders_created (DESC), idx_print_orders_due (partial WHERE status NOT IN ('delivered', 'cancelled'))
- Trigger: set_print_orders_updated_at

#### 1.13 Create migration file: Stock Triggers

**File:** `supabase/migrations/013_stock_triggers.sql`

Create both trigger functions exactly as specified in research.md Sections 1.13 and 1.14:

**Auto-decrement stock on sale:**

- Function: `handle_sale_stock_decrement()` -- SECURITY DEFINER
  - Decrements `products.stock_quantity` by `NEW.quantity`
  - Inserts a `stock_movements` record with reason='sale', reference_id=sale_id
- Trigger: `on_sale_item_inserted` AFTER INSERT ON sale_items

**Restore stock on sale void:**

- Function: `handle_sale_void_stock_restore()` -- SECURITY DEFINER
  - Only fires when status changes from 'completed' to 'voided'
  - Restores stock for each sale_item
  - Inserts stock_movements records with reason='sale_void'
- Trigger: `on_sale_voided` AFTER UPDATE ON sales WHEN (OLD.status IS DISTINCT FROM NEW.status)

#### 1.14 Create migration file: Database Views

**File:** `supabase/migrations/014_views.sql`

Create all 4 views exactly as specified in research.md Section 1.15:

1. `v_daily_sales` -- Aggregates completed sales by date: sale_date, transaction_count, total_revenue, total_tax, total_discounts, average_basket_size
2. `v_product_performance` -- Joins products, categories, sale_items, sales: product_id, product_name, barcode, category_id, category_name, selling_price, purchase_price, stock_quantity, low_stock_threshold, total_sold, total_revenue, total_profit
3. `v_low_stock` -- Filters active products where stock_quantity <= low_stock_threshold: id, name, barcode, sku, stock_quantity, low_stock_threshold, category_id, selling_price
4. `v_print_order_summary` -- Aggregates print orders by date and status: order_date, status, order_count, total_value, paid_value, unpaid_value

#### 1.15 Create migration file: Storage Bucket

**File:** `supabase/migrations/015_storage.sql`

Create the `print-files` storage bucket exactly as specified in research.md Section 1.16:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'print-files',
  'print-files',
  FALSE,
  52428800,  -- 50MB
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

**IMPORTANT:** This INSERT may fail if run via migration tools that don't have access to the `storage` schema. If it fails, run it directly in the Supabase SQL Editor.

#### 1.16 Create migration file: RLS Helper Function

**File:** `supabase/migrations/016_rls_helper.sql`

Create the `get_my_role()` function from research.md Section 2.2:

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### 1.17 Create migration file: RLS Policies

**File:** `supabase/migrations/017_rls_policies.sql`

Enable RLS on all tables and create all policies exactly as specified in research.md Section 2.3. This is one of the most critical migrations. Every policy below must be included:

**profiles:**

- ENABLE ROW LEVEL SECURITY
- "Profiles: anyone can read" -- SELECT for authenticated, USING (TRUE)
- "Profiles: admin can update any" -- UPDATE for authenticated, USING (get_my_role() = 'admin')
- "Profiles: self can update own" -- UPDATE for authenticated, USING (auth.uid() = id) WITH CHECK (auth.uid() = id)

**categories:**

- ENABLE ROW LEVEL SECURITY
- "Categories: authenticated can read" -- SELECT, USING (TRUE)
- "Categories: admin can insert" -- INSERT, WITH CHECK (get_my_role() = 'admin')
- "Categories: admin can update" -- UPDATE, USING (get_my_role() = 'admin')
- "Categories: admin can delete" -- DELETE, USING (get_my_role() = 'admin')

**products:**

- ENABLE ROW LEVEL SECURITY
- "Products: authenticated can read" -- SELECT, USING (TRUE)
- "Products: admin can insert" -- INSERT, WITH CHECK (get_my_role() = 'admin')
- "Products: admin can update" -- UPDATE, USING (get_my_role() = 'admin')
- "Products: admin can delete" -- DELETE, USING (get_my_role() = 'admin')

**sales:**

- ENABLE ROW LEVEL SECURITY
- "Sales: authenticated can read" -- SELECT, USING (TRUE)
- "Sales: authenticated can insert" -- INSERT, WITH CHECK (TRUE)
- "Sales: admin can update" -- UPDATE, USING (get_my_role() = 'admin')

**sale_items:**

- ENABLE ROW LEVEL SECURITY
- "Sale items: authenticated can read" -- SELECT, USING (TRUE)
- "Sale items: authenticated can insert" -- INSERT, WITH CHECK (TRUE)

**stock_movements:**

- ENABLE ROW LEVEL SECURITY
- "Stock movements: authenticated can read" -- SELECT, USING (TRUE)
- "Stock movements: admin can insert" -- INSERT, WITH CHECK (get_my_role() = 'admin')

**customers:**

- ENABLE ROW LEVEL SECURITY
- "Customers: authenticated can read" -- SELECT, USING (TRUE)
- "Customers: authenticated can insert" -- INSERT, WITH CHECK (TRUE)
- "Customers: admin can update" -- UPDATE, USING (get_my_role() = 'admin')
- "Customers: employee can update" -- UPDATE, USING (get_my_role() = 'employee')

**suppliers:**

- ENABLE ROW LEVEL SECURITY
- "Suppliers: authenticated can read" -- SELECT, USING (TRUE)
- "Suppliers: admin can manage" -- ALL, USING and WITH CHECK (get_my_role() = 'admin')

**purchase_orders:**

- ENABLE ROW LEVEL SECURITY
- "POs: authenticated can read" -- SELECT, USING (TRUE)
- "POs: admin can manage" -- ALL, USING and WITH CHECK (get_my_role() = 'admin')

**purchase_items:**

- ENABLE ROW LEVEL SECURITY
- "PO items: authenticated can read" -- SELECT, USING (TRUE)
- "PO items: admin can manage" -- ALL, USING and WITH CHECK (get_my_role() = 'admin')

**print_orders:**

- ENABLE ROW LEVEL SECURITY
- "Print orders: authenticated can read" -- SELECT, USING (TRUE)
- "Print orders: authenticated can insert" -- INSERT, WITH CHECK (TRUE)
- "Print orders: authenticated can update" -- UPDATE, USING (TRUE)

**Storage (print-files bucket):**

- "Print files: authenticated can upload" -- INSERT ON storage.objects, WITH CHECK (bucket_id = 'print-files')
- "Print files: authenticated can read" -- SELECT ON storage.objects, USING (bucket_id = 'print-files')
- "Print files: admin can delete" -- DELETE ON storage.objects, USING (bucket_id = 'print-files' AND get_my_role() = 'admin')

#### 1.18 Run all migrations

Execute each migration file in order (001 through 017) in the Supabase SQL Editor. If any migration fails, fix the error before proceeding to the next one.

#### 1.19 Run seed data

Execute the contents of `supabase/seed.sql` in the Supabase SQL Editor. This inserts:

- 1 supplier (Nabil Habachi / مكتبة الحبشي)
- 60 categories (3 parents: Arabic, French, English + 57 children)
- 215 products (textbooks with purchase_price, barcode=NULL, selling_price=NULL)
- 3 purchase orders (one per invoice, status='received')
- 215 purchase items (line items linking products to POs)

**NOTE:** The purchase_orders require a `created_by` UUID that references `profiles.id`. The seed.sql likely uses a placeholder UUID. After creating the admin user in Phase 2, run:

```sql
UPDATE public.purchase_orders SET created_by = '<admin-user-uuid>';
```

#### 1.20 Verify the database

Run these verification queries in the Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM public.suppliers;        -- should be 1
SELECT COUNT(*) FROM public.categories;       -- should be 60
SELECT COUNT(*) FROM public.products;         -- should be 215
SELECT COUNT(*) FROM public.purchase_orders;  -- should be 3
SELECT COUNT(*) FROM public.purchase_items;   -- should be 215
SELECT * FROM public.v_low_stock LIMIT 5;     -- should return products
```

### Verification

- [ ] All 17 migration files exist in `supabase/migrations/`
- [ ] All migrations run without errors in the Supabase SQL Editor
- [ ] `seed.sql` runs without errors
- [ ] Product count = 215, Category count = 60, Supplier count = 1
- [ ] All 4 views (`v_daily_sales`, `v_product_performance`, `v_low_stock`, `v_print_order_summary`) are queryable
- [ ] The `print-files` storage bucket exists in the Supabase dashboard
- [ ] RLS is enabled on all tables (check via Supabase Table Editor -- lock icon visible)

### Dependencies

- Phase 0 must be complete (project scaffolded, Supabase project created)

---

## Phase 2: Auth, Supabase Clients & Middleware

### Objective

Set up Supabase Auth with email/password login, create the browser/server/admin client utilities, implement the middleware for session management and route protection, create the role-check utility, build the login page, create the first admin user, and verify the full auth flow.

### Steps

#### 2.1 Create the Supabase Browser Client

**File:** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

This client is used in Client Components (`"use client"`) for reads and real-time subscriptions.

#### 2.2 Create the Supabase Server Client

**File:** `src/lib/supabase/server.ts`

Copy the exact code from research.md Section 3.3 (Server Client). Key points:

- Uses `createServerClient` from `@supabase/ssr`
- Imports `cookies` from `next/headers` -- must `await cookies()` (Next.js 15 breaking change)
- Implements `getAll()` and `setAll()` cookie methods (NOT the old `get/set/remove` pattern)
- The `try/catch` in `setAll` is intentional -- Server Components cannot write cookies

#### 2.3 Create the Supabase Admin Client (Service Role)

**File:** `src/lib/supabase/admin.ts`

Copy the exact code from research.md Section 3.3 (Admin Client). Key points:

- Uses `createClient` from `@supabase/supabase-js` (NOT `@supabase/ssr`)
- Uses `SUPABASE_SERVICE_ROLE_KEY` -- this bypasses RLS
- Disables `autoRefreshToken` and `persistSession` (server-side only, no session needed)
- This client is used ONLY in Server Actions for write operations

#### 2.4 Create the Middleware

**File:** `src/middleware.ts` (at the `src/` root, NOT inside `app/`)

Copy the exact code from research.md Section 3.4. Key behavior:

- Creates a Supabase server client using request cookies
- Calls `supabase.auth.getUser()` to refresh the auth token on every request
- Redirects unauthenticated users to `/login` (except `/login` and `/auth` routes)
- Redirects authenticated users away from `/login` to `/`
- Matcher excludes static assets (`_next/static`, `_next/image`, `favicon.ico`, and common image extensions)

**GOTCHA (from research.md Section 10.4):** The middleware MUST call `supabase.auth.getUser()` on every request. Skipping this causes silent session expiration.

#### 2.5 Create the Auth Utility

**File:** `src/lib/auth.ts`

Copy the exact code from research.md Section 3.5. This provides:

- `UserRole` type: `"admin" | "employee"`
- `AuthUser` interface: `{ id, email, role, fullName }`
- `getAuthUser()`: Fetches the current user from Supabase Auth, then queries their profile to get role and full_name. Redirects to `/login` if not authenticated.
- `requireAdmin()`: Calls `getAuthUser()` then redirects to `/` if role is not 'admin'.

#### 2.6 Create the Server Action Guard

**File:** `src/lib/actions/guard.ts`

Copy the exact code from research.md Section 3.7. Must include `"use server"` directive. Provides:

- `adminAction<T>(fn)`: Wraps a server action to require admin role
- `authAction<T>(fn)`: Wraps a server action to require any authenticated user

#### 2.7 Create Auth Server Actions

**File:** `src/lib/actions/auth-actions.ts`

Create server actions for login, signup (admin only), and logout:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createUser(formData: FormData) {
  // Admin-only: create a new user with a specific role
  const supabase = createAdminClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { data };
}
```

#### 2.8 Build the Login Page

**File:** `src/app/(auth)/login/page.tsx`

Create a Client Component login page with:

- A centered card layout (shadcn/ui Card)
- Store name header: "Library Bookshop & Print"
- Email input field
- Password input field
- Submit button that calls the `signIn` server action
- Error message display area
- Form validation using the `LoginSchema` from Zod:
  ```
  email: z.string().email("Invalid email address")
  password: z.string().min(6, "Password must be at least 6 characters")
  ```
- Loading state on the submit button during form submission
- Use `useActionState` or `useTransition` for pending state

**File:** `src/app/(auth)/layout.tsx`

Create a minimal layout for auth pages -- no sidebar, just a centered container:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}
```

#### 2.9 Create the Auth Callback Route

**File:** `src/app/(auth)/auth/callback/route.ts`

Create a Route Handler for OAuth callback (even though MVP uses email/password, this is needed for Supabase Auth flows):

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

#### 2.10 Create the First Admin User

This is a manual step. In the Supabase Dashboard:

1. Go to Authentication > Users > Add User
2. Enter email and password for the admin account
3. The `on_auth_user_created` trigger will auto-create a profile row with role='employee' (default)
4. In the SQL Editor, update the role to admin:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE id = '<the-user-uuid-from-auth.users>';
   ```
5. Also fix the purchase_orders created_by:

   ```sql



   ```

Alternatively, create the admin user via the Supabase admin API with metadata:

```sql
-- Or use the createUser server action with role='admin' in metadata
-- The trigger reads raw_user_meta_data->>'role' and sets it
```

#### 2.11 Create a test employee user

In the Supabase Dashboard, create a second user (employee) to test role-based access. The trigger will default the role to 'employee'.

### Verification

- [ ] Opening `http://localhost:3000` redirects to `/login` (unauthenticated)
- [ ] Logging in with admin credentials redirects to `/`
- [ ] Logging in with employee credentials redirects to `/`
- [ ] After login, navigating to `/login` redirects back to `/`
- [ ] The `profiles` table has rows for both admin and employee users
- [ ] `getAuthUser()` returns the correct role for each user
- [ ] Logging out redirects to `/login` and subsequent visits to `/` redirect back to `/login`

### Dependencies

- Phase 0 (project scaffolded)
- Phase 1 (database schema with profiles table and triggers)

---

## Phase 3: Core Layout & Navigation

### Objective

Build the dashboard shell that wraps all protected pages: sidebar navigation, top bar with user menu, route group layouts, loading states, error boundaries, and placeholder pages for every feature module so that navigation works end-to-end.

### Steps

#### 3.1 Create Utility Files

These are needed by layout components.

**File:** `src/lib/utils/constants.ts`

Copy the exact `STORE_CONFIG` object from research.md Appendix C:

```typescript
export const STORE_CONFIG = {
  name: "Library Bookshop & Print",
  address: "Settat, Morocco",
  phone: "",
  taxId: "",
  currency: "MAD",
  currencySymbol: "MAD ",
  defaultTaxRate: 0,
  receiptFooter: "!شكرا لزيارتكم / Merci de votre visite!",
  receiptDisclaimer: "Goods sold are not returnable without receipt.",
};
```

**File:** `src/lib/utils/format.ts`

Copy the exact formatting utilities from research.md Appendix E:

- `formatCurrency(amount)` -- returns `MAD XX.XX`
- `formatDate(date)` -- returns `MMM dd, yyyy`
- `formatDateTime(date)` -- returns `MMM dd, yyyy HH:mm`
- `formatRelative(date)` -- returns relative time string
- `formatSaleNumber(num)` -- returns `#000001`
- `formatOrderNumber(num)` -- returns `PO-0001`
- `formatPrintOrderNumber(num)` -- returns `PR-0001`

**File:** `src/lib/utils/validation.ts`

Copy all Zod schemas from research.md Appendix D:

- `ProductSchema`
- `CategorySchema`
- `CustomerSchema`
- `SupplierSchema`
- `PrintOrderSchema`
- `LoginSchema`

#### 3.2 Create Shared UI Components

**File:** `src/components/shared/loading-spinner.tsx`

A simple centered spinner component using Tailwind animate-spin:

```tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
```

**File:** `src/components/shared/empty-state.tsx`

A reusable empty state display with icon, title, and description props.

**File:** `src/components/shared/confirm-dialog.tsx`

A reusable confirmation dialog (Client Component) using shadcn/ui Dialog. Props: title, description, onConfirm callback, destructive flag (for delete actions).

**File:** `src/components/shared/search-input.tsx`

A Client Component search input with debounce (300ms). Uses the `use-debounce` hook. Renders a shadcn/ui Input with a search icon.

#### 3.3 Create the Sidebar Component

**File:** `src/components/layout/sidebar.tsx`

A Client Component sidebar with:

- Store name/logo at the top
- Navigation links organized by section:
  - **Main:** Dashboard (`/`), POS (`/pos`)
  - **Inventory:** Products (`/products`), Categories (`/categories`)
  - **Services:** Print Orders (`/print-orders`)
  - **People:** Customers (`/customers`), Suppliers (`/suppliers` -- admin only)
  - **Purchasing:** Purchases (`/purchases` -- admin only)
  - **Analytics:** Reports (`/reports`)
  - **System:** Settings (`/settings` -- admin only)
- Active link highlighting using `usePathname()` from `next/navigation`
- Icons for each link (use Lucide React icons, which come with shadcn/ui)
- The sidebar should accept the user's role as a prop and conditionally hide admin-only links for employees
- Collapsed/expanded state (optional for MVP -- can use a fixed-width sidebar)

**Admin-only links** (hide for employees): Suppliers, Purchases, Settings

#### 3.4 Create the Top Bar Component

**File:** `src/components/layout/topbar.tsx`

A Client Component top bar with:

- Page title area (or breadcrumbs)
- User menu dropdown (shadcn/ui DropdownMenu) showing:
  - User's full name and role badge
  - Sign out button (calls `signOut` server action)

#### 3.5 Create the Breadcrumbs Component

**File:** `src/components/layout/breadcrumbs.tsx`

A Server Component that derives breadcrumbs from the URL path. Each segment maps to a human-readable label. Example: `/products/new` renders as "Products > New".

#### 3.6 Create the Dashboard Layout

**File:** `src/app/(dashboard)/layout.tsx`

A Server Component that:

1. Calls `getAuthUser()` to verify authentication and get the user's role
2. Renders the sidebar (passing user role for conditional links)
3. Renders the topbar (passing user info for the user menu)
4. Renders `{children}` in the main content area
5. Wraps the page in the Sonner Toaster component for toast notifications

Layout structure:

```
<div className="flex h-screen">
  <Sidebar role={user.role} />
  <div className="flex flex-1 flex-col overflow-hidden">
    <Topbar user={user} />
    <main className="flex-1 overflow-y-auto p-6">
      {children}
    </main>
  </div>
</div>
<Toaster />
```

#### 3.7 Create the Dashboard Home Page (Placeholder)

**File:** `src/app/(dashboard)/page.tsx`

A Server Component that displays placeholder KPI cards:

- Today's Sales (MAD 0.00)
- Transactions Today (0)
- Pending Print Orders (0)
- Low Stock Items (0)

Use shadcn/ui Card components for each KPI. Real data will be wired in Phase 9.

#### 3.8 Create Placeholder Pages for All Feature Modules

Create a simple placeholder page for each route that displays the page name. Each file should be a Server Component that renders a heading and a "Coming soon" message.

**Files to create (one placeholder `page.tsx` each):**

- `src/app/(dashboard)/pos/page.tsx` -- "Point of Sale"
- `src/app/(dashboard)/products/page.tsx` -- "Products"
- `src/app/(dashboard)/products/new/page.tsx` -- "New Product"
- `src/app/(dashboard)/products/[id]/page.tsx` -- "Product Detail"
- `src/app/(dashboard)/products/[id]/edit/page.tsx` -- "Edit Product"
- `src/app/(dashboard)/categories/page.tsx` -- "Categories"
- `src/app/(dashboard)/print-orders/page.tsx` -- "Print Orders"
- `src/app/(dashboard)/print-orders/new/page.tsx` -- "New Print Order"
- `src/app/(dashboard)/print-orders/[id]/page.tsx` -- "Print Order Detail"
- `src/app/(dashboard)/customers/page.tsx` -- "Customers"
- `src/app/(dashboard)/customers/[id]/page.tsx` -- "Customer Detail"
- `src/app/(dashboard)/suppliers/page.tsx` -- "Suppliers" (add `requireAdmin()` call)
- `src/app/(dashboard)/purchases/page.tsx` -- "Purchase Orders" (add `requireAdmin()` call)
- `src/app/(dashboard)/purchases/new/page.tsx` -- "New Purchase Order"
- `src/app/(dashboard)/purchases/[id]/page.tsx` -- "Purchase Order Detail"
- `src/app/(dashboard)/purchases/[id]/receive/page.tsx` -- "Receive Stock"
- `src/app/(dashboard)/reports/page.tsx` -- "Reports"
- `src/app/(dashboard)/reports/sales/page.tsx` -- "Sales Report"
- `src/app/(dashboard)/reports/products/page.tsx` -- "Product Performance"
- `src/app/(dashboard)/reports/stock/page.tsx` -- "Stock Report"
- `src/app/(dashboard)/reports/print-orders/page.tsx` -- "Print Order Report"
- `src/app/(dashboard)/settings/page.tsx` -- "Settings" (add `requireAdmin()` call)
- `src/app/(dashboard)/settings/users/page.tsx` -- "User Management"
- `src/app/(dashboard)/settings/store/page.tsx` -- "Store Settings"

#### 3.9 Create Loading States

**File:** `src/app/(dashboard)/loading.tsx`

A loading UI that displays while the dashboard layout is loading. Use the `LoadingSpinner` component.

#### 3.10 Create Error Boundary

**File:** `src/app/(dashboard)/error.tsx`

A Client Component error boundary (`"use client"`) that catches errors in dashboard pages. Displays an error message with a "Try Again" button that calls `reset()`.

#### 3.11 Create the Global Not Found Page

**File:** `src/app/not-found.tsx`

A simple 404 page with a link back to the dashboard.

### Verification

- [ ] Login redirects to the dashboard with sidebar visible
- [ ] All sidebar links navigate to their placeholder pages
- [ ] Active link is highlighted in the sidebar
- [ ] Admin user sees all links; employee user does NOT see Suppliers, Purchases, Settings
- [ ] Employee attempting to visit `/suppliers` directly is redirected to `/`
- [ ] User menu shows user name and role
- [ ] Sign out works and redirects to login
- [ ] Loading spinner appears during page transitions
- [ ] Error boundary renders if an error is thrown in a page component
- [ ] 404 page renders for unknown routes

### Dependencies

- Phase 0 (project scaffolded, shadcn/ui components installed)
- Phase 2 (auth working, getAuthUser utility available)

---

## Phase 4: Products & Categories

### Objective

Build the full product management module: product list with search, filtering, and sorting using TanStack Table; product create/edit/delete forms; category management with parent/child hierarchy; barcode field for ISBN-13 scanning; stock level display; and low stock indicators. Wire everything to the real seeded data.

### Steps

#### 4.1 Create the Reusable Data Table Component

**File:** `src/components/shared/data-table.tsx`

A Client Component (`"use client"`) that wraps TanStack React Table with shadcn/ui Table markup. This is the foundation for all list pages. It must support:

- Column definitions (passed as props)
- Data array (passed as props)
- Sorting (client-side, using `getSortedRowModel`)
- Filtering (global text filter using `getFilteredRowModel`)
- Pagination (client-side, using `getPaginationModel`)
- Column visibility toggling
- Row selection (optional, for batch operations)
- Rendering with shadcn/ui `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableHead>`, `<TableBody>`, `<TableCell>`
- Pagination controls at the bottom (Previous/Next buttons, page size selector)

Reference the shadcn/ui Data Table documentation pattern.

#### 4.2 Create Category Server Actions

**File:** `src/lib/actions/categories.ts`

```typescript
"use server";
```

Implement:

- `getCategories()` -- authAction. Fetches all categories ordered by sort_order. Returns with parent_id for tree building.
- `createCategory(formData)` -- adminAction. Validates with `CategorySchema`. Inserts into categories table using admin client. Revalidates `/categories` and `/products`.
- `updateCategory(id, formData)` -- adminAction. Updates category by id. Revalidates.
- `deleteCategory(id)` -- adminAction. Deletes category. Revalidates.

#### 4.3 Create Product Server Actions

**File:** `src/lib/actions/products.ts`

```typescript
"use server";
```

Implement exactly as shown in research.md Section 3.7 for `createProduct`, plus:

- `getProducts(searchQuery?, categoryId?, stockFilter?)` -- authAction. Fetches products with optional filters. Joins category name. Returns array.
- `getProduct(id)` -- authAction. Fetches single product with category.
- `createProduct(formData)` -- adminAction. Validates with `ProductSchema`. Inserts using admin client. If `stock_quantity` > 0, also insert a `stock_movements` record with reason='initial'. Revalidates `/products`.
- `updateProduct(id, formData)` -- adminAction. Updates product by id. Revalidates `/products` and `/products/[id]`.
- `deleteProduct(id)` -- adminAction. Sets `is_active = false` (soft delete, NOT hard delete). Revalidates.

#### 4.4 Create Stock Server Actions

**File:** `src/lib/actions/stock.ts`

```typescript
"use server";
```

Implement:

- `adjustStock(productId, quantityChange, reason, notes)` -- adminAction. Updates `products.stock_quantity` and inserts a `stock_movements` record. Validate that `reason` is one of: 'adjustment_add', 'adjustment_remove', 'stocktake', 'return', 'damaged'. Revalidates `/products`.

#### 4.5 Build the Categories Page

**File:** `src/app/(dashboard)/categories/page.tsx`

A Server Component that:

1. Calls `getAuthUser()` for role check
2. Fetches all categories from Supabase (with parent relationship)
3. Passes data to the `CategoryTree` client component
4. Shows "Add Category" button for admin users only

**File:** `src/app/(dashboard)/categories/_components/category-tree.tsx`

A Client Component that:

- Displays categories in a hierarchical tree structure (parent categories as expandable sections, child categories nested underneath)
- Each category row shows: name, description, product count (if available), sort_order
- Edit button (opens category-form dialog) -- admin only
- Delete button (opens confirm-dialog) -- admin only

**File:** `src/app/(dashboard)/categories/_components/category-form.tsx`

A Client Component dialog (shadcn/ui Dialog) for creating/editing categories:

- Name input (required)
- Description textarea (optional)
- Parent category selector (shadcn/ui Select) -- populated with top-level categories
- Sort order input (number)
- Submit button calls `createCategory` or `updateCategory` server action
- Validation using `CategorySchema`
- Toast notification on success/error

#### 4.6 Build the Products List Page

**File:** `src/app/(dashboard)/products/page.tsx`

A Server Component that:

1. Calls `getAuthUser()` for role
2. Fetches all products from Supabase (join with categories for category_name)
3. Fetches all categories for the filter dropdown
4. Passes data to the `ProductTable` client component
5. Shows "Add Product" link (to `/products/new`) for admin only

**File:** `src/app/(dashboard)/products/_components/product-table.tsx`

A Client Component using the reusable `DataTable` with these columns:

- Name (sortable, searchable)
- Barcode (displays barcode value or "Not set" in muted text)
- Category (displays category name, filterable)
- Purchase Price (formatted as MAD, right-aligned)
- Selling Price (formatted as MAD or "Not set", right-aligned)
- Margin (computed as selling_price - purchase_price, or "N/A" if selling_price is null)
- Stock (displays quantity with color coding: red if <= low_stock_threshold, green if > threshold)
- Actions column: View, Edit (admin only), Delete (admin only)

Features:

- Global search by name or barcode (text input at top)
- Category filter dropdown
- Stock status filter (All / Low Stock / Out of Stock / In Stock)
- Sorting on all numeric columns
- Pagination (20 items per page)

**File:** `src/app/(dashboard)/products/_components/product-filters.tsx`

A Client Component with:

- Search input (debounced, 300ms)
- Category select dropdown (populated from categories prop)
- Stock status select (All, Low Stock, Out of Stock, In Stock)
- Clear filters button

#### 4.7 Build the Product Create Page

**File:** `src/app/(dashboard)/products/new/page.tsx`

A Server Component that:

1. Calls `requireAdmin()` -- only admin can create products
2. Fetches categories for the form dropdown
3. Renders `ProductForm` in create mode

#### 4.8 Build the Product Edit Page

**File:** `src/app/(dashboard)/products/[id]/edit/page.tsx`

A Server Component that:

1. Calls `requireAdmin()`
2. Fetches the product by id
3. Fetches categories
4. Renders `ProductForm` in edit mode with existing data pre-filled

#### 4.9 Build the Product Detail Page

**File:** `src/app/(dashboard)/products/[id]/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Fetches the product by id (with category)
3. Fetches recent stock movements for this product
4. Displays:
   - Product name, description
   - Barcode (with `BarcodeLabel` component if barcode is set)
   - Category
   - Purchase price, selling price, margin
   - Current stock quantity with low stock indicator
   - Stock movement history table (date, quantity_change, reason, notes)
5. Admin actions: Edit button, Stock Adjustment button, Delete button

#### 4.10 Build the Product Form Component

**File:** `src/app/(dashboard)/products/_components/product-form.tsx`

A Client Component (`"use client"`) used by both create and edit pages:

- Props: `mode: "create" | "edit"`, `product?: Product`, `categories: Category[]`
- Fields:
  - Name (text input, required)
  - Description (textarea, optional)
  - Barcode (text input, max 13 chars, with note "Scan ISBN-13 barcode or enter manually")
  - SKU (text input, optional)
  - Category (select dropdown with parent/child hierarchy)
  - Purchase Price (number input, required, step 0.01)
  - Selling Price (number input, optional, step 0.01)
  - Tax Rate (number input, default 0, percentage)
  - Stock Quantity (number input, only shown in create mode)
  - Low Stock Threshold (number input, default 3)
  - Unit (select: piece, pack, box, ream)
- Live margin display: if both purchase_price and selling_price are entered, show `Margin: MAD X.XX`
- Form validation using `ProductSchema`
- Submit calls `createProduct` or `updateProduct` server action
- Loading state on submit button
- Success: redirect to `/products` with toast
- Error: display error message

#### 4.11 Build the Barcode Label Component

**File:** `src/app/(dashboard)/products/_components/barcode-label.tsx`

Copy the exact component from research.md Section 6.3:

- Uses JsBarcode to render EAN-13 barcode to an SVG ref
- Displays product name (truncated), barcode image, and price
- Printable layout for label printing

### Verification

- [ ] Categories page shows the 60 seeded categories in a tree structure (3 parents, 57 children)
- [ ] Admin can create, edit, and delete categories
- [ ] Products page shows the 215 seeded products in a paginated table
- [ ] Search by product name works (fuzzy matching)
- [ ] Category filter narrows the product list
- [ ] Stock status filter works (all seeded products have stock_quantity=0, so they should all show as "Out of Stock" or "Low Stock")
- [ ] Admin can create a new product with all fields
- [ ] Admin can edit an existing product
- [ ] Admin can soft-delete a product (is_active = false, disappears from active list)
- [ ] Product detail page shows stock movement history
- [ ] Employee can view products but cannot see create/edit/delete buttons
- [ ] Barcode label renders correctly for products that have a barcode set

### Dependencies

- Phase 3 (layout, navigation, shared components)

---

## Phase 5: Point of Sale (POS)

### Objective

Build the complete POS module: product search with barcode scanner support, shopping cart with quantity and discount management, multiple payment methods (cash, card, transfer), sale finalization via server action, receipt PDF generation with jsPDF, and print trigger. This is the most business-critical module.

### Steps

#### 5.1 Create the Cart Store

**File:** `src/lib/store/cart-store.ts`

Copy the exact Zustand store from research.md Section 5.1. This includes:

- `CartItem` interface with: productId, name, barcode, unitPrice, costPrice, taxRate, quantity, discountAmount, lineTotal, taxAmount
- `CartState` interface with: items array, customerId, customerName, discountType, discountValue, notes, and all action methods
- `calculateLineItem()` helper function
- `useCartStore` created with Zustand's `create`
- Actions: addItem, removeItem, updateQuantity, setItemDiscount, setCustomer, setCartDiscount, setNotes, clearCart
- `useCartTotals()` selector that computes: subtotal, taxTotal, cartDiscount, total, itemCount

**File:** `src/lib/types/cart.ts`

Export the CartItem and CartState types (or re-export from cart-store.ts).

**File:** `src/hooks/use-cart.ts`

A simple re-export file:

```typescript
export { useCartStore, useCartTotals } from "@/lib/store/cart-store";
```

#### 5.2 Create the Barcode Scanner Hook

**File:** `src/hooks/use-barcode-scanner.ts`

Copy the exact hook from research.md Section 6.1. Key behavior:

- Listens for `keydown` events on the document (capture phase)
- Buffers rapid keystrokes (< 50ms apart) as scanner input
- On Enter key, if buffer length >= 4 (minLength), calls `onScan(barcode)` and prevents default
- Resets buffer if time between keystrokes exceeds maxDelay (50ms)
- Only accepts printable characters (length === 1, no ctrl/meta/alt)
- Accepts `enabled` prop to toggle scanning
- Uses refs to avoid stale closure issues

#### 5.3 Create the Debounce Hook

**File:** `src/hooks/use-debounce.ts`

A simple debounce hook:

```typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

#### 5.4 Create Sale Server Actions

**File:** `src/lib/actions/sales.ts`

Copy the exact `createSale` and `voidSale` functions from research.md Section 5.2. Key points:

**createSale(input: SaleInput):**

- Wrapped in `authAction` (any authenticated user can create sales)
- Uses admin client (bypasses RLS)
- Inserts into `sales` table with all fields: customer_id, cashier_id, subtotal, tax_total, discount_amount, discount_type, total, payment_method, payment_details, amount_paid, change_given, notes
- Then inserts all `sale_items` rows (this triggers `handle_sale_stock_decrement` automatically)
- Revalidates `/pos` and `/reports`
- Returns `{ saleId, saleNumber }`

**voidSale(saleId, reason):**

- Wrapped in `authAction` but ALSO checks `user.role !== "admin"` and throws
- Updates sale status to 'voided', sets voided_at, voided_by, void_reason
- Only updates if current status = 'completed' (prevents double-void)
- Revalidates `/pos` and `/reports`

#### 5.5 Create the Receipt PDF Generator

**File:** `src/lib/utils/receipt-pdf.ts`

Copy the exact `generateReceiptPDF` function from research.md Section 5.4. Key specs:

- 80mm thermal receipt width (226 points at 72dpi)
- Uses jsPDF with mm units
- Dynamic height based on item count
- Sections: store header (name, address, phone), sale info (receipt #, date, cashier, customer), column headers (Item, Qty, Price, Total), line items, totals (subtotal, tax, discount, TOTAL), payment info, footer
- Store config comes from `STORE_CONFIG` constant
- Returns jsPDF instance (caller decides to print, download, or preview)

#### 5.6 Build the POS Page

**File:** `src/app/(dashboard)/pos/page.tsx`

A Client Component (`"use client"`) that serves as the POS terminal. This is the most complex page in the application. The layout is a two-panel design:

**Left panel (65% width):** Product search and selection

- Search input at top (searches by name and barcode)
- Barcode scanner hook active (auto-adds products to cart on scan)
- Product grid/list showing search results
- Each product card shows: name, price, stock quantity
- Clicking a product card adds it to the cart

**Right panel (35% width):** Cart and checkout

- Cart header with item count
- Cart line items list (scrollable):
  - Product name, quantity spinner (+/-), unit price, line total
  - Per-item discount field (optional)
  - Remove button
- Customer selector (optional, search existing customers by name/phone)
- Cart-level discount (fixed amount or percentage)
- Notes field
- Totals display: subtotal, tax, discount, TOTAL
- Payment button (opens payment dialog)

The POS page fetches the product list from Supabase on mount (browser client) and filters client-side for instant search. Alternatively, it can query Supabase on each search with debouncing (300ms).

**GOTCHA (from research.md Section 5.6):**

- If barcode is not found, show a toast: "Product not found: [barcode]"
- Allow sales even if stock <= 0 (backorder behavior) but show a warning badge
- Price is captured at the moment of adding to cart (no retroactive updates)

#### 5.7 Build POS Sub-Components

**File:** `src/app/(dashboard)/pos/_components/product-search.tsx`

A Client Component with:

- Search input field (text)
- On input change: debounce 300ms, query products from Supabase where name ILIKE or barcode matches
- Display results as a list of product cards
- On product click: call `addItem` from cart store

**File:** `src/app/(dashboard)/pos/_components/product-grid.tsx`

A Client Component grid of product cards for quick-pick:

- Shows frequently sold or recently searched products
- Each card: product name, selling price (or "No price set" warning), stock badge
- Click adds to cart
- If `selling_price` is null, show a warning toast: "This product has no selling price set"

**File:** `src/app/(dashboard)/pos/_components/cart.tsx`

A Client Component that:

- Reads from `useCartStore`
- Displays each cart item with:
  - Product name
  - Quantity controls (- button, quantity display, + button)
  - Unit price display
  - Line total display
  - Discount input (MAD amount, optional)
  - Remove (trash icon) button
- If cart is empty, show empty state message: "Scan a barcode or search for a product to start"
- Customer selector at the bottom (optional -- uses a Command/Combobox to search customers)
- Cart discount section: toggle between fixed/percentage, input value
- Notes textarea
- Totals summary: subtotal, tax, discount, total
- "Charge [TOTAL]" button to open payment dialog

**File:** `src/app/(dashboard)/pos/_components/payment-dialog.tsx`

A Client Component dialog (shadcn/ui Dialog) for payment:

- Displays the total amount due prominently
- Payment method tabs (shadcn/ui Tabs): Cash, Card, Transfer
- **Cash tab:** Amount tendered input (number). Auto-calculates change: `change = amountPaid - total`. Disable confirm if amount < total.
- **Card tab:** Optional reference number input. Amount = total (no change).
- **Transfer tab:** Optional reference number input. Amount = total (no change).
- Confirm button calls `createSale` server action with all cart data + payment info
- On success:
  1. Show success toast with sale number
  2. Generate receipt PDF using `generateReceiptPDF`
  3. Open PDF in new browser tab for printing
  4. Clear the cart
- On error: show error toast, keep cart intact for retry
- Loading state during submission

**GOTCHA:** Store credit and split payment are deferred to v2 per research.md Section 11.2. Do not implement them now.

**File:** `src/app/(dashboard)/pos/_components/receipt-preview.tsx`

A Client Component that:

- Accepts sale data as props
- Generates the receipt PDF using `generateReceiptPDF`
- Opens the PDF in a new tab using `window.open(URL.createObjectURL(blob))`
- Triggers `printWindow.print()` on load

#### 5.8 Handle Barcode Scanner Integration in POS

In the POS page component, use the `useBarcodeScanner` hook exactly as shown in research.md Section 6.1 Usage:

1. On scan, query Supabase for a product with matching barcode (active only)
2. If found, add to cart via `addItem`
3. If not found, show error toast: "Product not found: [barcode]"
4. If product has no selling_price, still add but show warning toast

#### 5.9 Handle Customer Selection in POS

Create a customer search component (Combobox pattern using shadcn/ui Command):

- Search customers by name or phone
- On select, call `setCustomer(id, name)` on cart store
- "Clear customer" option to unset
- "Add new customer" option that opens a quick-create dialog

### Verification

- [ ] POS page loads with empty cart on the right and product search on the left
- [ ] Typing in search box filters products by name
- [ ] Clicking a product adds it to the cart with quantity 1
- [ ] Scanning a barcode (simulated by typing rapidly + Enter) adds the product to the cart
- [ ] Scanning a non-existent barcode shows error toast
- [ ] Quantity +/- buttons work correctly
- [ ] Removing an item from cart works
- [ ] Cart totals update correctly (subtotal, tax, discount, total)
- [ ] Setting a per-item discount recalculates the line total
- [ ] Setting a cart-level discount (fixed or percentage) recalculates the total
- [ ] Cash payment: entering amount >= total enables the confirm button and shows correct change
- [ ] Card payment: confirm button enabled immediately, amount = total
- [ ] After successful payment:
  - Sale record exists in `sales` table with correct sale_number
  - Sale items exist in `sale_items` table
  - Stock quantities decremented in `products` table (via trigger)
  - Stock movement records created (via trigger)
  - Receipt PDF opens in new browser tab
  - Cart is cleared
- [ ] Employee can make a sale
- [ ] Products with no selling_price show a warning when added to cart

### Dependencies

- Phase 4 (products and categories exist in the database, product server actions available)
- Phase 3 (layout with sidebar/topbar)

---

## Phase 6: Print & Copy Orders

### Objective

Build the complete print/copy order workflow: create orders with file upload to Supabase Storage, status transitions (Registered -> In Progress -> Ready -> Delivered), order list with status filters, and payment conversion (link a print order to a sale when payment is collected).

### Steps

#### 6.1 Create Print Order Server Actions

**File:** `src/lib/actions/print-orders.ts`

Copy the exact functions from research.md Section 7.3:

- `createPrintOrder(input)` -- authAction. Validates with `PrintOrderSchema`. Inserts into `print_orders` using admin client. Revalidates `/print-orders`.
- `updatePrintOrderStatus(orderId, newStatus)` -- authAction. Updates status. Sets `completed_at` when status='ready', `delivered_at` when status='delivered'. Revalidates.
- `convertPrintOrderToSale(orderId)` -- authAction. Fetches the order, creates a sale, links the sale to the order, marks order as paid. Revalidates.

Also add:

- `getPrintOrders(statusFilter?)` -- authAction. Fetches print orders with optional status filter. Orders by created_at DESC.
- `getPrintOrder(id)` -- authAction. Fetches single print order.
- `updatePrintOrder(id, data)` -- authAction. Updates print order fields (description, quantity, price, etc.).

#### 6.2 Build the File Upload Component

**File:** `src/app/(dashboard)/print-orders/_components/file-upload.tsx`

A Client Component for drag-and-drop file upload:

- Uses native HTML drag-and-drop events (no external library needed)
- Accepts file types: PDF, JPEG, PNG, TIFF, DOC, DOCX, PPT, PPTX (matches storage bucket allowed_mime_types)
- Max file size: 50MB (matches storage bucket limit)
- Uploads to Supabase Storage `print-files` bucket using the browser client
- File path format: `{orderId}/{timestamp}-{filename}`
- Shows upload progress (loading spinner per file)
- Displays uploaded files list with download links (signed URLs)
- Delete file button (admin only)
- Returns array of file paths to parent component

Use the exact upload logic from research.md Section 7.2:

```typescript
const filePath = `${orderId}/${Date.now()}-${file.name}`;
await supabase.storage
  .from("print-files")
  .upload(filePath, file, { cacheControl: "3600", upsert: false });
```

For signed URLs:

```typescript
await supabase.storage.from("print-files").createSignedUrl(filePath, 3600);
```

#### 6.3 Build the Print Order Create Page

**File:** `src/app/(dashboard)/print-orders/new/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Fetches customers for the customer selector
3. Renders `PrintOrderForm` in create mode

**File:** `src/app/(dashboard)/print-orders/_components/print-order-form.tsx`

A Client Component form with:

- Customer lookup: search existing customers by name/phone (Command/Combobox), or enter new customer name and phone manually
- Service type dropdown (shadcn/ui Select): Printing, Copying, Binding, Laminating, Scanning, Other
- Description textarea (required) -- "20 pages color, A4, double-sided"
- Quantity input (number, default 1)
- Unit price input (number)
- Total price (auto-calculated: quantity \* unit_price, editable for overrides)
- File upload zone (uses the `FileUpload` component)
- Due date picker (shadcn/ui Calendar in a Popover)
- Notes textarea (optional)
- Submit button calls `createPrintOrder` server action
- On success: redirect to `/print-orders` with toast

#### 6.4 Build the Print Order List Page

**File:** `src/app/(dashboard)/print-orders/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Fetches all print orders (ordered by created_at DESC)
3. Passes data to `PrintOrderTable`
4. Shows "New Print Order" button

**File:** `src/app/(dashboard)/print-orders/_components/print-order-table.tsx`

A Client Component data table with columns:

- Order # (formatted with `formatPrintOrderNumber`)
- Customer Name
- Service Type (badge)
- Description (truncated to 50 chars)
- Total Price (formatted as MAD)
- Status (status badge with color)
- Payment (Paid/Unpaid badge)
- Due Date (formatted)
- Created At (relative time)
- Actions: View detail link

Features:

- Status filter tabs: All, Registered, In Progress, Ready, Delivered, Cancelled
- Search by customer name or order number
- Sorting by date, status, total

#### 6.5 Build the Status Badge Component

**File:** `src/app/(dashboard)/print-orders/_components/status-badge.tsx`

A component that renders a shadcn/ui Badge with color-coded status:

- Registered: blue/default
- In Progress: yellow/warning
- Ready: green/success
- Delivered: gray/muted
- Cancelled: red/destructive

#### 6.6 Build the Print Order Detail Page

**File:** `src/app/(dashboard)/print-orders/[id]/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Fetches the print order by id
3. Displays all order details:
   - Order number, status (with status badge), created date
   - Customer name and phone
   - Service type, description
   - Quantity, unit price, total price
   - Payment status (Paid/Unpaid)
   - Due date
   - Notes
   - Attached files (with download links via signed URLs)
   - Linked sale (if paid, link to sale details)
4. Status update buttons (contextual based on current status):
   - Registered: "Start Processing" (-> in_progress), "Cancel" (-> cancelled)
   - In Progress: "Mark Ready" (-> ready), "Cancel" (-> cancelled)
   - Ready: "Mark Delivered" (-> delivered), "Cancel" (-> cancelled)
   - Delivered: no further transitions
5. Payment button: visible when status is 'ready' or 'delivered' AND is_paid = false. Opens a payment dialog that calls `convertPrintOrderToSale`.

**File:** `src/app/(dashboard)/print-orders/_components/status-update-dialog.tsx`

A Client Component confirmation dialog for status transitions. Shows the new status and asks for confirmation. Calls `updatePrintOrderStatus` server action.

### Verification

- [ ] Print order create page renders with all fields
- [ ] Customer search works (search existing, or type new name/phone)
- [ ] File upload works (files appear in Supabase Storage bucket)
- [ ] Uploaded files can be downloaded via signed URLs
- [ ] Print order list shows all orders with status badges
- [ ] Status filter tabs work
- [ ] Order detail page shows all information
- [ ] Status transitions work in order: registered -> in_progress -> ready -> delivered
- [ ] Cancel works from any non-delivered status
- [ ] Cannot go backwards (e.g., ready -> in_progress is not offered)
- [ ] Payment conversion creates a sale record and marks the order as paid
- [ ] Both admin and employee can create and manage print orders

### Dependencies

- Phase 3 (layout)
- Phase 2 (auth, server actions framework)

---

## Phase 7: Suppliers & Purchases

### Objective

Build supplier management (CRUD) and purchase order workflow: create POs, add line items, receive stock (which increments product quantities), and view purchase history. This module is admin-only.

### Steps

#### 7.1 Create Supplier Server Actions

**File:** `src/lib/actions/suppliers.ts`

```typescript
"use server";
```

Implement:

- `getSuppliers()` -- authAction. Fetches all active suppliers.
- `getSupplier(id)` -- authAction. Fetches single supplier.
- `createSupplier(formData)` -- adminAction. Validates with `SupplierSchema`. Inserts using admin client. Revalidates `/suppliers`.
- `updateSupplier(id, formData)` -- adminAction. Updates supplier. Revalidates.
- `deleteSupplier(id)` -- adminAction. Soft deletes (is_active = false). Revalidates.

#### 7.2 Create Purchase Order Server Actions

**File:** `src/lib/actions/purchases.ts`

```typescript
"use server";
```

Implement:

- `getPurchaseOrders()` -- adminAction. Fetches all POs with supplier name. Orders by created_at DESC.
- `getPurchaseOrder(id)` -- adminAction. Fetches single PO with supplier and purchase_items (with product names).
- `createPurchaseOrder(data)` -- adminAction. Creates a PO with line items. Inserts into `purchase_orders` and `purchase_items`. Calculates subtotal, tax_total, total from line items. Revalidates `/purchases`.
- `updatePurchaseOrderStatus(id, status)` -- adminAction. Updates PO status. Revalidates.
- `receivePurchaseOrder(id, receivedItems)` -- adminAction. For each received item:
  1. Update `purchase_items.quantity_received`
  2. Increment `products.stock_quantity` by the received quantity
  3. Insert a `stock_movements` record with reason='purchase_received', reference_id=PO id
  4. If all items fully received, update PO status to 'received'. If partially, set to 'partially_received'.
     Revalidates `/purchases` and `/products`.

#### 7.3 Build the Suppliers Page

**File:** `src/app/(dashboard)/suppliers/page.tsx`

A Server Component that:

1. Calls `requireAdmin()` -- admin only
2. Fetches all suppliers
3. Renders `SupplierTable` and "Add Supplier" button

**File:** `src/app/(dashboard)/suppliers/_components/supplier-table.tsx`

A Client Component data table with columns: Name, Contact Person, Phone, Email, Actions (Edit, Delete).

**File:** `src/app/(dashboard)/suppliers/_components/supplier-form.tsx`

A Client Component dialog for create/edit supplier. Fields: name, contact_person, email, phone, address, notes. Validates with `SupplierSchema`.

The seeded supplier (مكتبة الحبشي / Librairie Al Habachi) should appear in the list.

#### 7.4 Build the Purchase Orders List Page

**File:** `src/app/(dashboard)/purchases/page.tsx`

A Server Component that:

1. Calls `requireAdmin()`
2. Fetches all purchase orders with supplier names
3. Renders `POTable` and "New Purchase Order" link

**File:** `src/app/(dashboard)/purchases/_components/po-table.tsx`

A Client Component data table with columns: PO # (formatted), Supplier, Status (badge), Subtotal, Total, Expected Date, Created At, Actions (View).

#### 7.5 Build the Purchase Order Create Page

**File:** `src/app/(dashboard)/purchases/new/page.tsx`

A Server Component that:

1. Calls `requireAdmin()`
2. Fetches suppliers and products for the form
3. Renders `POForm`

**File:** `src/app/(dashboard)/purchases/_components/po-form.tsx`

A Client Component form:

- Supplier select dropdown
- Expected delivery date picker
- Line items table:
  - Product search/select (Combobox)
  - Quantity ordered (number input)
  - Unit cost (auto-filled from product.purchase_price, editable)
  - Line total (auto-calculated)
  - Add/remove line item buttons
- Subtotal, tax, total summary
- Notes textarea
- Submit button

#### 7.6 Build the Purchase Order Detail Page

**File:** `src/app/(dashboard)/purchases/[id]/page.tsx`

A Server Component showing:

- PO number, status, supplier name, dates
- Line items table (product name, qty ordered, qty received, unit cost, line total)
- Status actions: Mark as Ordered, Cancel
- "Receive Stock" button (links to receive page)

#### 7.7 Build the Receive Stock Page

**File:** `src/app/(dashboard)/purchases/[id]/receive/page.tsx`

A Server Component that renders `ReceiveForm`.

**File:** `src/app/(dashboard)/purchases/_components/receive-form.tsx`

A Client Component:

- Lists all PO line items
- For each item: product name, qty ordered, qty previously received, qty to receive now (number input)
- Submit calls `receivePurchaseOrder` which increments stock and creates stock movements
- Success toast: "Stock received for X items"

### Verification

- [ ] Suppliers page shows the seeded supplier (مكتبة الحبشي)
- [ ] Admin can create, edit, and soft-delete suppliers
- [ ] Admin can create a purchase order with multiple line items
- [ ] PO list shows orders with status badges
- [ ] Receiving stock on a PO:
  - Increments product stock_quantity
  - Creates stock_movement records with reason='purchase_received'
  - Updates PO status to 'received' or 'partially_received'
- [ ] Employee cannot access supplier or purchase pages (redirected to `/`)
- [ ] The 3 seeded POs appear in the list

### Dependencies

- Phase 4 (products exist for PO line items)
- Phase 3 (layout, admin route protection)

---

## Phase 8: Customers

### Objective

Build customer management: list, create, edit, view purchase history, and integrate customer selection into the POS module.

### Steps

#### 8.1 Create Customer Server Actions

**File:** `src/lib/actions/customers.ts`

```typescript
"use server";
```

Implement:

- `getCustomers(search?)` -- authAction. Fetches customers with optional name/phone search. Uses trigram search on name.
- `getCustomer(id)` -- authAction. Fetches single customer with purchase history.
- `createCustomer(formData)` -- authAction (both admin and employee can create). Validates with `CustomerSchema`. Inserts using admin client. Revalidates `/customers`.
- `updateCustomer(id, formData)` -- authAction (both roles can update per RLS). Updates customer. Revalidates.
- `getCustomerPurchaseHistory(customerId)` -- authAction. Fetches sales where customer_id matches, ordered by created_at DESC. Includes sale items.

#### 8.2 Build the Customers List Page

**File:** `src/app/(dashboard)/customers/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Fetches all customers
3. Renders `CustomerTable` and "Add Customer" button

**File:** `src/app/(dashboard)/customers/_components/customer-table.tsx`

A Client Component data table with columns: Name, Phone, Email, Store Credit (MAD), Created At, Actions (View, Edit).

Includes search by name or phone.

**File:** `src/app/(dashboard)/customers/_components/customer-form.tsx`

A Client Component dialog for create/edit customer. Fields: name (required), email, phone, address, notes. Validates with `CustomerSchema`.

#### 8.3 Build the Customer Detail Page

**File:** `src/app/(dashboard)/customers/[id]/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Fetches customer by id
3. Fetches purchase history for this customer
4. Displays:
   - Customer info card (name, email, phone, address, notes, store credit balance)
   - Edit button (opens dialog)
   - Purchase history table: date, sale number, items, total, payment method, status
   - Print orders by this customer (if any)

**File:** `src/app/(dashboard)/customers/_components/purchase-history.tsx`

A Server Component that displays a table of the customer's past sales with sale_number, date, total, payment_method, and status.

#### 8.4 Add "Walk-in Customer" Seed

After the main seed data, insert a default walk-in customer:

```sql
INSERT INTO public.customers (name, email, phone) VALUES ('Walk-in Customer', NULL, NULL);
```

This can be done manually in the SQL Editor or added to a supplementary seed script.

### Verification

- [ ] Customers page shows any existing customers (including Walk-in Customer if seeded)
- [ ] Both admin and employee can create a new customer
- [ ] Both admin and employee can edit customer details
- [ ] Customer detail page shows purchase history (empty until sales are made)
- [ ] Customer search works by name and phone
- [ ] Customer selector in POS (Phase 5) links to real customer data

### Dependencies

- Phase 3 (layout)
- Phase 5 (POS creates sales that appear in purchase history)

---

## Phase 9: Reports & Dashboard

### Objective

Build the dashboard KPI cards with real data, sales reports with charts, low stock report, print order report, and CSV/PDF export functionality.

### Steps

#### 9.1 Wire the Dashboard Home Page with Real Data

**File:** `src/app/(dashboard)/page.tsx`

Replace the placeholder KPIs from Phase 3 with real Supabase queries. Copy the exact query pattern from research.md Section 8.2:

1. **Today's Sales**: Query `v_daily_sales` view for today's date. Display total_revenue and transaction_count.
2. **Pending Print Orders**: Count print_orders where status IN ('registered', 'in_progress').
3. **Low Stock Count**: Count from `v_low_stock` view.
4. **Recent Sales**: Fetch last 10 sales with id, sale_number, total, payment_method, created_at, status.

Display as 4 KPI cards (shadcn/ui Card) at the top, followed by:

- Recent sales table (last 10 transactions)
- Optional: A quick-pick chart showing sales trend for the last 7 days

For the employee role, show only today's sales data (per research.md Section 3.6 route matrix).

#### 9.2 Build the Sales Report Page

**File:** `src/app/(dashboard)/reports/sales/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Accepts date range from search params (default: last 30 days)
3. Queries `v_daily_sales` view for the date range
4. Passes data to client chart and table components

**File:** `src/app/(dashboard)/reports/_components/date-range-picker.tsx`

A Client Component using shadcn/ui Calendar in a Popover:

- Start date and end date pickers
- Preset buttons: Today, Last 7 Days, Last 30 Days, This Month, Last Month
- On change, updates URL search params (for server-side filtering)

**File:** `src/app/(dashboard)/reports/_components/sales-chart.tsx`

A Client Component (`"use client"`) using Recharts:

- Bar chart showing daily revenue
- Line overlay showing transaction count
- Responsive container
- Tooltip on hover showing date, revenue, count

**File:** `src/app/(dashboard)/reports/_components/report-table.tsx`

A Client Component data table for report data:

- Columns: Date, Transactions, Revenue, Tax, Discounts, Average Basket
- All amounts formatted as MAD
- Sortable columns
- Summary row at bottom with totals

#### 9.3 Build the Product Performance Report

**File:** `src/app/(dashboard)/reports/products/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Queries `v_product_performance` view
3. Displays: top selling products (by quantity), top revenue products, product table with all performance metrics
4. Columns: Product Name, Category, Price, Total Sold, Total Revenue, Total Profit, Current Stock

#### 9.4 Build the Low Stock Report

**File:** `src/app/(dashboard)/reports/stock/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Queries `v_low_stock` view
3. Displays products sorted by stock_quantity ascending
4. Columns: Product Name, Barcode, Current Stock, Threshold, Selling Price
5. Color coding: red for out of stock (0), orange for low stock (1-threshold)
6. Reorder suggestion column (threshold - stock_quantity = suggested reorder qty)

#### 9.5 Build the Print Order Report

**File:** `src/app/(dashboard)/reports/print-orders/page.tsx`

A Server Component that:

1. Calls `getAuthUser()`
2. Queries `v_print_order_summary` view for the date range
3. Displays: orders by status, revenue breakdown (paid vs unpaid)

#### 9.6 Build the Reports Hub Page

**File:** `src/app/(dashboard)/reports/page.tsx`

A Server Component with cards linking to each report:

- Sales Report (link to `/reports/sales`)
- Product Performance (link to `/reports/products`)
- Stock Report (link to `/reports/stock`)
- Print Order Report (link to `/reports/print-orders`)

Each card shows a brief description and a key metric.

#### 9.7 Build CSV Export

**File:** `src/lib/utils/csv-export.ts`

Copy the exact `generateCSV` and `downloadCSV` utilities from research.md Section 8.3.

**File:** `src/app/api/reports/export-csv/route.ts`

Copy the exact Route Handler from research.md Section 8.5. Supports `?type=sales&start=YYYY-MM-DD&end=YYYY-MM-DD` query params. Authenticates the user. Returns a CSV file response with appropriate headers.

**File:** `src/app/(dashboard)/reports/_components/export-buttons.tsx`

A Client Component with:

- "Export CSV" button that triggers a download from the CSV Route Handler
- "Export PDF" button that generates a PDF using jsPDF client-side

#### 9.8 Build PDF Report Export

**File:** `src/lib/utils/report-pdf.ts`

Copy the exact `generateReportPDF` function from research.md Section 8.4. Generates A4 portrait PDFs with:

- Title and date range header
- Table with configurable columns
- Summary section
- Page breaks for long reports

### Verification

- [ ] Dashboard shows real KPI data (zeroes initially, populated after sales are made)
- [ ] Sales report shows daily aggregates with bar chart and table
- [ ] Date range picker works and filters the report data
- [ ] Product performance report shows all 215 products with sales metrics
- [ ] Low stock report shows products below threshold (initially all 215 since stock=0)
- [ ] Print order report shows aggregated data
- [ ] CSV export downloads a valid CSV file
- [ ] PDF export generates and downloads a valid PDF report
- [ ] Employee sees limited report data (today's sales only per route matrix)

### Dependencies

- Phase 5 (sales data exists for reports)
- Phase 6 (print order data exists)
- Phase 4 (product data exists)

---

## Phase 10: Settings & User Management

### Objective

Build the admin-only settings pages: user management (create, edit, deactivate employees) and store configuration.

### Steps

#### 10.1 Build the Settings Hub Page

**File:** `src/app/(dashboard)/settings/page.tsx`

A Server Component that:

1. Calls `requireAdmin()`
2. Displays cards linking to:
   - User Management (`/settings/users`)
   - Store Settings (`/settings/store`)

#### 10.2 Build User Management Page

**File:** `src/app/(dashboard)/settings/users/page.tsx`

A Server Component that:

1. Calls `requireAdmin()`
2. Fetches all profiles from Supabase
3. Renders `UserTable` and "Add User" button

**File:** `src/app/(dashboard)/settings/_components/user-table.tsx`

A Client Component data table with columns: Name, Email, Role (badge), Active status, Created At, Actions (Edit, Deactivate/Activate).

**File:** `src/app/(dashboard)/settings/_components/user-form.tsx`

A Client Component dialog for creating/editing users:

- **Create mode:** Email, password, full name, role selector (admin/employee). Calls `createUser` server action (from Phase 2).
- **Edit mode:** Full name, role selector, active toggle. Calls an `updateProfile` server action.

Add an `updateProfile` server action in `src/lib/actions/auth-actions.ts`:

```typescript
export async function updateProfile(
  userId: string,
  data: { full_name?: string; role?: string; is_active?: boolean },
) {
  // adminAction wrapper
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}
```

#### 10.3 Build Store Settings Page

**File:** `src/app/(dashboard)/settings/store/page.tsx`

A Server Component that:

1. Calls `requireAdmin()`
2. Renders `StoreForm` with current `STORE_CONFIG` values

**File:** `src/app/(dashboard)/settings/_components/store-form.tsx`

A Client Component form for editing store info:

- Store name, address, phone, tax ID
- Currency (display only: MAD)
- Default tax rate
- Receipt footer text
- Receipt disclaimer text

For the MVP, these values are stored in `STORE_CONFIG` constants file. A full implementation would store them in a `settings` table, but for the MVP, editing this form simply shows the current values. If persistence is needed, add a `store_settings` table to the database (deferred to v2).

### Verification

- [ ] Settings page accessible only to admin (employee redirected)
- [ ] User list shows all profiles
- [ ] Admin can create a new user with email/password
- [ ] New user can log in and is assigned the correct role
- [ ] Admin can change a user's role
- [ ] Admin can deactivate a user
- [ ] Store settings page displays current configuration

### Dependencies

- Phase 2 (auth, createUser action)
- Phase 3 (layout, admin route protection)

---

## Phase 11: Polish & QA

### Objective

Final quality pass: responsiveness, loading states on all async operations, error handling on all forms, TypeScript error sweep, hardcoded value audit, and end-to-end testing of the complete sales flow.

### Steps

#### 11.1 Add Loading States to All Async Operations

Ensure every form submission and data fetch shows a loading indicator:

- All submit buttons use `disabled` + spinner during pending state
- All data tables show skeleton loading state while data is fetching
- All server action calls handle errors with try/catch and show toast notifications

Add `loading.tsx` files for major routes if not already present:

- `src/app/(dashboard)/products/loading.tsx`
- `src/app/(dashboard)/pos/loading.tsx`
- `src/app/(dashboard)/print-orders/loading.tsx`
- `src/app/(dashboard)/customers/loading.tsx`
- `src/app/(dashboard)/reports/loading.tsx`

#### 11.2 Add Error Handling to All Forms

Ensure every form:

- Shows validation errors inline (field-level) using Zod schemas
- Shows server-side errors as toast notifications
- Does not clear user input on error (preserves form state for retry)
- Handles network failures gracefully

#### 11.3 Implement Void Sale Flow

Ensure the void sale functionality is complete (admin only):

1. In the sale detail or reports view, admin sees a "Void Sale" button
2. Clicking opens a dialog requesting a void reason (required text input)
3. Confirm calls `voidSale` server action
4. Sale status changes to 'voided'
5. Stock is restored automatically (via `handle_sale_void_stock_restore` trigger)
6. Stock movement records are created with reason='sale_void'

#### 11.4 Add Role-Based UI Guards

Review all pages and ensure:

- Buttons/links for admin-only actions (create product, edit product, delete product, void sale, manage users, manage suppliers, manage purchases, stock adjustments) are hidden from employees
- Admin-only pages redirect employees to `/`
- Server actions double-check role (not just UI hiding)

Per research.md Section 3.6 route matrix:
| Route | Admin | Employee |
|-------|-------|----------|
| `/products/new`, `/products/[id]/edit` | Yes | No |
| `/suppliers` | Yes | No |
| `/purchases` | Yes | No |
| `/settings`, `/settings/users` | Yes | No |
| Void sale action | Yes | No |
| Delete product action | Yes | No |
| Stock adjustment action | Yes | No |

#### 11.5 TypeScript Error Sweep

Run `npx tsc --noEmit` and fix all TypeScript errors. Common issues:

- Missing type annotations on server action return values
- Nullable types not handled (selling_price can be null)
- Supabase query return types needing explicit casting

#### 11.6 Hardcoded Value Audit

Search the codebase for hardcoded values that should use constants:

- Currency formatting should use `STORE_CONFIG.currency` / `STORE_CONFIG.currencySymbol`
- Store name should use `STORE_CONFIG.name`
- Default tax rate should use `STORE_CONFIG.defaultTaxRate`
- Receipt text should use `STORE_CONFIG.receiptFooter` / `STORE_CONFIG.receiptDisclaimer`

#### 11.7 Responsive Design Check

While the primary target is desktop browser, ensure:

- Sidebar collapses on smaller screens (< 1024px)
- POS page remains usable on tablet-sized screens
- Data tables use horizontal scroll on narrow viewports
- Forms are readable on all screen sizes

#### 11.8 End-to-End Smoke Test

Perform a complete flow test:

1. **Login** as admin
2. **Dashboard:** Verify KPI cards load
3. **Products:** View product list (215 items), search, filter by category
4. **Create product:** Add a new product with barcode, verify it appears in list
5. **POS:**
   a. Search for a product by name, add to cart
   b. Add another product by typing a barcode (simulate scanner)
   c. Adjust quantities
   d. Apply a cart discount
   e. Select a customer
   f. Pay with cash, verify change calculation
   g. Confirm sale, verify receipt PDF opens
   h. Verify stock decremented in products table
   i. Verify sale appears in recent sales
6. **Print Orders:**
   a. Create a print order with file upload
   b. Transition through statuses: registered -> in_progress -> ready -> delivered
   c. Convert to sale (payment)
7. **Reports:** Verify sales report shows the sale just made
8. **Void Sale:** Admin voids the sale, verify stock restored
9. **Employee Login:** Log out admin, log in as employee
   a. Verify employee cannot see admin-only links/pages
   b. Employee makes a sale -- should work
   c. Employee tries to void -- should fail
10. **Export:** Download CSV from sales report

### Verification

- [ ] All TypeScript errors resolved (`npx tsc --noEmit` passes)
- [ ] All forms show loading states during submission
- [ ] All forms show validation errors inline
- [ ] All server action errors show toast notifications
- [ ] No hardcoded currency values (all use STORE_CONFIG)
- [ ] End-to-end smoke test passes for both admin and employee roles
- [ ] Receipt PDF generates and prints correctly
- [ ] Stock levels are accurate after sales and voids
- [ ] CSV export downloads correctly

### Dependencies

- All previous phases (0-10) must be complete

---

## Final Verification Checklist

### Database (11 tables + 4 views)

- [ ] `profiles` table exists with RLS enabled
- [ ] `categories` table exists with 60 seeded categories
- [ ] `products` table exists with 215 seeded products
- [ ] `customers` table exists
- [ ] `suppliers` table exists with 1 seeded supplier
- [ ] `sales` table exists with SERIAL sale_number
- [ ] `sale_items` table exists
- [ ] `stock_movements` table exists
- [ ] `purchase_orders` table exists with 3 seeded POs
- [ ] `purchase_items` table exists with 215 seeded items
- [ ] `print_orders` table exists
- [ ] `v_daily_sales` view is queryable
- [ ] `v_product_performance` view is queryable
- [ ] `v_low_stock` view is queryable
- [ ] `v_print_order_summary` view is queryable
- [ ] `print-files` storage bucket exists

### Auth & Security

- [ ] Admin user exists and can log in
- [ ] Employee user exists and can log in
- [ ] Middleware redirects unauthenticated users to /login
- [ ] RLS policies enforce role-based access
- [ ] Server actions validate roles before executing
- [ ] Service role key is never exposed to the client

### Features

- [ ] Product CRUD works (admin only for CUD)
- [ ] Category CRUD works (admin only for CUD)
- [ ] POS: search, barcode scan, cart, checkout, receipt
- [ ] Payment: cash (with change), card, transfer
- [ ] Print orders: create, status transitions, file upload, payment conversion
- [ ] Suppliers: CRUD (admin only)
- [ ] Purchase orders: create, receive stock (admin only)
- [ ] Customers: CRUD, purchase history
- [ ] Dashboard: KPI cards with real data
- [ ] Reports: sales, product performance, low stock, print orders
- [ ] Export: CSV and PDF
- [ ] Void sale: admin only, stock restoration
- [ ] User management: create/edit users (admin only)

### UX

- [ ] Loading states on all async operations
- [ ] Error handling on all forms and actions
- [ ] Toast notifications for success and error
- [ ] Sidebar navigation with active link highlighting
- [ ] Role-based UI (admin-only elements hidden for employees)

---

## Expected File Tree (Complete)

```
C:\Users\Mr\Desktop\Library\
|-- .env.local
|-- .gitignore
|-- next.config.ts
|-- package.json
|-- tsconfig.json
|-- tailwind.config.ts (or css-based config)
|-- postcss.config.mjs
|-- components.json
|-- research.md
|-- generate_seed.py
|-- PLAN.md
|-- seed-data/
|   |-- Copie de LIBRAIRIE AL HABACHI (Enregistre automatiquement).xlsx
|   |-- Copie de LIBRAIRIE AL HABACHI Francais.xlsx
|   |-- Copie de LIBRAIRIE AL HABACHI ANGLAIS.xlsx
|-- supabase/
|   |-- seed.sql
|   |-- migrations/
|       |-- 001_extensions.sql
|       |-- 002_enums.sql
|       |-- 003_utility_functions.sql
|       |-- 004_profiles.sql
|       |-- 005_categories.sql
|       |-- 006_products.sql
|       |-- 007_customers.sql
|       |-- 008_suppliers.sql
|       |-- 009_sales.sql
|       |-- 010_stock_movements.sql
|       |-- 011_purchase_orders.sql
|       |-- 012_print_orders.sql
|       |-- 013_stock_triggers.sql
|       |-- 014_views.sql
|       |-- 015_storage.sql
|       |-- 016_rls_helper.sql
|       |-- 017_rls_policies.sql
|-- src/
    |-- middleware.ts
    |-- app/
    |   |-- layout.tsx                          (root layout)
    |   |-- not-found.tsx
    |   |-- (auth)/
    |   |   |-- layout.tsx                      (centered, no sidebar)
    |   |   |-- login/
    |   |   |   |-- page.tsx
    |   |   |-- auth/
    |   |       |-- callback/
    |   |           |-- route.ts
    |   |-- (dashboard)/
    |   |   |-- layout.tsx                      (sidebar + topbar)
    |   |   |-- page.tsx                        (dashboard home)
    |   |   |-- loading.tsx
    |   |   |-- error.tsx
    |   |   |-- pos/
    |   |   |   |-- page.tsx
    |   |   |   |-- loading.tsx
    |   |   |   |-- _components/
    |   |   |       |-- cart.tsx
    |   |   |       |-- product-search.tsx
    |   |   |       |-- product-grid.tsx
    |   |   |       |-- payment-dialog.tsx
    |   |   |       |-- receipt-preview.tsx
    |   |   |-- products/
    |   |   |   |-- page.tsx
    |   |   |   |-- loading.tsx
    |   |   |   |-- new/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- [id]/
    |   |   |   |   |-- page.tsx
    |   |   |   |   |-- edit/
    |   |   |   |       |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- product-form.tsx
    |   |   |       |-- product-table.tsx
    |   |   |       |-- product-filters.tsx
    |   |   |       |-- barcode-label.tsx
    |   |   |-- categories/
    |   |   |   |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- category-form.tsx
    |   |   |       |-- category-tree.tsx
    |   |   |-- print-orders/
    |   |   |   |-- page.tsx
    |   |   |   |-- loading.tsx
    |   |   |   |-- new/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- [id]/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- print-order-form.tsx
    |   |   |       |-- print-order-table.tsx
    |   |   |       |-- status-badge.tsx
    |   |   |       |-- file-upload.tsx
    |   |   |       |-- status-update-dialog.tsx
    |   |   |-- customers/
    |   |   |   |-- page.tsx
    |   |   |   |-- loading.tsx
    |   |   |   |-- [id]/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- customer-form.tsx
    |   |   |       |-- customer-table.tsx
    |   |   |       |-- purchase-history.tsx
    |   |   |-- suppliers/
    |   |   |   |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- supplier-form.tsx
    |   |   |       |-- supplier-table.tsx
    |   |   |-- purchases/
    |   |   |   |-- page.tsx
    |   |   |   |-- new/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- [id]/
    |   |   |   |   |-- page.tsx
    |   |   |   |   |-- receive/
    |   |   |   |       |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- po-form.tsx
    |   |   |       |-- po-table.tsx
    |   |   |       |-- receive-form.tsx
    |   |   |-- reports/
    |   |   |   |-- page.tsx
    |   |   |   |-- loading.tsx
    |   |   |   |-- sales/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- products/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- stock/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- print-orders/
    |   |   |   |   |-- page.tsx
    |   |   |   |-- _components/
    |   |   |       |-- date-range-picker.tsx
    |   |   |       |-- sales-chart.tsx
    |   |   |       |-- report-table.tsx
    |   |   |       |-- export-buttons.tsx
    |   |   |-- settings/
    |   |       |-- page.tsx
    |   |       |-- users/
    |   |       |   |-- page.tsx
    |   |       |-- store/
    |   |       |   |-- page.tsx
    |   |       |-- _components/
    |   |           |-- user-form.tsx
    |   |           |-- user-table.tsx
    |   |           |-- store-form.tsx
    |   |-- api/
    |       |-- reports/
    |       |   |-- export-csv/
    |       |   |   |-- route.ts
    |       |   |-- export-pdf/
    |       |       |-- route.ts
    |       |-- receipts/
    |           |-- [saleId]/
    |               |-- route.ts
    |-- components/
    |   |-- ui/                                  (shadcn/ui -- auto-generated)
    |   |   |-- button.tsx
    |   |   |-- input.tsx
    |   |   |-- label.tsx
    |   |   |-- card.tsx
    |   |   |-- table.tsx
    |   |   |-- dialog.tsx
    |   |   |-- dropdown-menu.tsx
    |   |   |-- select.tsx
    |   |   |-- badge.tsx
    |   |   |-- tabs.tsx
    |   |   |-- separator.tsx
    |   |   |-- sheet.tsx
    |   |   |-- textarea.tsx
    |   |   |-- calendar.tsx
    |   |   |-- popover.tsx
    |   |   |-- command.tsx
    |   |   |-- form.tsx
    |   |   |-- skeleton.tsx
    |   |   |-- alert.tsx
    |   |   |-- avatar.tsx
    |   |   |-- tooltip.tsx
    |   |   |-- switch.tsx
    |   |   |-- sonner.tsx
    |   |-- layout/
    |   |   |-- sidebar.tsx
    |   |   |-- topbar.tsx
    |   |   |-- breadcrumbs.tsx
    |   |-- shared/
    |       |-- data-table.tsx
    |       |-- confirm-dialog.tsx
    |       |-- loading-spinner.tsx
    |       |-- empty-state.tsx
    |       |-- search-input.tsx
    |-- hooks/
    |   |-- use-barcode-scanner.ts
    |   |-- use-cart.ts
    |   |-- use-debounce.ts
    |-- lib/
        |-- auth.ts
        |-- supabase/
        |   |-- client.ts
        |   |-- server.ts
        |   |-- admin.ts
        |-- actions/
        |   |-- guard.ts
        |   |-- auth-actions.ts
        |   |-- products.ts
        |   |-- sales.ts
        |   |-- categories.ts
        |   |-- customers.ts
        |   |-- suppliers.ts
        |   |-- purchases.ts
        |   |-- print-orders.ts
        |   |-- stock.ts
        |-- store/
        |   |-- cart-store.ts
        |-- utils/
        |   |-- format.ts
        |   |-- constants.ts
        |   |-- receipt-pdf.ts
        |   |-- report-pdf.ts
        |   |-- csv-export.ts
        |   |-- validation.ts
        |-- types/
            |-- database.ts
            |-- cart.ts
```

---

## Dependency Graph

```
Phase 0: Project Bootstrap
  |
  v
Phase 1: Database Schema & Seed Data
  |
  v
Phase 2: Auth, Supabase Clients & Middleware
  |
  v
Phase 3: Core Layout & Navigation
  |
  +-----> Phase 4: Products & Categories
  |         |
  |         +-----> Phase 5: POS ------+
  |         |                          |
  |         +-----> Phase 7: Suppliers & Purchases
  |                                    |
  +-----> Phase 6: Print Orders        |
  |                                    |
  +-----> Phase 8: Customers           |
  |                                    |
  +-----> Phase 10: Settings           |
  |                                    |
  +------------------------------------+
  |
  v
Phase 9: Reports & Dashboard (depends on Phases 4-8 for data)
  |
  v
Phase 11: Polish & QA (depends on all phases)
```

Key constraints:

- Phase 1 before Phase 2 (database must exist before auth)
- Phase 2 before Phase 3 (auth must work before layout uses it)
- Phase 3 before Phases 4-10 (layout must exist for pages)
- Phase 4 before Phase 5 (products needed for POS)
- Phase 4 before Phase 7 (products needed for purchase orders)
- Phase 5 before Phase 9 (sales data needed for reports)
- All phases before Phase 11 (QA covers everything)

Phases 4, 6, 8, and 10 can be built in parallel if multiple engineers are available, as long as Phase 3 is done.

---

## Environment Variables Summary

| Variable                        | Description                              | Where Used                          | Exposure                         |
| ------------------------------- | ---------------------------------------- | ----------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                     | Browser + Server                    | Public (client-safe)             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key            | Browser + Server                    | Public (client-safe)             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (bypasses RLS) | Server only (actions, admin client) | SECRET -- never expose to client |

---

## Weekend Build Priority: MVP vs v2

### MUST ship for MVP (Phases 0-6, 8-9, 11)

| Phase | Module                | Reason                                          |
| ----- | --------------------- | ----------------------------------------------- |
| 0     | Project Bootstrap     | Foundation                                      |
| 1     | Database              | All features depend on it                       |
| 2     | Auth                  | Security gate                                   |
| 3     | Layout & Navigation   | Shell for all pages                             |
| 4     | Products & Categories | Core inventory                                  |
| 5     | POS                   | Primary revenue function                        |
| 6     | Print Orders          | Secondary revenue function                      |
| 8     | Customers             | Needed for POS customer linking                 |
| 9     | Reports (partial)     | Dashboard KPIs + daily sales report + low stock |
| 11    | Polish (partial)      | Loading states, error handling, smoke test      |

### CAN defer to v2

| Phase/Feature                                     | Reason to Defer                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Phase 7: Suppliers & Purchases (full PO workflow) | Admin can adjust stock manually for now. The seeded POs cover historical data. |
| Phase 10: Settings / User Management              | Admin can create users via Supabase dashboard directly                         |
| Reports: PDF export                               | CSV export covers the need                                                     |
| Reports: Product performance                      | Daily sales report is sufficient for MVP                                       |
| Camera barcode scanning (@zxing)                  | USB scanner is the primary input method                                        |
| Split tender payments                             | Cash/card/transfer covers 95%+ of transactions                                 |
| Customer store credit                             | Edge case for v2                                                               |
| Barcode label batch printing                      | Single label preview sufficient                                                |
| Sales by employee report                          | Standard reports cover MVP                                                     |
| ISBN auto-fill from barcode                       | Nice-to-have, not blocking                                                     |
| Dark mode                                         | Cosmetic                                                                       |
| Offline/PWA                                       | Requires IndexedDB queue                                                       |
| Supabase Realtime                                 | Not needed for 1-3 users                                                       |

### Recommended weekend sprint order

If building over a weekend (16 productive hours), execute in this order:

1. Phases 0-2 (bootstrap, database, auth) -- 2 hours
2. Phase 3 (layout) -- 1 hour
3. Phase 4 (products) -- 2 hours
4. Phase 5 (POS) -- 3 hours (most complex)
5. Phase 8 (customers, basic) -- 1 hour
6. Phase 6 (print orders) -- 2 hours
7. Phase 9 (dashboard KPIs + sales report only) -- 2 hours
8. Phase 11 (partial polish + smoke test) -- 3 hours

---

## Known Gotchas (from research.md Section 10)

1. **@supabase/ssr cookie pattern:** Use `getAll()`/`setAll()` ONLY. Never use `get()`/`set()`/`remove()`. Using the old pattern causes silent auth failures.
2. **Next.js 15 `cookies()` is async:** Always `await cookies()`. This is a breaking change from Next.js 14.
3. **jsPDF is client-side only:** Never run in Server Components or Server Actions. It requires the DOM/Canvas API.
4. **Middleware file name:** Use `middleware.ts` for Next.js 15. The `proxy.ts` rename is for Next.js 16 only. Do NOT use `proxy.ts`.
5. **SERIAL columns are not gap-free:** sale_number, po_number, order_number may have gaps after rollbacks. This is normal and expected.
6. **Negative stock is allowed:** The schema permits stock_quantity < 0. This is by design (backorder behavior). Add a CHECK constraint only if the owner explicitly wants to prevent it.
7. **Trigram index requires pg_trgm extension:** Must run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` before creating product/customer/supplier tables.
8. **Browser print dialog limitations:** Cannot programmatically set paper size or bypass the print dialog. The 80mm PDF width hints at the correct size.
9. **React Strict Mode double-mounts:** In development, `useEffect` runs twice. Ensure all effects have proper cleanup functions.
10. **Supabase free tier limits:** 500MB DB, 1GB storage, 50K MAU, 2GB bandwidth. Monitor file storage if handling many print orders.

---

_End of Execution Plan_
