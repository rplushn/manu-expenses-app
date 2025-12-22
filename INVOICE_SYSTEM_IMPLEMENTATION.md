# Invoice System Implementation

## Overview

Complete invoice creation and management system for the MANU app, following Honduran billing requirements (SAR).

## Database Schema

### Tables Created

Run `create_invoices_tables.sql` in Supabase SQL Editor:

#### 1. `invoices` table
- Stores invoice header information
- Links to auth.users via user_id
- Includes client info, dates, and totals
- RLS enabled - users can only access their own invoices

#### 2. `invoice_items` table
- Stores line items for each invoice
- Links to invoices via invoice_id
- Cascading delete - items deleted when invoice is deleted
- RLS enabled - users can only access items from their invoices

## File Structure

```
src/
├── lib/
│   ├── invoice-types.ts          # TypeScript interfaces
│   └── invoice-helpers.ts        # Helper functions
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Updated with invoices tab
│   │   └── invoices.tsx          # Invoices list screen
│   └── invoices/
│       └── new.tsx                # Create invoice screen
```

## Features

### 1. Invoices List Screen (`src/app/(tabs)/invoices.tsx`)

**Features:**
- Lists all user's invoices (most recent first)
- Shows: invoice number, client name, date, total
- FAB (+) button to create new invoice
- Empty state with "Create first invoice" button
- Validates company info before allowing creation
- Checks invoice range configuration

**Validations:**
- ✅ Requires RTN and CAI configured
- ✅ Requires invoice range configured
- ✅ Redirects to Profile if missing

### 2. Create Invoice Screen (`src/app/invoices/new.tsx`)

**Features:**
- Auto-populates invoice number from `factura_proximo_numero`
- Client information fields (name required, RTN and address optional)
- Dynamic line items (add/remove)
- Real-time total calculations
- Auto-calculates subtotal, tax (15% ISV), and total
- Saves to Supabase and auto-increments invoice number

**Validations:**
- ✅ Invoice number within range check
- ✅ CAI expiration check (alerts if expired or expiring within 30 days)
- ✅ At least one line item required
- ✅ All line item fields must be complete
- ✅ Positive numbers only
- ✅ Total must be > 0

**Line Items:**
- Quantity (integer)
- Description (text)
- Unit Price (decimal)
- Auto-calculated line total

**Calculations:**
- Subtotal = Sum of all line totals
- Tax = Subtotal × tax rate (default 15%)
- Total = Subtotal + Tax

### 3. Helper Functions (`src/lib/invoice-helpers.ts`)

**`incrementInvoiceNumber(current: string): string`**
- Increments Honduran invoice format
- Example: `"000-001-01-00000001"` → `"000-001-01-00000002"`

**`isInvoiceNumberInRange(current, start, end): boolean`**
- Checks if invoice number is within authorized range
- Validates prefix and correlative number

**`isValidInvoiceNumberFormat(invoiceNumber): boolean`**
- Validates format: `XXX-XXX-XX-XXXXXXXX`

**`checkCAIExpiration(expirationDate): object`**
- Returns: `{ isExpired, daysUntilExpiry, isExpiringSoon }`
- Expiring soon = within 30 days

**`calculateLineTotal(quantity, unitPrice): number`**
- Calculates line item total with proper rounding

**`calculateInvoiceTotals(items, taxRate): object`**
- Returns: `{ subtotal, taxAmount, total }`
- Handles all invoice calculations

**`formatCurrency(amount): string`**
- Formats as Honduran Lempiras: `"L 1,234.56"`

## User Flow

### Creating First Invoice

1. User taps Facturas tab
2. If no company info configured → Alert → Redirect to Profile
3. If no invoice range configured → Alert → Redirect to Profile
4. User configures company info and invoice range
5. Returns to Facturas tab
6. Taps (+) button
7. Create Invoice screen opens

### Creating Invoice

1. Invoice number auto-populated
2. System checks:
   - Invoice number within range
   - CAI not expired
   - CAI not expiring soon (warning if < 30 days)
