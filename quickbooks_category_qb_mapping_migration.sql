-- =====================================================
-- QuickBooks Category to Account ID Mapping
-- =====================================================
-- Allows users to customize which QB account each category maps to
-- =====================================================

CREATE TABLE IF NOT EXISTS public.category_qb_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  manu_category TEXT NOT NULL,
  qb_account_id TEXT NOT NULL,
  qb_account_name TEXT, -- For reference
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
-- Function to get QB account ID for category
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

