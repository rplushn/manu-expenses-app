# Invoice System Testing Checklist

## Pre-Testing Setup

- [ ] Run database migration in Supabase SQL Editor
- [ ] Verify company profile is complete (Profile → Datos de facturación)
- [ ] Ensure CAI and expiration date are set
- [ ] Restart app after migration

## Feature 1: Discount Functionality

### Percentage Discount
- [ ] Create new invoice
- [ ] Select "Porcentaje" discount type
- [ ] Enter 10 (for 10%)
- [ ] Verify discount preview shows correct amount
- [ ] Verify totals section shows:
  - [ ] Subtotal
  - [ ] Descuento (in red, with minus sign)
  - [ ] Subtotal con descuento
  - [ ] ISV (15%)
  - [ ] Total
- [ ] Save invoice
- [ ] Verify invoice saved successfully

### Fixed Amount Discount
- [ ] Create new invoice
- [ ] Select "Monto fijo" discount type
- [ ] Enter 50.00
- [ ] Verify discount preview shows "L 50.00"
- [ ] Verify totals calculate correctly
- [ ] Save invoice
- [ ] Verify invoice saved successfully

### Edge Cases
- [ ] Try discount larger than subtotal (should cap at subtotal)
- [ ] Try negative discount (should not allow)
- [ ] Try 0 discount (should work, no discount line shown)
- [ ] Try 100% discount (should work, total = ISV only)
- [ ] Switch between percentage and amount (should clear other field)

### No Discount
- [ ] Create invoice without discount
- [ ] Verify discount section is optional
- [ ] Verify totals show only:
  - [ ] Subtotal
  - [ ] ISV (15%)
  - [ ] Total
- [ ] Save invoice
- [ ] Verify invoice saved successfully

## Feature 2: Invoice Detail Screen

### Navigation
- [ ] Go to Facturas tab
- [ ] Tap any invoice in list
- [ ] Verify detail screen opens
- [ ] Tap back button
- [ ] Verify returns to invoice list

### Display - Invoice with Discount
- [ ] Open invoice with discount
- [ ] Verify shows:
  - [ ] Invoice number (large, at top)
  - [ ] Date (formatted in Spanish)
  - [ ] Client name
  - [ ] Client RTN (if provided)
  - [ ] Client address (if provided)
  - [ ] All line items with quantities and prices
  - [ ] Subtotal
  - [ ] Descuento (in red)
  - [ ] Subtotal con descuento
  - [ ] ISV (15%)
  - [ ] Total (bold, large)

### Display - Invoice without Discount
- [ ] Open invoice without discount
- [ ] Verify shows:
  - [ ] All invoice details
  - [ ] NO discount line in totals
  - [ ] Only Subtotal, ISV, Total

### Loading State
- [ ] Navigate to detail screen
- [ ] Verify loading spinner shows briefly
- [ ] Verify "Cargando factura..." message

### Error Handling
- [ ] Try navigating to non-existent invoice ID
- [ ] Verify error alert shows
- [ ] Verify navigates back to list

## Feature 3: PDF Generation

### iOS Testing
- [ ] Open invoice detail screen
- [ ] Tap "Imprimir" button
- [ ] Verify loading spinner shows
- [ ] Verify native print dialog opens
- [ ] Check PDF preview in print dialog:
  - [ ] Company header visible
  - [ ] Invoice details correct
  - [ ] Client info correct
  - [ ] Line items table formatted properly
  - [ ] Totals section correct
  - [ ] Footer present
- [ ] Try "Save as PDF"
- [ ] Verify PDF saves to Files
- [ ] Try AirDrop
- [ ] Verify PDF can be AirDropped

### Android Testing
- [ ] Open invoice detail screen
- [ ] Tap "Imprimir" button
- [ ] Verify loading spinner shows
- [ ] Verify share sheet opens
- [ ] Try "Save to Files"
- [ ] Verify PDF saves
- [ ] Try "Share via WhatsApp"
- [ ] Verify PDF can be shared
- [ ] Try "Share via Email"
- [ ] Verify PDF attaches to email

### Web Testing
- [ ] Open invoice detail screen
- [ ] Tap "Imprimir" button
- [ ] Verify loading spinner shows
- [ ] Verify share/download dialog
- [ ] Download PDF
- [ ] Open PDF in browser
- [ ] Verify formatting

