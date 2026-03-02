# Library POS Build Progress

## Completed Phases

### Phase 0: Project Bootstrap

- Next.js 15.5.12 scaffolded with TypeScript, Tailwind CSS v4, ESLint, App Router, src/ directory
- All core dependencies installed: @supabase/supabase-js, @supabase/ssr, zustand, @tanstack/react-table, recharts, jspdf, jsbarcode, zod, date-fns, react-to-print, sonner, use-debounce
- Dev dependency: @types/jsbarcode
- shadcn/ui initialized with 23 components
- `.env.local` created with real Supabase credentials
- Full directory structure created (~35 directories)

### Phase 1: Database Schema & Seed Data

- 17 SQL migration files in `supabase/migrations/` (001-017)
- All migrations executed, seed data loaded (215 products, 60 categories, 1 supplier)

### Phase 2: Auth, Supabase Clients & Middleware

- Supabase client utilities (browser, server, admin)
- Middleware with session refresh + route protection
- Auth utilities, action guards, auth server actions
- Login page with Zod validation, auth callback route
- Login flow tested and confirmed working

### Phase 3: Core Layout & Navigation

- STORE_CONFIG, format utilities, Zod validation schemas
- Shared components: loading-spinner, empty-state, confirm-dialog, search-input, data-table
- Layout: sidebar (role-based nav), topbar (user menu), breadcrumbs
- Dashboard with placeholder KPI cards
- 24 placeholder pages, loading/error/404

### Phase 4: Products & Categories

- **Server Actions:**
  - `src/lib/actions/categories.ts` — getCategories, createCategory, updateCategory, deleteCategory
  - `src/lib/actions/products.ts` — getProducts, getProduct, createProduct, updateProduct, deleteProduct
  - `src/lib/actions/stock.ts` — adjustStock, getStockMovements
- **Reusable Data Table:** `src/components/shared/data-table.tsx` — TanStack Table + shadcn/ui with sorting, filtering, pagination
- **Categories Page:**
  - `categories/page.tsx` — Server component with admin "Add Category" button
  - `categories/_components/category-tree.tsx` — Hierarchical tree with expand/collapse, edit/delete for admin
  - `categories/_components/category-form.tsx` — Dialog form for create/edit
- **Products List:**
  - `products/page.tsx` — Server component fetching products + categories
  - `products/_components/product-table.tsx` — Full table with name, barcode, category, prices, margin, stock, actions
  - `products/_components/product-filters.tsx` — Search, category filter, stock status filter
- **Product CRUD:**
  - `products/new/page.tsx` — Admin-only create page
  - `products/[id]/edit/page.tsx` — Admin-only edit page
  - `products/[id]/page.tsx` — Detail page with pricing, stock, barcode, movement history
  - `products/_components/product-form.tsx` — Full form with live margin display
  - `products/_components/barcode-label.tsx` — JsBarcode EAN-13 SVG renderer
  - `products/_components/stock-adjustment-dialog.tsx` — Stock adjustment with reason tracking

### Phase 5: POS / Sales Module

- **Cart Store:** `src/lib/store/cart-store.ts` — Zustand store with CartItem, addItem, removeItem, updateQuantity, setItemDiscount, cart-level discounts, customer, notes, clearCart. `useCartTotals()` selector computes subtotal/tax/discount/total.
- **Hooks:**
  - `src/hooks/use-barcode-scanner.ts` — USB keyboard-wedge scanner (keydown listener, 50ms buffer, Enter terminator)
  - `src/hooks/use-debounce.ts` — Generic debounce hook
  - `src/hooks/use-cart.ts` — Re-export of cart store
