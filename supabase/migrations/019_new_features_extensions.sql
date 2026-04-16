-- Migration: 019_new_features_extensions.sql
-- Date: 2026-04-06
-- Description: Add new tables and enums for supplier/client management, stock management, quotes/devis, history, credits, employee roles, and Arabic support

-- ------------------------------------------------------------------------------
-- 1. NEW ENUMS
-- ------------------------------------------------------------------------------
-- Extend user_role enum with new role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'seller_stock_operator';

-- New enums for the features
CREATE TYPE credit_type AS ENUM ('school', 'library');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- ------------------------------------------------------------------------------
-- 2. TRANSLATIONS TABLE (for Arabic support)
-- ------------------------------------------------------------------------------
CREATE TABLE public.translations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   key TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'ar',
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(key, language)
);

-- ------------------------------------------------------------------------------
-- 3. EXTEND CUSTOMERS TABLE (add client_type for schools/libraries)
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'individual' CHECK (client_type IN ('school', 'library', 'individual'));

-- ------------------------------------------------------------------------------
-- 4. QUOTES TABLE (devis management)
-- ------------------------------------------------------------------------------
CREATE TABLE public.quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {product_id, quantity, unit_price, discount}
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status quote_status DEFAULT 'draft',
    notes TEXT,
    valid_until DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. INVOICES TABLE (factures from quotes)
-- ------------------------------------------------------------------------------
CREATE TABLE public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status invoice_status DEFAULT 'draft',
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. HISTORY_RECORDS TABLE (stock action history)
-- ------------------------------------------------------------------------------
CREATE TABLE public.history_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL, -- 'stock_entry', 'stock_exit', 'adjustment', 'transfer', 'supplier_receipt', 'sale_withdrawal', etc.
    entity_type TEXT NOT NULL, -- 'product', 'stock_movement', 'purchase_order', etc.
    entity_id UUID NOT NULL,
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. CREDITS TABLE (school/library credits)
-- ------------------------------------------------------------------------------
CREATE TABLE public.credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    credit_type credit_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    reference_number TEXT, -- For tracking credit usage
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. UPDATE PROFILES TABLE (ensure role column exists and supports new role)
-- ------------------------------------------------------------------------------
-- The profiles table should already have role column from existing schema
-- Just ensure it can handle the new enum value (already added above)

-- ------------------------------------------------------------------------------
-- 9. RLS POLICIES FOR NEW TABLES
-- ------------------------------------------------------------------------------
-- Translations: readable by all authenticated users
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are viewable by authenticated users" ON public.translations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Quotes: CRUD based on user role
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own quotes" ON public.quotes
    FOR SELECT USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));
CREATE POLICY "Users can create quotes" ON public.quotes
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own quotes" ON public.quotes
    FOR UPDATE USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));

-- Invoices: Similar to quotes
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invoices" ON public.invoices
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee', 'seller_stock_operator')
    ));
CREATE POLICY "Users can create invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update invoices" ON public.invoices
    FOR UPDATE USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));

-- History Records: Viewable by admin/employee, insertable by all authenticated
ALTER TABLE public.history_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History viewable by staff" ON public.history_records
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));
CREATE POLICY "History insertable by authenticated users" ON public.history_records
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Credits: CRUD based on role
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credits viewable by staff" ON public.credits
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));
CREATE POLICY "Credits manageable by staff" ON public.credits
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));

-- ------------------------------------------------------------------------------
-- 10. DATABASE VIEWS FOR REPORTING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.quote_summary AS
SELECT
    q.id,
    q.quote_number,
    c.name as customer_name,
    q.total,
    q.status,
    q.created_at,
    q.valid_until
FROM public.quotes q
LEFT JOIN public.customers c ON q.customer_id = c.id;

CREATE OR REPLACE VIEW public.invoice_summary AS
SELECT
    i.id,
    i.invoice_number,
    c.name as customer_name,
    i.total,
    i.status,
    i.due_date,
    i.paid_at
FROM public.invoices i
LEFT JOIN public.customers c ON i.customer_id = c.id;

CREATE OR REPLACE VIEW public.credit_summary AS
SELECT
    cr.id,
    c.name as customer_name,
    cr.credit_type,
    cr.amount,
    cr.balance,
    cr.created_at
FROM public.credits cr
LEFT JOIN public.customers c ON cr.customer_id = c.id;

-- ------------------------------------------------------------------------------
-- 11. TRIGGERS FOR AUTOMATIC HISTORY TRACKING
-- ------------------------------------------------------------------------------
-- Trigger for stock_movements history
CREATE OR REPLACE FUNCTION public.log_stock_movement_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.history_records (action_type, entity_type, entity_id, description, old_value, new_value, user_id)
    VALUES (
        CASE
            WHEN TG_OP = 'INSERT' THEN 'stock_entry'
            WHEN TG_OP = 'UPDATE' THEN 'stock_adjustment'
            WHEN TG_OP = 'DELETE' THEN 'stock_exit'
        END,
        'stock_movement',
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'INSERT' THEN 'Stock movement created: ' || NEW.quantity || ' units of product ' || NEW.product_id
            WHEN TG_OP = 'UPDATE' THEN 'Stock movement updated for product ' || NEW.product_id
            WHEN TG_OP = 'DELETE' THEN 'Stock movement deleted for product ' || OLD.product_id
        END,
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        auth.uid()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.log_stock_movement_history();

-- ------------------------------------------------------------------------------
-- 12. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_history_entity ON public.history_records(entity_type, entity_id);
CREATE INDEX idx_history_created_at ON public.history_records(created_at DESC);
CREATE INDEX idx_credits_customer ON public.credits(customer_id, credit_type);