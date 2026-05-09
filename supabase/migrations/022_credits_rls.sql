-- =============================================================================
-- Migration 022: RLS for credit tables + atomic charge_credit RPC
-- =============================================================================

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credit accounts: authenticated can read"
  ON public.credit_accounts FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Credit accounts: admin can manage"
  ON public.credit_accounts FOR ALL TO authenticated
  USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credit transactions: authenticated can read"
  ON public.credit_transactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Credit transactions: authenticated can insert"
  ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ── Atomic charge_credit RPC ──────────────────────────────────────────────────
-- Handles both balance update and transaction log in a single atomic operation.
-- Call via: supabase.rpc('charge_credit', { p_account_id, p_amount, ... })
CREATE OR REPLACE FUNCTION public.charge_credit(
  p_account_id    UUID,
  p_amount        NUMERIC,
  p_reference_id  UUID    DEFAULT NULL,
  p_reference_type TEXT   DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account public.credit_accounts%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  -- Lock row to prevent race conditions
  SELECT * INTO v_account
  FROM public.credit_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;

  IF NOT v_account.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Account is inactive');
  END IF;

  v_new_balance := v_account.current_balance + p_amount;

  IF v_new_balance > v_account.credit_limit THEN
    RETURN json_build_object('success', false, 'error', 'Credit limit exceeded',
      'available', v_account.credit_limit - v_account.current_balance);
  END IF;

  UPDATE public.credit_accounts
  SET current_balance = v_new_balance
  WHERE id = p_account_id;

  INSERT INTO public.credit_transactions
    (credit_account_id, transaction_type, amount, balance_after, reference_id, reference_type, notes, created_by)
  VALUES
    (p_account_id, 'charge', p_amount, v_new_balance, p_reference_id, p_reference_type, p_notes, auth.uid());

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- ── Atomic record_credit_payment RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_credit_payment(
  p_account_id UUID,
  p_amount     NUMERIC,
  p_notes      TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account public.credit_accounts%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  SELECT * INTO v_account
  FROM public.credit_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;

  -- Payments reduce balance; floor at 0
  v_new_balance := GREATEST(0, v_account.current_balance - p_amount);

  UPDATE public.credit_accounts
  SET current_balance = v_new_balance
  WHERE id = p_account_id;

  INSERT INTO public.credit_transactions
    (credit_account_id, transaction_type, amount, balance_after, notes, created_by)
  VALUES
    (p_account_id, 'payment', -p_amount, v_new_balance, p_notes, auth.uid());

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
