# Invoice Discount Feature - Debug & Fix Guide

## 🐛 Issue
Invoice creation fails when trying to save with discount fields.

## ✅ Fixes Applied

### 1. Enhanced Error Logging
**File:** `src/app/invoices/new.tsx`

Added comprehensive error logging that shows:
- Error message
- Error details
- Error hints
- Error code
- Full error object in console

**Console Output:**
```javascript
📝 Creating invoice with payload: { ... }
✅ Invoice created successfully: <invoice_id>
📦 Inserting invoice items: 2 items
✅ Invoice items inserted successfully
🔢 Updating next invoice number: 000-001-01-00000002
✅ Next invoice number updated
```

**Error Output:**
```javascript
❌ Invoice creation error: {
  message: "...",
  details: "...",
  hint: "...",
  code: "..."
}
```

### 2. Improved Data Validation
**Changes:**
- Ensured discount values default to 0 if empty
- Added `|| 0` fallback for parseFloat operations
- Convert all numbers to fixed 2 decimal places
- Explicit Number() conversion for all numeric fields

**Before:**
```typescript
const discPct = discountType === 'percentage' && discountPercentage 
  ? parseFloat(discountPercentage) 
  : 0;
```

**After:**
```typescript
const discPct = discountType === 'percentage' && discountPercentage 
  ? parseFloat(discountPercentage) || 0 
  : 0;

// Later in payload:
discount_percentage: Number(discPct.toFixed(2)),
```

### 3. Database Schema Fix
**File:** `fix_invoice_discount_schema.sql`

**What it does:**
1. Adds discount columns if missing
2. Enables RLS on both tables
3. Creates comprehensive RLS policies
4. Verifies schema and permissions

**Key Policies:**
- `Users can insert their own invoices` - Allows INSERT with discount fields
- `Users can view their own invoices` - Allows SELECT
- `Users can update their own invoices` - Allows UPDATE
- `Users can delete their own invoices` - Allows DELETE
- Similar policies for `invoice_items` table

### 4. Detailed Error Messages
**User-Facing Alerts:**
Instead of generic "Error creating invoice", users now see:
```
Error al crear factura

Error: column "discount_percentage" does not exist

Detalles: The column might not be added to the table yet

Sugerencia: Run the migration script

Código: 42703
```

## 🚀 How to Fix

### Step 1: Run Database Migration
Open Supabase SQL Editor and run:

```sql
-- Copy entire contents of fix_invoice_discount_schema.sql
-- Or run this quick fix:

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Recreate INSERT policy
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
CREATE POLICY "Users can insert their own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### Step 2: Verify Schema
Run this query in Supabase:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'invoices'
ORDER BY ordinal_position;
```

**Expected Output:**
You should see `discount_percentage` and `discount_amount` columns.

### Step 3: Verify RLS Policies
```sql
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'invoices';
```

**Expected Output:**
You should see policies for INSERT, SELECT, UPDATE, DELETE.

### Step 4: Test Invoice Creation
1. Open app
2. Go to Facturas tab
3. Tap "+" to create invoice
4. Fill in client info
5. Add line items
6. Add discount (e.g., 10%)
7. Tap "Guardar Factura"
8. **Check console for detailed logs**

## 🔍 Debugging Steps

### If Invoice Creation Still Fails:

#### 1. Check Console Logs
Look for these emoji markers:
- 📝 Creating invoice with payload
- ❌ Invoice creation error
- ✅ Invoice created successfully

#### 2. Check Supabase Logs
Go to Supabase Dashboard → Logs → Postgres Logs

Look for:
- Permission denied errors
- Column does not exist errors
- Constraint violation errors

#### 3. Verify User Authentication
```typescript
console.log('Current user ID:', currentUser?.id);
console.log('Auth UID:', (await supabase.auth.getUser()).data.user?.id);
```

These should match!

#### 4. Test Direct Insert
In Supabase SQL Editor:

```sql
-- Replace with your actual user_id
INSERT INTO public.invoices (
  user_id,
  invoice_number,
  client_name,
  invoice_date,
  subtotal,
  discount_percentage,
  discount_amount,
  tax_amount,
  total
) VALUES (
  '<your-user-id>',
  '000-001-01-00000001',
  'Test Client',
  CURRENT_DATE,
  100.00,
  10.00,
  0.00,
  13.50,
  103.50
);
```

If this fails, the issue is with database schema/permissions.
If this succeeds, the issue is with the app code.

## 🔧 Common Errors & Solutions

