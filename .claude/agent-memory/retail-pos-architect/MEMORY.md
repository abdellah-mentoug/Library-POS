# Retail POS Architect - Agent Memory

## Project: Library Bookshop & Print Shop
- **Stack:** Next.js 15 (App Router), Supabase, Tailwind CSS, shadcn/ui
- **Target:** Desktop browser, 1 admin + 1-2 employees, single store
- **Blueprint:** `C:\Users\Mr\Desktop\Library\research.md` (comprehensive, 2026-02-26)

## Key Decisions
- Next.js 15 uses `middleware.ts`. v16 renames to `proxy.ts` -- do NOT use proxy.ts with v15
- Supabase SSR: MUST use `getAll()`/`setAll()` cookie pattern. Never `get`/`set`/`remove`
- Supabase anon key now called "publishable key" in docs -- env var: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `cookies()` from `next/headers` is async in Next.js 15 -- always `await cookies()`
- Stock decrement via DB trigger (atomic), not application code
- Sale items denormalize product_name/barcode for receipt history
- SERIAL for human-readable numbers (sale_number, order_number), UUID for PKs/FKs
- jsPDF for receipts (80mm thermal format), not @react-pdf/renderer (has Next.js bugs)
- Zustand v5 for POS cart state -- lightweight, no boilerplate
- USB barcode scanner detection via keystroke timing (50ms threshold)
- All mutations via server actions with service role key (bypass RLS)
- Reads use anon key with RLS policies for security

## Schema Pattern
- See `research.md` Section 1 for full schema (15 tables + views + triggers)
- Enums: user_role, payment_method, sale_status, print_order_status, etc.
- Key views: v_daily_sales, v_product_performance, v_low_stock, v_print_order_summary
- Trigram index (pg_trgm) on product/customer/supplier names for fuzzy search

## File Structure
- See `research.md` Section 4 for complete `/app` directory tree
- Route groups: `(auth)` for login, `(dashboard)` for all protected routes
- `lib/actions/guard.ts` -- adminAction/authAction wrappers for role checks
- `lib/store/cart-store.ts` -- Zustand POS cart
- `hooks/use-barcode-scanner.ts` -- USB scanner hook

## Deferred to v2
- Offline/PWA, Realtime, purchase orders, split payments, store credit, camera scanner, batch labels
