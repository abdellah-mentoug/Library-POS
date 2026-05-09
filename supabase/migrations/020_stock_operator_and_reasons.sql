-- stock_operator role, entry/exit movement reasons, RLS for stock inserts

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'stock_operator';

ALTER TYPE public.stock_movement_reason ADD VALUE IF NOT EXISTS 'entry';
ALTER TYPE public.stock_movement_reason ADD VALUE IF NOT EXISTS 'exit';

DROP POLICY IF EXISTS "Stock movements: admin can insert" ON public.stock_movements;
CREATE POLICY "Stock movements: admin or stock_operator can insert"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'stock_operator'));