### Error: "column 'discount_percentage' does not exist"
**Solution:** Run the migration script to add columns.

### Error: "permission denied for table invoices"
**Solution:** Check RLS policies, ensure INSERT policy exists.

### Error: "new row violates row-level security policy"
**Solution:** Verify `user_id` matches `auth.uid()`.

### Error: "null value in column 'discount_percentage' violates not-null constraint"
**Solution:** Ensure default values are set (already fixed in code).

### Error: "value out of range for type numeric(5,2)"
**Solution:** Discount percentage must be 0-100, amount must fit in NUMERIC(10,2).

## 📊 Data Flow

```
User Input
    ↓
Validate discount type
    ↓
Parse discount value (with || 0 fallback)
    ↓
Convert to Number with .toFixed(2)
    ↓
Create invoice payload
    ↓
Log payload to console 📝
    ↓
Insert to Supabase
    ↓
Check RLS policies
    ↓
Success ✅ or Error ❌
    ↓
Log result to console
    ↓
Show alert to user
```

## 🧪 Test Cases

### Test 1: Percentage Discount
```
Input:
- Client: "Test Client"
- Item: 1 × L 100.00
- Discount: 10%

Expected:
- discount_percentage: 10.00
- discount_amount: 0.00
- Subtotal: 100.00
- Discount: 10.00
- Taxable: 90.00
- ISV: 13.50
- Total: 103.50

Console: ✅ Invoice created successfully
```

### Test 2: Fixed Amount Discount
```
Input:
- Client: "Test Client"
- Item: 1 × L 100.00
- Discount: L 25.00

Expected:
- discount_percentage: 0.00
- discount_amount: 25.00
- Subtotal: 100.00
- Discount: 25.00
- Taxable: 75.00
- ISV: 11.25
- Total: 86.25

Console: ✅ Invoice created successfully
```

### Test 3: No Discount
```
Input:
- Client: "Test Client"
- Item: 1 × L 100.00
- Discount: (none)

Expected:
- discount_percentage: 0.00
- discount_amount: 0.00
- Subtotal: 100.00
- ISV: 15.00
- Total: 115.00

Console: ✅ Invoice created successfully
```

## 📝 Checklist

- [ ] Run `fix_invoice_discount_schema.sql` in Supabase
- [ ] Verify discount columns exist
- [ ] Verify RLS policies exist
- [ ] Test invoice creation with percentage discount
- [ ] Test invoice creation with fixed discount
- [ ] Test invoice creation without discount
- [ ] Check console logs for errors
- [ ] Verify invoices appear in list
- [ ] Verify discount values saved correctly

## 🎯 Success Indicators

✅ Console shows: `📝 Creating invoice with payload`
✅ Console shows: `✅ Invoice created successfully`
✅ Alert shows: "Factura creada correctamente"
✅ Invoice appears in list
✅ Discount values saved in database
✅ No errors in console
✅ No errors in Supabase logs

## 📞 Still Having Issues?

1. **Check Supabase Dashboard:**
   - Table Editor → invoices → Verify columns exist
   - Authentication → Users → Verify user exists
   - Database → Policies → Verify RLS policies

2. **Check App Console:**
   - Look for 📝, ✅, ❌ emoji markers
   - Copy full error object
   - Check payload values

3. **Check Network Tab:**
   - Open browser DevTools → Network
   - Filter by "invoices"
   - Check request payload
   - Check response status/body

4. **Try Direct Database Insert:**
   - Use SQL Editor to insert manually
   - If it works, issue is in app
   - If it fails, issue is in database

## 🔄 Rollback (If Needed)

If you need to rollback the changes:

```sql
-- Remove discount columns
ALTER TABLE public.invoices
DROP COLUMN IF EXISTS discount_percentage,
DROP COLUMN IF EXISTS discount_amount;
```

**Note:** This will delete all discount data!

## 📚 Related Files

- `src/app/invoices/new.tsx` - Invoice creation logic
- `src/lib/invoice-helpers.ts` - Discount calculation
- `src/lib/invoice-types.ts` - TypeScript types
- `fix_invoice_discount_schema.sql` - Database migration
- `add_discount_to_invoices.sql` - Original migration

## 🎉 Summary

The fixes include:
1. ✅ Enhanced error logging with detailed messages
2. ✅ Improved data validation with fallbacks
3. ✅ Database schema verification script
4. ✅ Comprehensive RLS policies
5. ✅ User-friendly error alerts
6. ✅ Console logging for debugging

All discount-related errors should now be caught and displayed with helpful information!


