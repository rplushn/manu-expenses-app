-- =====================================================
-- QuickBooks Vendors and Category Mapping Migration
-- =====================================================
-- Creates tables for vendor caching and category mapping
-- =====================================================

-- =====================================================
-- STEP 1: Create qb_vendors table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.qb_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  qb_vendor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one vendor per user
  UNIQUE(usuario_id, nombre)
);

-- Add comments
COMMENT ON TABLE public.qb_vendors IS 'Cache of QuickBooks vendors to avoid duplicates';
COMMENT ON COLUMN public.qb_vendors.nombre IS 'Vendor name from MANU expense';
COMMENT ON COLUMN public.qb_vendors.qb_vendor_id IS 'QuickBooks vendor ID';

-- Create index
CREATE INDEX IF NOT EXISTS idx_qb_vendors_usuario_nombre 
  ON public.qb_vendors(usuario_id, nombre);

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_qb_vendors_updated_at ON public.qb_vendors;
CREATE TRIGGER update_qb_vendors_updated_at
  BEFORE UPDATE ON public.qb_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 2: Create category_qb_mapping table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.category_qb_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  manu_category TEXT NOT NULL,
  qb_account_id TEXT NOT NULL,
  qb_account_name TEXT, -- For reference/display
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one mapping per user per category
  UNIQUE(usuario_id, manu_category)
);

-- Add comments
COMMENT ON TABLE public.category_qb_mapping IS 'User-specific mapping of MANU categories to QuickBooks account IDs';
COMMENT ON COLUMN public.category_qb_mapping.manu_category IS 'MANU category code (e.g., mercaderia, servicios)';
COMMENT ON COLUMN public.category_qb_mapping.qb_account_id IS 'QuickBooks account ID (required for API)';
COMMENT ON COLUMN public.category_qb_mapping.qb_account_name IS 'QuickBooks account name (for display)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_category_qb_mapping_usuario_category 
  ON public.category_qb_mapping(usuario_id, manu_category);

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_category_qb_mapping_updated_at ON public.category_qb_mapping;
CREATE TRIGGER update_category_qb_mapping_updated_at
  BEFORE UPDATE ON public.category_qb_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 3: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.qb_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_qb_mapping ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create RLS Policies for qb_vendors
-- =====================================================

-- Policy: Users can view their own vendors
DROP POLICY IF EXISTS "Users can view own QB vendors" ON public.qb_vendors;
CREATE POLICY "Users can view own QB vendors"
  ON public.qb_vendors
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Policy: Users can insert their own vendors
DROP POLICY IF EXISTS "Users can insert own QB vendors" ON public.qb_vendors;
CREATE POLICY "Users can insert own QB vendors"
  ON public.qb_vendors
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can update their own vendors
DROP POLICY IF EXISTS "Users can update own QB vendors" ON public.qb_vendors;
CREATE POLICY "Users can update own QB vendors"
  ON public.qb_vendors
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can delete their own vendors
DROP POLICY IF EXISTS "Users can delete own QB vendors" ON public.qb_vendors;
CREATE POLICY "Users can delete own QB vendors"
  ON public.qb_vendors
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- =====================================================
-- STEP 5: Create RLS Policies for category_qb_mapping
-- =====================================================

-- Policy: Users can view their own category mappings
DROP POLICY IF EXISTS "Users can view own category mappings" ON public.category_qb_mapping;
CREATE POLICY "Users can view own category mappings"
  ON public.category_qb_mapping
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Policy: Users can insert their own category mappings
DROP POLICY IF EXISTS "Users can insert own category mappings" ON public.category_qb_mapping;
CREATE POLICY "Users can insert own category mappings"
  ON public.category_qb_mapping
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can update their own category mappings
DROP POLICY IF EXISTS "Users can update own category mappings" ON public.category_qb_mapping;
CREATE POLICY "Users can update own category mappings"
  ON public.category_qb_mapping
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can delete their own category mappings
DROP POLICY IF EXISTS "Users can delete own category mappings" ON public.category_qb_mapping;
CREATE POLICY "Users can delete own category mappings"
  ON public.category_qb_mapping
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- =====================================================
-- STEP 6: Create helper function
-- =====================================================

CREATE OR REPLACE FUNCTION get_qb_account_id_for_category(
  p_usuario_id UUID,
  p_manu_category TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_account_id TEXT;
BEGIN
  -- First try user-specific mapping
  SELECT qb_account_id INTO v_account_id
  FROM public.category_qb_mapping
  WHERE usuario_id = p_usuario_id
    AND manu_category = p_manu_category
  LIMIT 1;

  -- If not found, try default mapping
  IF v_account_id IS NULL THEN
    SELECT qb_account_id INTO v_account_id
    FROM public.category_mapping
    WHERE manu_category = p_manu_category
      AND is_active = true
    LIMIT 1;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_qb_account_id_for_category IS 'Gets QB account ID for a MANU category, checking user-specific mapping first, then defaults';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify tables were created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('qb_vendors', 'category_qb_mapping')
ORDER BY table_name, ordinal_position;

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('qb_vendors', 'category_qb_mapping')
ORDER BY tablename, policyname;
