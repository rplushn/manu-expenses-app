-- =====================================================
-- Add Discount Fields to Invoices Table
-- =====================================================

-- Add discount fields
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);

-- Add comments
COMMENT ON COLUMN public.invoices.discount_percentage IS 'Discount percentage (0-100)';
COMMENT ON COLUMN public.invoices.discount_amount IS 'Discount amount in currency';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Calculation flow with discount:
-- 1. Subtotal = Sum of line items
-- 2. Discount = discount_amount OR (subtotal * discount_percentage / 100)
-- 3. Taxable Amount = Subtotal - Discount
-- 4. Tax = Taxable Amount * 0.15
-- 5. Total = Taxable Amount + Tax
-- 
-- =====================================================

