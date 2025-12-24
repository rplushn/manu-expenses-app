-- =====================================================
-- MANU Invoice Module - Database Migration
-- =====================================================
-- This migration creates the invoice (facturas) and invoice items (factura_items) tables
-- Following the same date architecture as the gastos table:
--   - fecha: date (local business date, YYYY-MM-DD)
--   - created_at: timestamptz (UTC timestamp)
-- =====================================================

-- =====================================================
-- 1. CREATE FACTURAS TABLE (Invoices)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    
    -- Date fields (same pattern as gastos)
    fecha DATE NOT NULL,                    -- Local business date (YYYY-MM-DD)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- UTC timestamp
    
    -- Client information
    cliente_nombre TEXT NOT NULL,
    cliente_rtn TEXT,                       -- RTN (Tax ID) - optional
    cliente_telefono TEXT,                  -- Phone - optional
    cliente_email TEXT,                     -- Email - optional
    
    -- Invoice details
    numero TEXT NOT NULL,                   -- Invoice number/correlative
    cai TEXT NOT NULL,                      -- CAI code from empresa profile
    
    -- Financial fields
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (impuesto >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    
    -- Metadata
    notas TEXT,                             -- Optional notes
    estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'pagada', 'anulada'))
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_id ON public.facturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_created_at ON public.facturas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON public.facturas(numero);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON public.facturas(estado);

-- Composite index for common queries (user + date range)
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_fecha ON public.facturas(usuario_id, fecha DESC);

-- Add comment to table
COMMENT ON TABLE public.facturas IS 'Invoices table - stores invoice header information';
COMMENT ON COLUMN public.facturas.fecha IS 'Local business date (YYYY-MM-DD) - used for filtering and reporting';
COMMENT ON COLUMN public.facturas.created_at IS 'UTC timestamp - when the invoice was created in the system';

-- =====================================================
-- 2. CREATE FACTURA_ITEMS TABLE (Invoice Line Items)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.factura_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
    
    -- Line item details
    descripcion TEXT NOT NULL,              -- Product/service description
    cantidad NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),  -- Quantity (supports decimals)
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),  -- Unit price
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),  -- Calculated: cantidad * precio_unitario
    
    -- Metadata
    orden INTEGER NOT NULL DEFAULT 0,       -- Display order
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_factura_items_factura_id ON public.factura_items(factura_id);
CREATE INDEX IF NOT EXISTS idx_factura_items_orden ON public.factura_items(factura_id, orden);

-- Add comment to table
COMMENT ON TABLE public.factura_items IS 'Invoice line items - stores individual products/services in an invoice';
COMMENT ON COLUMN public.factura_items.subtotal IS 'Calculated as cantidad * precio_unitario';

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on facturas table
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own invoices
CREATE POLICY "Users can view their own invoices"
    ON public.facturas
    FOR SELECT
    USING (auth.uid() = usuario_id);

-- Policy: Users can insert their own invoices
CREATE POLICY "Users can insert their own invoices"
    ON public.facturas
    FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can update their own invoices
CREATE POLICY "Users can update their own invoices"
    ON public.facturas
    FOR UPDATE
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can delete their own invoices
CREATE POLICY "Users can delete their own invoices"
    ON public.facturas
    FOR DELETE
    USING (auth.uid() = usuario_id);

-- Enable RLS on factura_items table
ALTER TABLE public.factura_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items of their own invoices
CREATE POLICY "Users can view their own invoice items"
    ON public.factura_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.facturas
            WHERE facturas.id = factura_items.factura_id
            AND facturas.usuario_id = auth.uid()
        )
    );

-- Policy: Users can insert items to their own invoices
CREATE POLICY "Users can insert their own invoice items"
    ON public.factura_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.facturas
            WHERE facturas.id = factura_items.factura_id
            AND facturas.usuario_id = auth.uid()
        )
    );

-- Policy: Users can update items of their own invoices
CREATE POLICY "Users can update their own invoice items"
    ON public.factura_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.facturas
            WHERE facturas.id = factura_items.factura_id
            AND facturas.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.facturas
            WHERE facturas.id = factura_items.factura_id
            AND facturas.usuario_id = auth.uid()
        )
    );

-- Policy: Users can delete items of their own invoices
CREATE POLICY "Users can delete their own invoice items"
    ON public.factura_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.facturas
            WHERE facturas.id = factura_items.factura_id
            AND facturas.usuario_id = auth.uid()
        )
    );

-- =====================================================
-- 4. HELPER FUNCTIONS (Optional but recommended)
-- =====================================================

-- Function to automatically calculate item subtotal
CREATE OR REPLACE FUNCTION public.calculate_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.cantidad * NEW.precio_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate subtotal on insert/update
CREATE TRIGGER trigger_calculate_item_subtotal
    BEFORE INSERT OR UPDATE ON public.factura_items
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_item_subtotal();

-- Function to validate invoice totals
CREATE OR REPLACE FUNCTION public.validate_factura_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure total = subtotal - descuento + impuesto
    IF NEW.total != (NEW.subtotal - NEW.descuento + NEW.impuesto) THEN
        RAISE EXCEPTION 'Invoice total does not match calculation: % != % - % + %',
            NEW.total, NEW.subtotal, NEW.descuento, NEW.impuesto;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate totals on insert/update
CREATE TRIGGER trigger_validate_factura_totals
    BEFORE INSERT OR UPDATE ON public.facturas
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_factura_totals();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factura_items TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify tables are created: Check Tables section
-- 3. Verify RLS policies: Check Policies section
-- 4. Test with a sample insert to ensure RLS works
--
-- Sample test query:
-- INSERT INTO facturas (usuario_id, fecha, cliente_nombre, numero, cai, subtotal, descuento, impuesto, total)
-- VALUES (auth.uid(), CURRENT_DATE, 'Test Client', 'FAC-001', 'CAI-123', 1000, 0, 150, 1150);
--
-- =====================================================


