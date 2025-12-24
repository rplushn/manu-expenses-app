-- =====================================================
-- Add DELETE RLS Policy for Invoices
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoice items" ON public.invoice_items;

-- Create DELETE policy for invoices
-- Allows users to delete only their own invoices
CREATE POLICY "Users can delete their own invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create DELETE policy for invoice_items
-- Allows users to delete items from their own invoices
-- Note: CASCADE on foreign key will auto-delete items when invoice is deleted
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

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('invoices', 'invoice_items')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- This script adds DELETE policies for:
-- 1. invoices table - users can delete their own invoices
-- 2. invoice_items table - users can delete items from their own invoices
-- 
-- The foreign key constraint on invoice_items has ON DELETE CASCADE,
-- so when an invoice is deleted, all its items are automatically deleted.
-- 
-- Security:
-- - Users can only delete invoices they own (user_id = auth.uid())
-- - Users cannot delete other users' invoices
-- - Invoice items are protected by the invoice ownership check
-- 
-- =====================================================


