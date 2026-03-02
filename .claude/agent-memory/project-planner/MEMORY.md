# Project Planner Agent Memory

## Project: Library POS System (Moroccan Bookshop)
- Blueprint: `research.md` (3086 lines, fully read)
- Plan: `PLAN.md` (2709 lines, 12 phases, Phase 0-11)
- Seed: `supabase/seed.sql` (574 lines, 215 products)

## Schema Summary (11 tables, 4 views, 7 enums)
Tables: profiles, categories, products, customers, suppliers, sales, sale_items, stock_movements, purchase_orders, purchase_items, print_orders
Views: v_daily_sales, v_product_performance, v_low_stock, v_print_order_summary
Enums: user_role, payment_method, sale_status, print_order_status, print_service_type, purchase_order_status, stock_movement_reason

## Key Dependencies
- pg_trgm extension required before creating tables with trigram indexes
- profiles table trigger depends on auth.users (Supabase internal)
- Stock decrement via DB trigger on sale_items INSERT (not app code)
- Stock restore via DB trigger on sales UPDATE (voided status)
- service_role key used for all writes (bypasses RLS)

## Critical Gotchas Found
- @supabase/ssr: must use getAll/setAll (not get/set/remove)
- Next.js 15: cookies() is async (await required)
- jsPDF: client-side only, never in Server Components
- middleware.ts (not proxy.ts) for Next.js 15
- selling_price is nullable (owner sets manually)
- barcode is VARCHAR(13) nullable (owner scans later)
- SERIAL columns (sale_number etc.) are not gap-free

## MVP Weekend Priority Order
Phases 0-6, 8, 9(partial), 11(partial) = must ship
Phase 7 (purchases) and Phase 10 (settings) = can defer
