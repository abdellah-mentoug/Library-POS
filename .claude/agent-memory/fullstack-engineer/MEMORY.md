# Library POS - Agent Memory

## Database Migrations
- 17 migration files in `supabase/migrations/` (001 through 017)
- Execution order matters: extensions > enums > utility functions > tables > triggers > views > storage > RLS
- SQL copied verbatim from `research.md` sections 1.1-1.16 and 2.2-2.3
- `015_storage.sql` may fail via CLI -- run in Supabase SQL Editor if needed

## Schema Summary (11 tables, 4 views)
- **profiles**: extends auth.users, auto-created via trigger on signup
- **categories**: self-referencing parent_id hierarchy (3 languages > 57 subject+grade)
- **products**: VARCHAR(13) barcode, NUMERIC prices, trigram GIN index on name
- **customers**: store_credit support, trigram GIN index on name
- **suppliers**: trigram GIN index on name
- **sales** + **sale_items**: denormalized snapshots (product_name, cost_price)
- **stock_movements**: audit trail, quantity_change (positive=in, negative=out)
- **purchase_orders** + **purchase_items**: supplier order tracking
- **print_orders**: print/copy/bind shop workflow with status progression
- **Views**: v_daily_sales, v_product_performance, v_low_stock, v_print_order_summary

## Key Patterns
- All tables with updated_at use shared `update_updated_at()` trigger function
- SECURITY DEFINER on: handle_new_user, handle_sale_stock_decrement, handle_sale_void_stock_restore, get_my_role
- RLS: admin=full access, employee=read most + create sales/print orders
- 7 enum types defined in 002_enums.sql
- Storage bucket: `print-files` (private, 50MB, document/image MIME types)