- **Server Actions:** `src/lib/actions/sales.ts` — createSale (inserts sale + sale_items, triggers stock decrement), voidSale (admin-only, triggers stock restore)
- **Receipt PDF:** `src/lib/utils/receipt-pdf.ts` — 80mm thermal receipt with jsPDF (store header, items, totals, payment, footer)
- **POS Page:** `src/app/(dashboard)/pos/page.tsx` — Two-panel layout (65/35 split):
  - Left: `product-search.tsx` — Loads all products, client-side filter by name/barcode, click to add to cart
  - Right: `cart.tsx` — Cart items with qty +/-, per-item discount, cart discount (fixed/%), notes, totals, "Charge" button
  - `payment-dialog.tsx` — Cash/Card/Transfer tabs, change calculation, calls createSale, generates receipt PDF, opens in new tab for printing

### Phase 6: Print & Copy Orders

- **Server Actions:** `src/lib/actions/print-orders.ts` — 7 actions:
  - `getPrintOrders(statusFilter?)` — Fetch all, optional status filter
  - `getPrintOrder(id)` — Fetch single by ID
  - `createPrintOrder(input)` — Validated with PrintOrderSchema, returns { id, orderNumber }
  - `updatePrintOrder(id, data)` — Update non-status fields
  - `updatePrintOrderStatus(orderId, newStatus)` — Status workflow: registered → in_progress → ready → delivered, with cancel from any non-delivered state
  - `convertPrintOrderToSale(orderId, paymentMethod?)` — Creates sale record, links to order, marks paid
  - `deletePrintOrderFile(orderId, filePath)` — Admin-only file deletion from storage
- **Components:**
  - `status-badge.tsx` — Color-coded status badges (blue/yellow/green/gray/red)
  - `file-upload.tsx` — Drag-and-drop upload to Supabase Storage "print-files" bucket, download via signed URLs, admin delete
  - `print-order-form.tsx` — Full create form with customer combobox (existing/new), service type, pricing with auto-calculate, due date calendar
  - `print-order-table.tsx` — TanStack Table with status filter tabs, search, sorting, pagination
  - `status-update-dialog.tsx` — Confirmation dialog for status transitions
  - `payment-button.tsx` — Payment method selector + collect payment action
  - `print-order-detail-client.tsx` — Client wrapper for file upload on detail page
- **Pages:**
  - `print-orders/page.tsx` — Server component list page with "New Print Order" button
  - `print-orders/new/page.tsx` — Create form with customer lookup
  - `print-orders/[id]/page.tsx` — Detail page with order info, status action buttons, file upload, payment collection
  - `print-orders/loading.tsx` — Loading spinner

### Phase 7: Customers Module

- **Server Actions:** `src/lib/actions/customers.ts` — 6 actions:
  - `getCustomers()` — Fetch all customers, ordered by name
  - `getCustomer(id)` — Fetch single customer by ID
  - `createCustomer(formData)` — Validated with CustomerSchema
  - `updateCustomer(id, formData)` — Update customer details
  - `deleteCustomer(id)` — Admin-only hard delete
  - `getCustomerPurchaseHistory(customerId)` — Returns sales (with sale_items) + print orders
