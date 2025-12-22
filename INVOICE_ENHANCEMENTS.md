# Invoice System Enhancements

## Overview
Enhanced the invoice system with discount functionality, invoice detail viewing, and PDF generation with Honduras-compliant formatting.

## Changes Made

### 1. Database Schema Updates

**File:** `add_discount_to_invoices.sql`

Added two new columns to the `invoices` table:
- `discount_percentage` (NUMERIC(5,2)): Percentage discount (0-100%)
- `discount_amount` (NUMERIC(10,2)): Fixed amount discount

**Calculation Flow:**
1. Subtotal = Sum of all line items
2. Discount = `discount_amount` OR (`subtotal` × `discount_percentage` / 100)
3. Taxable Amount = Subtotal - Discount
4. Tax (ISV) = Taxable Amount × 0.15 (15%)
5. Total = Taxable Amount + Tax

**Migration Instructions:**
```sql
-- Run in Supabase SQL Editor
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);
```

### 2. TypeScript Type Updates

**File:** `src/lib/invoice-types.ts`

Updated `Invoice` and `CreateInvoice` interfaces to include:
```typescript
discount_percentage?: number;
discount_amount?: number;
```

### 3. Helper Function Updates

**File:** `src/lib/invoice-helpers.ts`

**New Function:**
- `calculateDiscount()`: Calculates discount based on percentage or fixed amount

**Updated Function:**
- `calculateInvoiceTotals()`: Now accepts discount parameters and returns:
  - `subtotal`: Sum of line items
  - `discount`: Calculated discount amount
  - `taxableAmount`: Subtotal after discount
  - `taxAmount`: 15% ISV on taxable amount
  - `total`: Final total

### 4. New Invoice Screen Enhancements

**File:** `src/app/invoices/new.tsx`

**New Features:**
- Discount type selector (percentage or fixed amount)
- Discount input field with real-time calculation
- Updated totals section showing:
  - Subtotal
  - Discount (if applied, shown in red)
  - Subtotal with discount
  - ISV (15%)
  - Total

**UI Components:**
- Toggle buttons to switch between percentage and fixed amount discount
- Dynamic discount preview below input
- Discount line in totals summary (red color for visual clarity)

**State Management:**
```typescript
const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
const [discountPercentage, setDiscountPercentage] = useState('');
const [discountAmount, setDiscountAmount] = useState('');
```

### 5. Invoice List Updates

**File:** `src/app/(tabs)/invoices.tsx`

**Changes:**
- Made invoice list items tappable
- Navigate to detail screen on tap: `router.push(\`/invoices/\${invoice.id}\`)`
- Added haptic feedback on tap

### 6. Invoice Detail Screen (NEW)

**File:** `src/app/invoices/[id].tsx`

**Features:**
- View complete invoice details
- Client information display
- Line items with quantities and prices
- Full totals breakdown (with discount if applicable)
- Back button to return to invoice list
- Print/Share button for PDF generation

**UI Sections:**
1. **Header:**
   - Back button with "Facturas" label
   - Print button with loading state

2. **Invoice Info:**
   - Large invoice number
   - Formatted date
   - Client details in bordered card

3. **Line Items:**
   - Each item in separate card
   - Shows description, quantity, unit price
   - Item total displayed prominently

4. **Totals:**
   - Subtotal
   - Discount (if applicable, in red)
   - Subtotal with discount (if discount applied)
   - ISV (15%)
   - Final total (bold, larger font)

### 7. PDF Generation

**Implementation:**
- Uses `expo-print` for PDF generation
- Uses `expo-sharing` for sharing on Android/web
- Uses native print dialog on iOS

**PDF Features:**
- Honduras-compliant invoice format
- Company header with:
  - Business name
  - RTN
  - Address, phone, email
- Invoice details:
  - Invoice number
  - Date
  - CAI
  - CAI expiration date
- Client information
- Line items table with:
  - Quantity
  - Description
  - Unit price
  - Total
- Totals section with:
  - Subtotal
  - Discount (if applicable)
  - Subtotal with discount
  - ISV (15%)
  - Total (bold)
