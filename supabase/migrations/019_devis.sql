-- =============================================================================
-- Migration 019: Devis, Bon de Commande, Facture tables
-- =============================================================================

-- Enums
CREATE TYPE public.devis_status AS ENUM (
  'draft', 'sent', 'accepted', 'converted', 'rejected', 'expired'
);

-- ── Devis (Quote) ─────────────────────────────────────────────────────────────
CREATE TABLE public.devis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_number     SERIAL,
  customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_address TEXT,
  customer_phone   TEXT,
  status           public.devis_status NOT NULL DEFAULT 'draft',
  validity_days    INTEGER NOT NULL DEFAULT 30,
  expires_at       DATE,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  internal_notes   TEXT,
  sent_at          TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ,
  converted_at     TIMESTAMPTZ,
  converted_to_bdc_id UUID,
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.devis_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id     UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description  TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
  line_total   NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ── Bon de Commande ───────────────────────────────────────────────────────────
CREATE TABLE public.bons_de_commande (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bdc_number       SERIAL,
  devis_id         UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_address TEXT,
  customer_phone   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','invoiced','cancelled')),
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  confirmed_at     TIMESTAMPTZ,
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bdc_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bdc_id       UUID NOT NULL REFERENCES public.bons_de_commande(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description  TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
  line_total   NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ── Facture (Invoice) ─────────────────────────────────────────────────────────
CREATE TABLE public.factures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_number   SERIAL,
  bdc_id           UUID REFERENCES public.bons_de_commande(id) ON DELETE SET NULL,
  devis_id         UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  sale_id          UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_address TEXT,
  customer_phone   TEXT,
  status           TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid','paid','partial','cancelled')),
  payment_method   public.payment_method,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date         DATE,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.facture_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id   UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description  TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
  line_total   NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_devis_customer   ON public.devis(customer_id);
CREATE INDEX idx_devis_status     ON public.devis(status);
CREATE INDEX idx_devis_created    ON public.devis(created_at DESC);
CREATE INDEX idx_bdc_devis        ON public.bons_de_commande(devis_id);
CREATE INDEX idx_bdc_customer     ON public.bons_de_commande(customer_id);
CREATE INDEX idx_facture_bdc      ON public.factures(bdc_id);
CREATE INDEX idx_facture_customer ON public.factures(customer_id);
CREATE INDEX idx_facture_status   ON public.factures(status);

-- updated_at triggers
CREATE TRIGGER set_devis_updated_at
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_bdc_updated_at
  BEFORE UPDATE ON public.bons_de_commande
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