3. User enters client info
4. User adds line items
5. Totals calculate automatically
6. User taps "Crear factura"
7. Validation runs
8. Invoice saved to Supabase
9. Next invoice number incremented
10. User redirected to invoices list

### After Creation

- Invoice appears in list
- Next invoice number updated in user profile
- Ready to create next invoice

## Honduran Invoice Format

```
000-001-01-00000001
│   │   │  │
│   │   │  └─ Correlative (8 digits)
│   │   └──── Document type (2 digits)
│   └──────── Point of emission (3 digits)
└──────────── Establishment (3 digits)
```

## Validations

### Pre-Creation Checks
- ✅ Company RTN configured
- ✅ Company CAI configured
- ✅ Invoice range configured
- ✅ Next invoice number set

### Invoice Creation Checks
- ✅ Invoice number within authorized range
- ✅ CAI not expired
- ✅ CAI expiration warning (< 30 days)
- ✅ Client name required
- ✅ At least one line item
- ✅ All line item fields complete
- ✅ Positive quantities and prices
- ✅ Total > 0

### Error Handling
- User-friendly alerts for all errors
- Supabase errors caught and displayed
- Form validation before submission
- Loading states during save

## Database Operations

### Creating Invoice

```typescript
// 1. Insert invoice header
INSERT INTO invoices (
  user_id, invoice_number, client_name, 
  client_rtn, client_address, invoice_date,
  subtotal, tax_amount, total
)

// 2. Insert line items
INSERT INTO invoice_items (
  invoice_id, quantity, description,
  unit_price, total
)

// 3. Update next invoice number
UPDATE usuarios 
SET factura_proximo_numero = next_number
WHERE id = user_id
```

### Loading Invoices

```typescript
SELECT * FROM invoices
WHERE user_id = current_user_id
ORDER BY invoice_date DESC, created_at DESC
```

## UI Design

### Minimalist Style
- White background (#FFFFFF)
- Black text (#000000)
- Gray borders (#E5E5E5)
- No shadows
- Simple, clean layout

### Components
- Consistent with existing Profile and Expense screens
- Same input field styling
- Same button styling
- Same loading indicators

### Animations
- Fade in for headers
- Slide in down for list items
- Smooth transitions

## Testing Checklist

### Database
- [ ] Run `create_invoices_tables.sql`
- [ ] Verify tables exist in Supabase
- [ ] Verify RLS policies active
- [ ] Test insert with authenticated user

### Company Profile
- [ ] Configure RTN in Profile
- [ ] Configure CAI in Profile
- [ ] Configure invoice range in Profile
- [ ] Set CAI expiration date

### Invoice Creation
- [ ] Create first invoice
- [ ] Verify invoice number auto-populated
- [ ] Add multiple line items
- [ ] Remove line items
- [ ] Verify totals calculate correctly
- [ ] Save invoice
- [ ] Verify next number incremented

### Validations
- [ ] Try creating without company info
- [ ] Try creating without invoice range
- [ ] Try creating with expired CAI
- [ ] Try creating with empty client name
- [ ] Try creating without line items
- [ ] Try creating with invalid quantities
- [ ] Try creating with negative prices

### List View
- [ ] Verify invoices appear in list
- [ ] Verify correct sorting (newest first)
- [ ] Tap invoice to view details
- [ ] Verify empty state shows

## Future Enhancements

Consider adding:
- Invoice detail view
- Invoice editing
- Invoice deletion
- PDF generation
- Email invoice to client
- Invoice search/filter
- Invoice status (paid/unpaid)
- Payment tracking
- Invoice templates
- Recurring invoices
- Multi-currency support

## Notes

- Invoice numbers are auto-incremented and cannot be changed
- CAI expiration is checked on every invoice creation
- Invoice range is validated on every invoice creation
- All monetary values use 2 decimal precision
- Tax rate defaults to 15% (ISV) but can be configured per user
- Invoice date is set to today's date automatically
- All dates use local timezone (YYYY-MM-DD format)

## Support

For issues or questions:
- Check Supabase logs for database errors
- Check console logs for application errors
- Verify company profile is complete
- Verify invoice range is configured correctly
- Verify CAI is not expired

