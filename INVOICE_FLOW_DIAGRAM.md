# Invoice System Flow Diagram

## User Journey Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        INVOICE SYSTEM                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Facturas Tab   │
│                 │
│  ┌───────────┐  │
│  │ Invoice 1 │◄─┼─── Tap to view detail
│  ├───────────┤  │
│  │ Invoice 2 │  │
│  ├───────────┤  │
│  │ Invoice 3 │  │
│  └───────────┘  │
│                 │
│      [+]        │◄─── Tap to create new
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│  Create Invoice │  │  Invoice Detail  │
│                 │  │                  │
│  Client Info    │  │  Invoice #12345  │
│  ┌───────────┐  │  │  Jan 15, 2024    │
│  │ Name      │  │  │                  │
│  │ RTN       │  │  │  ┌────────────┐  │
│  │ Address   │  │  │  │ Client     │  │
│  └───────────┘  │  │  │ Info       │  │
│                 │  │  └────────────┘  │
│  Discount       │  │                  │
│  ┌───────────┐  │  │  Line Items:     │
│  │ ○ %  ○ L  │  │  │  • Item 1        │
│  │ [_____]   │  │  │  • Item 2        │
│  └───────────┘  │  │                  │
│                 │  │  Totals:         │
│  Line Items     │  │  Subtotal: L100  │
│  ┌───────────┐  │  │  Discount: -L10  │
│  │ Item 1    │  │  │  ISV: L13.50     │
│  │ Qty Price │  │  │  Total: L103.50  │
│  ├───────────┤  │  │                  │
│  │ Item 2    │  │  │  [Imprimir]      │
│  └───────────┘  │  └────────┬─────────┘
│                 │           │
│  [+ Add Item]   │           │
│                 │           ▼
│  Totals:        │  ┌──────────────────┐
│  Subtotal: L100 │  │  PDF Generation  │
│  Discount: -L10 │  │                  │
│  Subtotal: L90  │  │  ┌────────────┐  │
│  ISV: L13.50    │  │  │ Generating │  │
│  Total: L103.50 │  │  │    PDF     │  │
│                 │  │  │   [...]    │  │
│  [Guardar]      │  │  └────────────┘  │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         │                    ▼
         │           ┌──────────────────┐
         │           │   Share/Print    │
         │           │                  │
         │           │  iOS:            │
         │           │  • Print Dialog  │
         │           │  • AirDrop       │
         │           │                  │
         │           │  Android/Web:    │
         │           │  • Share Sheet   │
         │           │  • Save to Files │
         │           │  • WhatsApp      │
         │           │  • Email         │
         │           └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Supabase Database             │
│                                         │
│  invoices                               │
│  ├─ id                                  │
│  ├─ invoice_number                      │
│  ├─ client_name                         │
│  ├─ subtotal                            │
│  ├─ discount_percentage ◄─── NEW!      │
│  ├─ discount_amount     ◄─── NEW!      │
│  ├─ tax_amount                          │
│  └─ total                               │
│                                         │
│  invoice_items                          │
│  ├─ id                                  │
│  ├─ invoice_id                          │
│  ├─ quantity                            │
│  ├─ description                         │
│  ├─ unit_price                          │
│  └─ total                               │
└─────────────────────────────────────────┘
```

## Discount Calculation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    DISCOUNT CALCULATION                       │
└──────────────────────────────────────────────────────────────┘

Step 1: Calculate Line Items
┌─────────────────────────────────────────┐
│  Item 1: 2 × L 100 = L 200             │
│  Item 2: 3 × L  50 = L 150             │
│  Item 3: 1 × L 150 = L 150             │
│                                         │
│  SUBTOTAL = L 500                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
Step 2: Apply Discount
┌─────────────────────────────────────────┐
│  User selects: 10% discount             │
│                                         │
│  Discount = L 500 × 10% = L 50         │
│                                         │
│  OR                                     │
│                                         │
│  User selects: L 50 fixed discount      │
│                                         │
│  Discount = L 50                        │
└────────────────┬────────────────────────┘
                 │
                 ▼
Step 3: Calculate Taxable Amount
┌─────────────────────────────────────────┐
│  Taxable Amount = Subtotal - Discount   │
│                 = L 500 - L 50          │
│                 = L 450                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
Step 4: Calculate Tax (ISV 15%)
┌─────────────────────────────────────────┐
│  Tax = Taxable Amount × 15%             │
│      = L 450 × 0.15                     │
│      = L 67.50                          │
└────────────────┬────────────────────────┘
                 │
                 ▼
Step 5: Calculate Total
┌─────────────────────────────────────────┐
│  Total = Taxable Amount + Tax           │
│        = L 450 + L 67.50                │
│        = L 517.50                       │
└─────────────────────────────────────────┘

SUMMARY:
┌─────────────────────────────────────────┐
│  Subtotal:              L 500.00        │
│  Descuento (10%):      -L  50.00        │
│  Subtotal con descuento: L 450.00       │
│  ISV (15%):             L  67.50        │
│  ─────────────────────────────────      │
│  TOTAL:                 L 517.50        │
└─────────────────────────────────────────┘
```

