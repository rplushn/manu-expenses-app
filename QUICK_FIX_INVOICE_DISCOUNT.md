# 🚨 Quick Fix: Invoice Discount Error

## Problem
Invoice creation fails when saving with discount fields.

## Solution (3 Steps)

### Step 1: Run This SQL in Supabase
```sql
-- Add discount columns
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
CREATE POLICY "Users can insert their own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create SELECT policy
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Step 2: Restart Your App
```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm start
```

### Step 3: Test
1. Create invoice with 10% discount
2. Check console for logs:
   - `📝 Creating invoice with payload`
   - `✅ Invoice created successfully`

## What Was Fixed

### Code Changes (Already Applied)
✅ Enhanced error logging with detailed messages
✅ Improved data validation (discount defaults to 0)
✅ Better number formatting (2 decimal places)
✅ Detailed error alerts for debugging

### Database Changes (You Need to Run)
⚠️ Add discount columns to invoices table
⚠️ Enable RLS policies for INSERT/SELECT

## How to Verify It Works

### Check Console Logs
You should see:
```
📝 Creating invoice with payload: {
  user_id: "...",
  invoice_number: "...",
  client_name: "...",
  subtotal: 100.00,
  discount_percentage: 10.00,  ← Should be here
  discount_amount: 0.00,       ← Should be here
  tax_amount: 13.50,
  total: 103.50
}
✅ Invoice created successfully: <invoice_id>
```

### Check Database
Run in Supabase:
```sql
SELECT * FROM public.invoices ORDER BY created_at DESC LIMIT 1;
```

You should see `discount_percentage` and `discount_amount` columns with values.

## Common Errors

### "column 'discount_percentage' does not exist"
**Fix:** Run Step 1 SQL above.

### "permission denied for table invoices"
**Fix:** Run the RLS policy creation in Step 1.

### "new row violates row-level security policy"
**Fix:** Ensure you're logged in and `user_id` matches your auth user.

## Still Not Working?

### Check This:
```sql
-- Verify columns exist
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'invoices' 
  AND column_name LIKE 'discount%';

-- Should return:
-- discount_percentage
-- discount_amount
```

### Check Policies:
```sql
-- Verify policies exist
SELECT policyname 
FROM pg_policies
WHERE tablename = 'invoices';

-- Should include:
-- Users can insert their own invoices
-- Users can view their own invoices
```

## Need More Help?

See detailed guide: `INVOICE_DISCOUNT_DEBUG_GUIDE.md`

## Summary

1. ✅ Code fixed (error logging, validation)
2. ⚠️ Database needs update (run SQL above)
3. 🧪 Test by creating invoice with discount
4. 📊 Check console for detailed logs

**That's it!** After running the SQL, invoice creation with discounts should work perfectly.


