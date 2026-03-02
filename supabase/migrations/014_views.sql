-- Migration 014: Database views for reporting
-- Four views that power the reporting dashboard

-- ============================================================
-- Daily sales summary view
-- ============================================================
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

-- ============================================================
-- Product performance view
-- ============================================================
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

-- ============================================================
-- Low stock alert view
-- ============================================================
CREATE OR REPLACE VIEW public.v_low_stock AS
SELECT
  id, name, barcode, sku, stock_quantity, low_stock_threshold, category_id, selling_price
FROM public.products
WHERE is_active = TRUE
  AND stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;

-- ============================================================
-- Print order summary view
-- ============================================================
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
