-- Migration 003: Shared utility functions
-- The update_updated_at() trigger function is used by multiple tables
-- to automatically set the updated_at column on row updates

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
