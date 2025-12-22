-- =====================================================
-- Add Company/Business Profile Fields to usuarios
-- =====================================================
-- This migration adds fields needed for invoice generation
-- to the existing usuarios table
-- =====================================================

-- Add company/business profile columns
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS empresa_rtn TEXT,
ADD COLUMN IF NOT EXISTS empresa_cai TEXT,
ADD COLUMN IF NOT EXISTS empresa_direccion TEXT,
ADD COLUMN IF NOT EXISTS empresa_telefono TEXT,
ADD COLUMN IF NOT EXISTS empresa_email TEXT,
ADD COLUMN IF NOT EXISTS tasa_impuesto NUMERIC(5, 4) DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS factura_rango_inicio TEXT,
ADD COLUMN IF NOT EXISTS factura_rango_fin TEXT,
ADD COLUMN IF NOT EXISTS factura_proximo_numero TEXT,
ADD COLUMN IF NOT EXISTS cai_fecha_vencimiento DATE;

-- Add comments for documentation
COMMENT ON COLUMN public.usuarios.empresa_rtn IS 'Company RTN (Tax ID) for invoices';
COMMENT ON COLUMN public.usuarios.empresa_cai IS 'CAI code for invoice generation';
COMMENT ON COLUMN public.usuarios.empresa_direccion IS 'Company address for invoices';
COMMENT ON COLUMN public.usuarios.empresa_telefono IS 'Company phone for invoices';
COMMENT ON COLUMN public.usuarios.empresa_email IS 'Company email for invoices';
COMMENT ON COLUMN public.usuarios.tasa_impuesto IS 'Tax rate (default 0.15 = 15%)';
COMMENT ON COLUMN public.usuarios.factura_rango_inicio IS 'Invoice range start (e.g., 000-001-01-00000001)';
COMMENT ON COLUMN public.usuarios.factura_rango_fin IS 'Invoice range end (e.g., 000-001-01-00005000)';
COMMENT ON COLUMN public.usuarios.factura_proximo_numero IS 'Next invoice number (auto-calculated)';
COMMENT ON COLUMN public.usuarios.cai_fecha_vencimiento IS 'CAI expiration date';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify columns are added: Check usuarios table structure
-- 3. Update the Profile UI to allow editing these fields
--
-- =====================================================