- Footer with thank you message

**PDF Styling:**
- Professional black and white design
- Clear table borders
- Proper spacing and alignment
- Responsive layout
- Print-optimized formatting

**Platform-Specific Behavior:**
- **iOS**: Opens native print dialog
- **Android/Web**: Opens share sheet to save/share PDF

## Usage Instructions

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);
```

### 2. Create Invoice with Discount
1. Navigate to "Facturas" tab
2. Tap "+" FAB button
3. Fill in client information
4. Add line items
5. (Optional) Add discount:
   - Select "Porcentaje" or "Monto fijo"
   - Enter discount value
   - See real-time calculation
6. Review totals
7. Tap "Guardar Factura"

### 3. View Invoice
1. Navigate to "Facturas" tab
2. Tap any invoice in the list
3. View complete invoice details

### 4. Print/Share Invoice
1. Open invoice detail screen
2. Tap "Imprimir" button
3. **iOS**: Select printer or save as PDF
4. **Android/Web**: Choose app to share/save PDF

## Technical Details

### Discount Calculation Logic
```typescript
// Priority: Fixed amount takes precedence over percentage
if (discountAmount && discountAmount > 0) {
  discount = Math.min(discountAmount, subtotal); // Cannot exceed subtotal
} else if (discountPercentage && discountPercentage > 0) {
  discount = subtotal * (discountPercentage / 100);
}
```

### PDF HTML Template
- Uses inline CSS for maximum compatibility
- Responsive design for different page sizes
- Print-optimized styles
- Professional typography
- Clear visual hierarchy

### Data Flow
1. User creates invoice with discount
2. Discount saved to database (both percentage and amount fields)
3. On detail view, discount recalculated from saved values
4. PDF generation uses same calculation logic
5. Ensures consistency across all views

## Testing Checklist

- [ ] Create invoice without discount
- [ ] Create invoice with percentage discount (e.g., 10%)
- [ ] Create invoice with fixed amount discount (e.g., L 50.00)
- [ ] Verify discount cannot exceed subtotal
- [ ] View invoice detail screen
- [ ] Generate PDF on iOS
- [ ] Generate PDF on Android
- [ ] Generate PDF on web
- [ ] Verify PDF formatting
- [ ] Verify all company info appears in PDF
- [ ] Verify CAI and expiration date in PDF
- [ ] Verify discount line in PDF (if applicable)
- [ ] Test back navigation from detail screen
- [ ] Test invoice list tap navigation

## Files Modified

1. `add_discount_to_invoices.sql` (NEW)
2. `src/lib/invoice-types.ts`
3. `src/lib/invoice-helpers.ts`
4. `src/app/invoices/new.tsx`
5. `src/app/(tabs)/invoices.tsx`
6. `src/app/invoices/[id].tsx` (NEW)

## Dependencies Used

- `expo-print` (v15.0.8) - Already installed
- `expo-sharing` (v14.0.8) - Already installed
- `date-fns` - For date formatting
- `lucide-react-native` - For icons
- `react-native-reanimated` - For animations

## Design Principles

1. **Minimalist Design**: Clean, simple UI matching existing app style
2. **Consistency**: Same visual language across all screens
3. **User Feedback**: Haptic feedback on all interactions
4. **Error Handling**: User-friendly alerts for all errors
5. **Loading States**: Clear indicators during async operations
6. **Accessibility**: Proper hit slops and touch targets
7. **Platform Awareness**: Platform-specific behaviors where appropriate

## Future Enhancements (Optional)

1. Edit invoice functionality
2. Delete invoice with confirmation
3. Email invoice PDF directly
4. Invoice templates
5. Recurring invoices
6. Payment tracking
7. Invoice status (paid/pending/overdue)
8. Multi-currency support
9. Custom tax rates per invoice
10. Invoice notes/comments

## Support

For issues or questions:
1. Check Supabase logs for database errors
2. Check console for PDF generation errors
3. Verify all company profile fields are filled
4. Ensure CAI and expiration date are set
5. Test on physical device for print functionality

