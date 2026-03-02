-- Migration 002: Create all enum types
-- These must be created before any tables that reference them

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
