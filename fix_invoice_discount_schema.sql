-- =====================================================
-- Fix Invoice Discount Schema and RLS Policies
-- =====================================================

-- Step 1: Verify and add discount columns if they don't exist
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);

-- Step 2: Add comments for documentation
COMMENT ON COLUMN public.invoices.discount_percentage IS 'Discount percentage (0-100)';
COMMENT ON COLUMN public.invoices.discount_amount IS 'Discount amount in currency';

-- Step 3: Verify RLS is enabled
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete invoice items" ON public.invoice_items;

-- Step 5: Create comprehensive RLS policies for invoices
CREATE POLICY "Users can insert their own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 6: Create RLS policies for invoice_items
CREATE POLICY "Users can insert invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invoice items"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete invoice items"
ON public.invoice_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

-- Step 7: Verify the schema
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'invoices'
  AND column_name IN ('discount_percentage', 'discount_amount')
ORDER BY ordinal_position;

-- Step 8: Test insert permissions (optional - comment out if not needed)
-- This will show if the current user can insert into invoices table
-- SELECT has_table_privilege('public.invoices', 'INSERT');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('invoices', 'invoice_items');

-- Check all policies on invoices table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- This script:
-- 1. Adds discount columns if missing
-- 2. Ensures RLS is enabled
-- 3. Creates comprehensive RLS policies
-- 4. Allows authenticated users to:
--    - Insert their own invoices (with discount fields)
--    - View their own invoices
--    - Update their own invoices
--    - Delete their own invoices
--    - Manage invoice items for their invoices
-- 
-- Run this in Supabase SQL Editor
-- 
-- =====================================================