### PDF Content - With Discount
- [ ] Generate PDF for invoice with discount
- [ ] Verify PDF contains:
  - [ ] Company name (large, centered)
  - [ ] Company RTN
  - [ ] Company address
  - [ ] Company phone
  - [ ] Company email
  - [ ] Invoice number
  - [ ] Invoice date (Spanish format)
  - [ ] CAI
  - [ ] CAI expiration date
  - [ ] Client name
  - [ ] Client RTN (if provided)
  - [ ] Client address (if provided)
  - [ ] Line items table with borders
  - [ ] Quantity column
  - [ ] Description column
  - [ ] Unit price column (right-aligned)
  - [ ] Total column (right-aligned)
  - [ ] Subtotal row
  - [ ] Descuento row (with minus sign)
  - [ ] Subtotal con descuento row
  - [ ] ISV (15%) row
  - [ ] TOTAL row (bold, larger)
  - [ ] Footer: "Gracias por su preferencia"
  - [ ] Footer: "Factura generada electrónicamente - Original"

### PDF Content - Without Discount
- [ ] Generate PDF for invoice without discount
- [ ] Verify all content same as above EXCEPT:
  - [ ] NO descuento row
  - [ ] NO subtotal con descuento row

### PDF Formatting
- [ ] Verify professional appearance
- [ ] Verify text is readable (not too small)
- [ ] Verify table borders are clear
- [ ] Verify alignment is correct
- [ ] Verify no text overflow
- [ ] Verify page breaks appropriately (if many items)
- [ ] Verify currency formatting (L X,XXX.XX)

### Error Handling
- [ ] Try generating PDF with missing company info
- [ ] Verify appropriate error message
- [ ] Try generating PDF on slow connection
- [ ] Verify loading state persists until complete
- [ ] Try generating PDF twice quickly
- [ ] Verify second request waits for first

## Integration Testing

### Full Flow - With Discount
- [ ] Create invoice with 10% discount
- [ ] Add 3 line items
- [ ] Save invoice
- [ ] Navigate back to list
- [ ] Verify new invoice appears at top
- [ ] Tap invoice to open detail
- [ ] Verify all data correct
- [ ] Generate PDF
- [ ] Verify PDF content matches screen
- [ ] Share PDF via email
- [ ] Verify PDF received and opens correctly

### Full Flow - Without Discount
- [ ] Create invoice without discount
- [ ] Add 2 line items
- [ ] Save invoice
- [ ] Navigate back to list
- [ ] Tap invoice to open detail
- [ ] Verify no discount line shown
- [ ] Generate PDF
- [ ] Verify no discount line in PDF

### Multiple Invoices
- [ ] Create 5 invoices (mix with/without discount)
- [ ] Verify all appear in list
- [ ] Tap each invoice
- [ ] Verify correct data for each
- [ ] Generate PDF for each
- [ ] Verify each PDF is unique and correct

## Performance Testing

- [ ] Create invoice with 20 line items
- [ ] Verify UI remains responsive
- [ ] Save invoice
- [ ] Verify saves in reasonable time
- [ ] Open detail screen
- [ ] Verify loads quickly
- [ ] Generate PDF
- [ ] Verify generates in reasonable time (< 5 seconds)

## Accessibility Testing

- [ ] Test with VoiceOver (iOS) / TalkBack (Android)
- [ ] Verify all buttons have labels
- [ ] Verify all inputs are accessible
- [ ] Verify navigation is logical
- [ ] Test with large text size
- [ ] Verify UI doesn't break

## Cross-Platform Testing

### iOS
- [ ] Test on iPhone (small screen)
- [ ] Test on iPad (large screen)
- [ ] Test on iOS 15+
- [ ] Test dark mode (if supported)

### Android
- [ ] Test on Android phone (small screen)
- [ ] Test on Android tablet (large screen)
- [ ] Test on Android 10+
- [ ] Test different manufacturers (Samsung, Google, etc.)

### Web
- [ ] Test on Chrome
- [ ] Test on Safari
- [ ] Test on Firefox
- [ ] Test on mobile browser
- [ ] Test responsive layout

## Regression Testing

### Existing Features
- [ ] Create invoice without discount (old flow)
- [ ] Verify still works as before
- [ ] View invoice list
- [ ] Verify displays correctly
- [ ] Create expense (unrelated feature)
- [ ] Verify expenses still work
- [ ] View profile
- [ ] Verify profile data loads

## Bug Fixes Verification

- [ ] Verify discount cannot be negative
- [ ] Verify discount cannot exceed subtotal
- [ ] Verify PDF generates even with missing optional fields
- [ ] Verify back navigation doesn't lose data
- [ ] Verify loading states prevent double-submission

## Final Checks

- [ ] No console errors during testing
- [ ] No console warnings during testing
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] All haptic feedback working
- [ ] All animations smooth
- [ ] All alerts user-friendly
- [ ] All loading states clear

## Sign-Off

Tested by: ___________________
Date: ___________________
Platform: ___________________
App Version: ___________________

Notes:
_______________________________________
_______________________________________
_______________________________________

## Issues Found

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
|       |          |        |       |
|       |          |        |       |
|       |          |        |       |

## Test Results

- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___

Overall Status: ☐ PASS ☐ FAIL ☐ NEEDS WORK

