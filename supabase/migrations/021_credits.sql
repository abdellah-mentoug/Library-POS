-- =============================================================================
-- Migration 021: Credit accounts and transactions
-- =============================================================================

CREATE TYPE public.credit_client_type AS ENUM ('school', 'library', 'individual');

CREATE TABLE public.credit_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  client_type     public.credit_client_type NOT NULL DEFAULT 'individual',
  credit_limit    NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_customer_credit UNIQUE (customer_id)
);

CREATE TABLE public.credit_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id  UUID NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  transaction_type   TEXT NOT NULL CHECK (transaction_type IN ('charge','payment','adjustment')),
  amount             NUMERIC(10,2) NOT NULL,
  balance_after      NUMERIC(10,2) NOT NULL,
  reference_id       UUID,
  reference_type     TEXT,
  notes              TEXT,
  created_by         UUID NOT NULL REFERENCES public.profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add credit flag to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS has_credit_account BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes
CREATE INDEX idx_credit_accounts_customer ON public.credit_accounts(customer_id);
CREATE INDEX idx_credit_accounts_type     ON public.credit_accounts(client_type);
CREATE INDEX idx_credit_accounts_active   ON public.credit_accounts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_credit_trans_account     ON public.credit_transactions(credit_account_id);
CREATE INDEX idx_credit_trans_created     ON public.credit_transactions(created_at DESC);

CREATE TRIGGER set_credit_accounts_updated_at
  BEFORE UPDATE ON public.credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-set has_credit_account on customers when credit account created/deleted
CREATE OR REPLACE FUNCTION public.sync_customer_credit_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.customers SET has_credit_account = TRUE WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.customers SET has_credit_account = FALSE WHERE id = OLD.customer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_credit_account_change
  AFTER INSERT OR DELETE ON public.credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.sync_customer_credit_flag();
