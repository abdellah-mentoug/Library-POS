-- =============================================================================
-- Migration 023: Add 'entry' and 'exit' to stock_movement_reason enum
-- Run AFTER 018b_rls_stock_operator.sql
-- NOTE: ADD VALUE cannot run inside a transaction block.
-- =============================================================================

ALTER TYPE public.stock_movement_reason ADD VALUE IF NOT EXISTS 'entry';
ALTER TYPE public.stock_movement_reason ADD VALUE IF NOT EXISTS 'exit';

-- Verify:
-- SELECT unnest(enum_range(NULL::public.stock_movement_reason));

