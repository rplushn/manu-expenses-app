-- =====================================================
-- MANU Invoice Module - Simple Migration (No Triggers)
-- =====================================================
-- This is a simplified version without automatic triggers
-- Use this if you prefer manual control over calculations
-- =====================================================

-- 1. CREATE FACTURAS TABLE
CREATE TABLE IF NOT EXISTS public.facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cliente_nombre TEXT NOT NULL,
    cliente_rtn TEXT,
    cliente_telefono TEXT,
    cliente_email TEXT,
    numero TEXT NOT NULL,
    cai TEXT NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (impuesto >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    notas TEXT,
    estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'pagada', 'anulada'))
);

CREATE INDEX idx_facturas_usuario_id ON public.facturas(usuario_id);
CREATE INDEX idx_facturas_fecha ON public.facturas(fecha DESC);
CREATE INDEX idx_facturas_usuario_fecha ON public.facturas(usuario_id, fecha DESC);

-- 2. CREATE FACTURA_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.factura_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    cantidad NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_factura_items_factura_id ON public.factura_items(factura_id);

-- 3. ENABLE RLS
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factura_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR FACTURAS
CREATE POLICY "Users can view their own invoices"
    ON public.facturas FOR SELECT
    USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own invoices"
    ON public.facturas FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own invoices"
    ON public.facturas FOR UPDATE
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own invoices"
    ON public.facturas FOR DELETE
    USING (auth.uid() = usuario_id);

-- 5. RLS POLICIES FOR FACTURA_ITEMS
CREATE POLICY "Users can view their own invoice items"
    ON public.factura_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.facturas
        WHERE facturas.id = factura_items.factura_id
        AND facturas.usuario_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own invoice items"
    ON public.factura_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.facturas
        WHERE facturas.id = factura_items.factura_id
        AND facturas.usuario_id = auth.uid()
    ));

CREATE POLICY "Users can update their own invoice items"
    ON public.factura_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.facturas
        WHERE facturas.id = factura_items.factura_id
        AND facturas.usuario_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own invoice items"
    ON public.factura_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.facturas
        WHERE facturas.id = factura_items.factura_id
        AND facturas.usuario_id = auth.uid()
    ));

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factura_items TO authenticated;

