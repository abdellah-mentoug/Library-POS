-- =============================================================================
-- Migration 020: RLS for Devis / BdC / Facture tables
-- =============================================================================

-- ── devis ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devis: authenticated can read"   ON public.devis FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Devis: authenticated can insert" ON public.devis FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Devis: admin can update"         ON public.devis FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "Devis: admin can delete"         ON public.devis FOR DELETE TO authenticated USING (get_my_role() = 'admin');

ALTER TABLE public.devis_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devis items: authenticated can read"   ON public.devis_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Devis items: authenticated can insert" ON public.devis_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Devis items: admin can update"         ON public.devis_items FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "Devis items: admin can delete"         ON public.devis_items FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- ── bons_de_commande ──────────────────────────────────────────────────────────
ALTER TABLE public.bons_de_commande ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BdC: authenticated can read"   ON public.bons_de_commande FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "BdC: authenticated can insert" ON public.bons_de_commande FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "BdC: admin can update"         ON public.bons_de_commande FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "BdC: admin can delete"         ON public.bons_de_commande FOR DELETE TO authenticated USING (get_my_role() = 'admin');

ALTER TABLE public.bdc_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BdC items: authenticated can read"   ON public.bdc_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "BdC items: authenticated can insert" ON public.bdc_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "BdC items: admin can update"         ON public.bdc_items FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "BdC items: admin can delete"         ON public.bdc_items FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- ── factures ──────────────────────────────────────────────────────────────────
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factures: authenticated can read"   ON public.factures FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Factures: authenticated can insert" ON public.factures FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Factures: admin can update"         ON public.factures FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "Factures: admin can delete"         ON public.factures FOR DELETE TO authenticated USING (get_my_role() = 'admin');

ALTER TABLE public.facture_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Facture items: authenticated can read"   ON public.facture_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Facture items: authenticated can insert" ON public.facture_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Facture items: admin can update"         ON public.facture_items FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "Facture items: admin can delete"         ON public.facture_items FOR DELETE TO authenticated USING (get_my_role() = 'admin');
