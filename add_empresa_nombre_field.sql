-- =====================================================
-- Add empresa_nombre Field to usuarios Table
-- =====================================================

-- Add empresa_nombre column
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS empresa_nombre TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.usuarios.empresa_nombre IS 'Legal company name for invoices (e.g., "RPLUS INVERSIONES S DE RL")';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
  AND column_name = 'empresa_nombre';

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- This adds the empresa_nombre field to store the legal
-- company name for invoices, separate from nombre_negocio
-- which is used for the business/brand name.
-- 
-- Example values:
-- - empresa_nombre: "RPLUS INVERSIONES S DE RL"
-- - nombre_negocio: "Mi Negocio"
-- 
-- =====================================================


