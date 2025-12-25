-- =====================================================
-- QuickBooks Category Mapping Migration
-- =====================================================
-- This migration creates a table to map MANU expense categories
-- to QuickBooks expense account categories
-- =====================================================

-- =====================================================
-- STEP 1: Create category_mapping table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.category_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manu_category TEXT NOT NULL UNIQUE,
  qb_account_name TEXT NOT NULL,
  qb_account_type TEXT NOT NULL, -- Expense, Cost of Goods Sold, etc.
  qb_account_id TEXT, -- Optional: QB account ID if known
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.category_mapping IS 'Maps MANU expense categories to QuickBooks account categories';
COMMENT ON COLUMN public.category_mapping.manu_category IS 'MANU category code (e.g., mercaderia, servicios)';
COMMENT ON COLUMN public.category_mapping.qb_account_name IS 'QuickBooks account name (e.g., Cost of Goods Sold)';
COMMENT ON COLUMN public.category_mapping.qb_account_type IS 'QuickBooks account type (Expense, Cost of Goods Sold, Other Expense)';
COMMENT ON COLUMN public.category_mapping.qb_account_id IS 'QuickBooks account ID (if known, for direct mapping)';

-- =====================================================
-- STEP 2: Insert default category mappings
-- =====================================================

INSERT INTO public.category_mapping (manu_category, qb_account_name, qb_account_type) VALUES
  ('mercaderia', 'Cost of Goods Sold', 'Cost of Goods Sold'),
  ('servicios', 'Office Expenses', 'Expense'),
  ('marketing', 'Advertising & Marketing', 'Expense'),
  ('transporte', 'Vehicle Expenses', 'Expense'),
  ('operacion', 'Operating Expenses', 'Expense'),
  ('personal', 'Payroll Expenses', 'Expense'),
  ('instalaciones', 'Rent or Lease', 'Expense'),
  ('impuestos', 'Taxes & Licenses', 'Expense'),
  ('equipamiento', 'Equipment Rental', 'Expense'),
  ('alimentacion', 'Meals & Entertainment', 'Expense'),
  ('otros', 'Other Expenses', 'Expense')
ON CONFLICT (manu_category) DO NOTHING;

-- =====================================================
-- STEP 3: Create index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_category_mapping_manu_category 
  ON public.category_mapping(manu_category) 
  WHERE is_active = true;

-- =====================================================
-- STEP 4: Create function to get QB account for MANU category
-- =====================================================

CREATE OR REPLACE FUNCTION get_qb_account_for_category(manu_cat TEXT)
RETURNS TABLE (
  qb_account_name TEXT,
  qb_account_type TEXT,
  qb_account_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.qb_account_name,
    cm.qb_account_type,
    cm.qb_account_id
  FROM public.category_mapping cm
  WHERE cm.manu_category = manu_cat
    AND cm.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 5: Create trigger to update updated_at
-- =====================================================

DROP TRIGGER IF EXISTS update_category_mapping_updated_at ON public.category_mapping;
CREATE TRIGGER update_category_mapping_updated_at
  BEFORE UPDATE ON public.category_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify mappings
SELECT 
  manu_category,
  qb_account_name,
  qb_account_type
FROM public.category_mapping
ORDER BY manu_category;