## PDF Generation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    PDF GENERATION FLOW                        │
└──────────────────────────────────────────────────────────────┘

User taps "Imprimir"
         │
         ▼
┌─────────────────────────────────────────┐
│  1. Fetch Invoice Data                  │
│     • Invoice details                   │
│     • Line items                        │
│     • User profile (company info)       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  2. Generate HTML Template              │
│     • Company header                    │
│     • Invoice details                   │
│     • Client info                       │
│     • Line items table                  │
│     • Totals with discount              │
│     • Footer                            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  3. Convert HTML to PDF                 │
│     Using expo-print                    │
│     • Renders HTML                      │
│     • Applies CSS styles                │
│     • Generates PDF file                │
│     • Returns file URI                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  4. Platform-Specific Sharing           │
│                                         │
│  iOS:                                   │
│  • Open native print dialog             │
│  • User can print or save               │
│                                         │
│  Android/Web:                           │
│  • Open share sheet                     │
│  • User selects app to share            │
└─────────────────────────────────────────┘
```

## State Management

```
┌──────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                         │
└──────────────────────────────────────────────────────────────┘

Zustand Store (Global)
┌─────────────────────────────────────────┐
│  currentUser:                           │
│  ├─ nombreNegocio                       │
│  ├─ empresaRtn                          │
│  ├─ empresaCai                          │
│  ├─ empresaDireccion                    │
│  ├─ empresaTelefono                     │
│  ├─ empresaEmail                        │
│  ├─ tasaImpuesto                        │
│  ├─ facturaRangoInicio                  │
│  ├─ facturaRangoFin                     │
│  ├─ facturaProximoNumero                │
│  └─ caiFechaVencimiento                 │
└─────────────────────────────────────────┘

Local State (New Invoice Screen)
┌─────────────────────────────────────────┐
│  invoiceNumber: string                  │
│  clientName: string                     │
│  clientRtn: string                      │
│  clientAddress: string                  │
│  lineItems: LineItem[]                  │
│  discountType: 'percentage' | 'amount'  │◄─── NEW!
│  discountPercentage: string             │◄─── NEW!
│  discountAmount: string                 │◄─── NEW!
│  isSaving: boolean                      │
└─────────────────────────────────────────┘

