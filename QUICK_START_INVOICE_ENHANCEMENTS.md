# 🚀 Quick Start: Invoice Enhancements

## Step 1: Database Migration (REQUIRED)

Open your Supabase project → SQL Editor → New Query → Paste and run:

```sql
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0);
```

✅ Done! Your database is ready.

## Step 2: Test the New Features

### Feature 1: Create Invoice with Discount

1. Open app → Go to **Facturas** tab
2. Tap the **+** button (bottom right)
3. Fill in client information
4. Add line items (quantity, description, price)
5. **NEW:** Scroll to "Descuento (opcional)" section
6. Choose discount type:
   - **Porcentaje**: Enter 10 for 10% off
   - **Monto fijo**: Enter 50.00 for L 50.00 off
7. Watch the totals update in real-time! 🎉
8. Tap **Guardar Factura**

**What you'll see:**
```
Subtotal:              L 1,000.00
Descuento:            -L   100.00  (in red)
Subtotal con descuento: L   900.00
ISV (15%):             L   135.00
Total:                 L 1,035.00
```

### Feature 2: View Invoice Details

1. In **Facturas** tab, tap any invoice
2. **NEW:** Opens detail screen showing:
   - Invoice number (large at top)
   - Date
   - Client info (in bordered card)
   - All line items
   - Complete totals breakdown
3. Tap **← Facturas** to go back

### Feature 3: Print/Share Invoice PDF

1. Open any invoice (tap from list)
2. Tap **Imprimir** button (top right)
3. Wait for PDF generation (shows loading spinner)
4. **On iOS:** Native print dialog opens
   - Select printer or "Save as PDF"
5. **On Android/Web:** Share sheet opens
   - Save to Files, share via WhatsApp, email, etc.

**PDF includes:**
- Your company header (name, RTN, address, phone, email)
- Invoice number, date, CAI, CAI expiration
- Client information
- Professional line items table
- Totals with discount breakdown
- "Gracias por su preferencia" footer

## What's New?

### ✨ Discount System
- Toggle between percentage and fixed amount
- Real-time calculation preview
- Discount shown in red in totals
- Cannot exceed subtotal (validated)

### 📄 Invoice Detail Screen
- Clean, professional layout
- All invoice data in one place
- Easy navigation back to list
- Print button always visible

### 🖨️ PDF Generation
- Honduras-compliant format
- Professional black & white design
- Print-ready quality
- Platform-optimized sharing

## UI Changes

### New Invoice Screen
**Before:**
```
[Client Info]
[Line Items]
[Totals: Subtotal, ISV, Total]
```

**After:**
```
[Client Info]
[Discount Section] ← NEW!
  - Toggle: Porcentaje | Monto fijo
  - Input field
  - Preview: "Descuento aplicado: L 100.00"
[Line Items]
[Totals: Subtotal, Descuento, Subtotal con descuento, ISV, Total]
```

### Invoice List
**Before:**
- Tap invoice → Alert dialog

**After:**
- Tap invoice → Full detail screen ← NEW!

## Examples

### Example 1: 10% Discount
```
3 items totaling L 1,000.00
Discount: 10%
---
Subtotal:              L 1,000.00
Descuento (10%):      -L   100.00
Subtotal con descuento: L   900.00
ISV (15%):             L   135.00
---
TOTAL:                 L 1,035.00
```

### Example 2: Fixed L 50 Discount
```
2 items totaling L 300.00
Discount: L 50.00
---
Subtotal:              L 300.00
Descuento:            -L  50.00
Subtotal con descuento: L 250.00
ISV (15%):             L  37.50
---
TOTAL:                 L 287.50
```

### Example 3: No Discount
```
1 item totaling L 200.00
---
Subtotal:  L 200.00
ISV (15%): L  30.00
---
TOTAL:     L 230.00
```

## Troubleshooting

### PDF not generating?
- Ensure all company profile fields are filled (Profile → Datos de facturación)
- Check that CAI and expiration date are set
- Try on a physical device (not simulator)

### Discount not calculating?
- Make sure you've entered a number
- Check that discount doesn't exceed subtotal
- Try switching between percentage and fixed amount

### Can't navigate to invoice detail?
- Ensure you've run the database migration
- Check that invoice has an `id` field
- Try restarting the app

## Tips

💡 **Tip 1:** Use percentage discounts for promotional offers (e.g., "10% off")

💡 **Tip 2:** Use fixed amount discounts for specific reductions (e.g., "L 50 off")

💡 **Tip 3:** The discount preview updates as you type!

💡 **Tip 4:** On iOS, you can AirDrop invoices directly from the print dialog

💡 **Tip 5:** PDF filename includes invoice number for easy organization

## Need Help?

Check these files for more info:
- `INVOICE_ENHANCEMENTS.md` - Full technical documentation
- `INVOICE_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `add_discount_to_invoices.sql` - Database migration script

## That's It! 🎉

Your invoice system now has:
- ✅ Discount support (percentage or fixed)
- ✅ Professional detail view
- ✅ Honduras-compliant PDF generation
- ✅ Platform-optimized sharing

Start creating invoices with discounts and share professional PDFs with your clients!