- **Components:**
  - `customer-table.tsx` — DataTable with name (linked), email, phone, address, actions dropdown (view/edit/delete), search by name/email/phone
  - `customer-form.tsx` — Create/edit form with name, email, phone, address, notes fields
  - `purchase-history.tsx` — Stats cards (total sales, total spent, print orders) + tabbed view (Sales table with sale#/date/items/payment/status/total, Print Orders table with order#/date/service/status/total)
- **Pages:**
  - `customers/page.tsx` — Server component list page with "Add Customer" button
  - `customers/new/page.tsx` — Create form
  - `customers/[id]/page.tsx` — Detail page with contact info card, notes card, purchase history
  - `customers/[id]/edit/page.tsx` — Edit form
  - `customers/loading.tsx` — Loading spinner

### Phase 8: Suppliers & Purchase Orders

- **Server Actions:** `src/lib/actions/suppliers.ts` — 5 actions:
  - `getSuppliers()` — Fetch active suppliers
  - `getSupplier(id)` — Fetch single supplier
  - `createSupplier(formData)` — Admin-only, validated with SupplierSchema
  - `updateSupplier(id, formData)` — Admin-only update
  - `deleteSupplier(id)` — Admin-only soft delete (is_active = false)
- **Server Actions:** `src/lib/actions/purchases.ts` — 5 actions:
  - `getPurchaseOrders()` — Fetch all POs with supplier names
  - `getPurchaseOrder(id)` — Fetch PO with line items, supplier, products, created_by profile
  - `createPurchaseOrder(input)` — Create PO with dynamic line items, calculates subtotal/total
  - `updatePurchaseOrderStatus(id, status)` — Status transitions (draft→ordered, any→cancelled)
  - `receivePurchaseOrder(poId, receivedItems)` — Receive stock: updates purchase_items qty_received, increments product stock, creates stock_movements, auto-sets PO status (partially_received/received)
- **Supplier Components:**
  - `supplier-table.tsx` — DataTable with search, edit/delete actions
  - `supplier-form.tsx` — Dialog form for create/edit (name, contact, email, phone, address, notes)
  - `suppliers-client.tsx` — Client wrapper managing form dialog open/close and edit state
- **Purchase Order Components:**
  - `po-status-badge.tsx` — Color-coded badges (gray/blue/orange/green/red)
  - `po-table.tsx` — DataTable with PO#, supplier, status, total, dates, sorting, search
  - `po-form.tsx` — Dynamic line items table (product select, qty, unit cost auto-filled from product price, live line totals), supplier select, expected date, notes, running subtotal
  - `po-actions.tsx` — Status action buttons (Mark as Ordered, Receive Stock, Cancel) conditional on current status
  - `receive-form.tsx` — Per-item receive qty inputs, ordered/received/remaining columns, Fill All/Clear All buttons, status indicators
- **Pages:**
  - `suppliers/page.tsx` — Admin-only list with Add Supplier dialog
  - `suppliers/loading.tsx` — Loading spinner
  - `purchases/page.tsx` — Admin-only PO list with New Purchase Order button
  - `purchases/new/page.tsx` — Create form with supplier + product data
  - `purchases/[id]/page.tsx` — PO detail with order info, totals, line items table, action buttons
  - `purchases/[id]/receive/page.tsx` — Receive stock form (only for ordered/partially_received POs)
  - `purchases/loading.tsx` — Loading spinner

### Phase 9: Reports & Dashboard

- **Dashboard** (`page.tsx`):
  - Live KPI cards querying database: Today's Sales (revenue), Transactions Today, Pending Print Orders, Low Stock Items
  - Parallel queries for performance
  - Recent Sales table (last 10 completed sales)
  - Low stock count highlights in red
- **Utilities:**
  - `csv-export.ts` — generateCSV (proper escaping) + downloadCSV (client-side Blob download)
  - `report-pdf.ts` — A4 PDF report generator with jsPDF (title, store name, configurable columns, auto page breaks, summary section)
- **Shared Report Components:**
  - `date-range-picker.tsx` — Start/end date inputs + preset buttons (Today, 7 Days, 30 Days, 90 Days), updates URL search params
  - `sales-chart.tsx` — Recharts ComposedChart with bar (revenue) + line (transactions) on dual Y axes
  - `export-buttons.tsx` — CSV export button using csv-export utility
- **Sales Report** (`reports/sales/`):
  - KPI summary cards: Total Revenue, Transactions, Avg Basket, Discounts
  - Date range picker with URL-based filtering
  - Daily revenue bar chart with transaction count line overlay
  - Daily breakdown table (date, transactions, revenue, tax, discounts, avg basket)
  - CSV export
- **Product Performance** (`reports/products/`):
  - Queries v_product_performance view
  - Sortable DataTable: product name, category, price, total sold, revenue, profit, current stock
  - Search by name/category/barcode
  - CSV export
- **Low Stock Report** (`reports/stock/`):
  - Queries v_low_stock view
  - Color-coded stock badges (red for 0, orange for low)
  - Suggested reorder quantity column
  - CSV export
- **Print Order Report** (`reports/print-orders/`):
  - Queries v_print_order_summary view with date range filtering
  - KPI cards: Total Orders, Total Value, Paid (green), Unpaid (orange)
  - Daily breakdown table by status with paid/unpaid split
  - CSV export
- **Reports Hub** (`reports/page.tsx`):
  - Card grid linking to all 4 report pages with icons and descriptions

### Phase 10: Settings & User Management

- **Server Actions** (added to `auth-actions.ts`):
  - `getUsers()` — Admin-only, fetches profiles + auth.users emails via admin API
  - `updateProfile(userId, data)` — Admin-only, updates full_name, role, is_active
  - `createUser(formData)` — Already existed, creates auth user + auto-triggers profile creation
- **Components:**
  - `user-table.tsx` — DataTable with name, email, role badge, active status badge, created date, actions (edit/deactivate/activate). Prevents self-deactivation.
  - `user-form.tsx` — Dialog form for create (email+password+name+role) and edit (name+role)
  - `users-client.tsx` — Client wrapper managing dialog state for add/edit
  - `store-form.tsx` — Read-only display of STORE_CONFIG values (name, address, phone, tax ID, currency, tax rate, receipt footer/disclaimer)
- **Pages:**
  - `settings/page.tsx` — Admin-only hub with cards linking to Users and Store Settings
  - `settings/users/page.tsx` — Admin-only user management with Add User button
  - `settings/store/page.tsx` — Admin-only store configuration display
  - `settings/loading.tsx` — Loading spinner

### Phase 11: Final Polish

- **Sales History Module:**
  - Server actions added to `sales.ts`: `getSales()` (list with customer+cashier joins), `getSale(id)` (detail with items, cashier, customer, voided_by)
  - `sales-table.tsx` — DataTable with sale#, date, customer, cashier, payment, status badge, total, search + status filter
  - `void-sale-dialog.tsx` — Confirmation dialog with reason textarea, calls voidSale action
  - `sale-detail-client.tsx` — Client wrapper for Void Sale button (admin only, completed sales only)
  - `sales/page.tsx` — Sales history list page
  - `sales/[id]/page.tsx` — Sale detail with info card, totals card, void details card (for voided), line items table
  - `sales/loading.tsx` — Loading spinner
  - Added "Sales" nav item to sidebar
- **Bug Fixes:**
  - Fixed dashboard query: `total_amount` → `total` (correct column name)
  - Fixed customer purchase history query: `total_amount` → `total`, `total_price` → `line_total`
  - Fixed purchase-history component types to match corrected query
- **Polish:**
  - Added missing `loading.tsx` for products and POS pages
  - Removed 5 hardcoded "MAD" strings from form labels (product form, print order form, payment dialog, cart)
  - Zero "Coming soon" placeholders remain
  - All pages fully implemented

## Current State — MVP COMPLETE

- **Dev server**: Runs cleanly
- **TypeScript**: Compiles with zero errors
- **Auth**: Working end-to-end (login, role-based access)
- **Products & Categories**: Full CRUD with real data (215 products, 60 categories)
- **POS**: Complete cart, barcode scanner, payment, receipt PDF
- **Sales**: Full history with search/filter, sale detail, admin void with reason + stock restoration
- **Print Orders**: Full CRUD, status workflow, file upload, payment conversion
- **Customers**: Full CRUD, search, purchase history (sales + print orders)
- **Suppliers**: Full CRUD with dialog form, search, soft delete
- **Purchase Orders**: Full lifecycle — create with line items, status workflow, stock receiving with movement tracking
- **Dashboard**: Live KPIs from database views + recent sales table
- **Reports**: Sales (chart + table), product performance, low stock, print orders — all with CSV export
- **Settings**: User management (create/edit/deactivate), store config display
- **All loading states**: Every route has loading.tsx
- **Role-based UI**: Admin-only buttons/actions hidden for employees