Local State (Invoice Detail Screen)
┌─────────────────────────────────────────┐
│  invoice: Invoice | null                │
│  items: InvoiceItem[]                   │
│  isLoading: boolean                     │
│  isGeneratingPDF: boolean               │◄─── NEW!
└─────────────────────────────────────────┘
```

## Component Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                    COMPONENT HIERARCHY                        │
└──────────────────────────────────────────────────────────────┘

App
└─ TabNavigator
   └─ FacturasTab (invoices.tsx)
      ├─ InvoiceList
      │  └─ InvoiceItem (tappable) ───┐
      │                                │
      └─ FAB Button (+) ───┐          │
                           │          │
                           ▼          ▼
                  ┌─────────────────────────────┐
                  │  NewInvoiceScreen           │
                  │  (invoices/new.tsx)         │
                  │                             │
                  │  ├─ ClientInfoSection       │
                  │  ├─ DiscountSection ◄─ NEW! │
                  │  │  ├─ TypeToggle           │
                  │  │  ├─ DiscountInput        │
                  │  │  └─ DiscountPreview      │
                  │  ├─ LineItemsSection        │
                  │  │  └─ LineItem (×N)        │
                  │  ├─ TotalsSection           │
                  │  │  ├─ Subtotal             │
                  │  │  ├─ Discount ◄─ NEW!     │
                  │  │  ├─ TaxableAmount ◄─NEW! │
                  │  │  ├─ Tax                  │
                  │  │  └─ Total                │
                  │  └─ SaveButton              │
                  └─────────────────────────────┘
                           │
                           │ (saves to Supabase)
                           │
                           ▼
                  ┌─────────────────────────────┐
                  │  InvoiceDetailScreen        │
                  │  ([id].tsx) ◄─ NEW!         │
                  │                             │
                  │  ├─ Header                  │
                  │  │  ├─ BackButton           │
                  │  │  └─ PrintButton ◄─ NEW!  │
                  │  ├─ InvoiceInfo             │
                  │  ├─ ClientCard              │
                  │  ├─ LineItemsList           │
                  │  └─ TotalsSection           │
                  │     ├─ Subtotal             │
                  │     ├─ Discount ◄─ NEW!     │
                  │     ├─ TaxableAmount ◄─NEW! │
                  │     ├─ Tax                  │
                  │     └─ Total                │
                  └──────────┬──────────────────┘
                             │
                             │ (tap Print)
                             │
                             ▼
                  ┌─────────────────────────────┐
                  │  PDF Generator ◄─ NEW!      │
                  │                             │
                  │  ├─ generateInvoiceHTML()   │
                  │  ├─ expo-print              │
                  │  └─ expo-sharing            │
                  └─────────────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                         DATA FLOW                             │
└──────────────────────────────────────────────────────────────┘

CREATE INVOICE:
User Input → Local State → Validation → Supabase → Success
                                            ↓
                                      Update Store
                                            ↓
                                    Navigate to List

VIEW INVOICE:
Tap Invoice → Get ID → Fetch from Supabase → Display
                           ↓
                    (invoice + items)

GENERATE PDF:
Tap Print → Fetch Data → Generate HTML → Create PDF → Share
                ↓            ↓             ↓           ↓
            Invoice     Template       expo-print  Platform
            Items       + Styles                   Specific
            User Info
```

## File Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   └── invoices.tsx .................. Invoice list
│   └── invoices/
│       ├── new.tsx ....................... Create invoice (UPDATED)
│       └── [id].tsx ...................... Invoice detail (NEW!)
├── lib/
│   ├── invoice-types.ts .................. Types (UPDATED)
│   └── invoice-helpers.ts ................ Helpers (UPDATED)
└── ...

Database:
├── add_discount_to_invoices.sql .......... Migration (NEW!)
└── ...

Documentation:
├── INVOICE_ENHANCEMENTS.md ............... Full docs (NEW!)
├── INVOICE_IMPLEMENTATION_SUMMARY.md ..... Summary (NEW!)
├── QUICK_START_INVOICE_ENHANCEMENTS.md ... Quick start (NEW!)
├── TESTING_CHECKLIST.md .................. Testing (NEW!)
└── INVOICE_FLOW_DIAGRAM.md ............... This file (NEW!)
```

## Key Interactions

```
┌──────────────────────────────────────────────────────────────┐
│                     KEY INTERACTIONS                          │
└──────────────────────────────────────────────────────────────┘

1. DISCOUNT TYPE TOGGLE
   User taps "Porcentaje" or "Monto fijo"
   → Clears other discount field
   → Shows appropriate input
   → Recalculates totals

2. DISCOUNT INPUT
   User types discount value
   → Real-time validation
   → Updates preview
   → Recalculates all totals
   → Shows in red if applied

3. INVOICE TAP
   User taps invoice in list
   → Haptic feedback
   → Navigate to detail screen
   → Load invoice data
   → Display all info

4. PRINT BUTTON
   User taps "Imprimir"
   → Show loading spinner
   → Generate HTML
   → Create PDF
   → Platform-specific share
   → Success feedback

5. BACK NAVIGATION
   User taps back button
   → Haptic feedback
   → Navigate to previous screen
   → Preserve list state
```

This diagram provides a comprehensive visual overview of the entire invoice system!

