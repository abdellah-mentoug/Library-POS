-- Migration 001: Enable required PostgreSQL extensions
-- The pg_trgm extension provides trigram-based fuzzy text search
-- Used by GIN indexes on product names, customer names, and supplier names

CREATE EXTENSION IF NOT EXISTS pg_trgm;
