# Invoice Range Fields Update

## Overview

Added invoice range tracking fields to the company profile section, allowing users to configure their invoice numbering system according to Honduran SAR requirements.

## New Database Columns

Added to `usuarios` table via updated `add_company_fields_to_usuarios.sql`:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `factura_rango_inicio` | TEXT | YES | Invoice range start (e.g., "000-001-01-00000001") |
| `factura_rango_fin` | TEXT | YES | Invoice range end (e.g., "000-001-01-00005000") |
| `factura_proximo_numero` | TEXT | YES | Next invoice number (auto-calculated) |
| `cai_fecha_vencimiento` | DATE | YES | CAI expiration date (YYYY-MM-DD) |

## Code Changes

### 1. Updated `CurrentUser` Interface (`src/lib/store.ts`)

```typescript
export interface CurrentUser {
  // ... existing fields
  facturaRangoInicio?: string;
  facturaRangoFin?: string;
  facturaProximoNumero?: string;
  caiFechaVencimiento?: string;  // YYYY-MM-DD format
}
```

### 2. Updated Profile Screen (`src/app/(tabs)/profile.tsx`)

#### New State Variables:
- `invoiceRangeStart`: Invoice range start number
- `invoiceRangeEnd`: Invoice range end number
- `caiExpirationDate`: CAI expiration date

#### Updated Functions:

**`handleEditCompanyInfo()`**:
- Loads invoice range fields from `currentUser`
- Pre-fills form with existing values

**`handleSaveCompanyInfo()`**:
- Saves all invoice range fields to Supabase
- Auto-initializes `factura_proximo_numero` with `factura_rango_inicio` if not set
- Updates local state with new values

## UI Changes

### New Section in Company Info Modal:

```
Datos de facturación Modal
├── RTN de la empresa
├── CAI (Código de Autorización)
├── Dirección
├── Teléfono
├── Email de facturación
├── Tasa de impuesto (%)
│
├── [DIVIDER] ─────────────────
├── Rango de facturas (Section Title)
│
├── Rango de facturas - Inicio
│   └── Input: "000-001-01-00000001"
│
├── Rango de facturas - Fin
│   └── Input: "000-001-01-00005000"
│
├── Próximo número de factura
│   └── Read-only display (gray background)
│
├── Fecha de vencimiento del CAI
│   └── Input: "YYYY-MM-DD"
│
└── [Guardar Button]
```

## Field Details

### 1. Rango de facturas - Inicio
- **Type**: Text input
- **Max length**: 50 characters
- **Placeholder**: "000-001-01-00000001"
- **Format**: Honduran invoice format (establishment-point-type-correlative)
- **Example**: `000-001-01-00000001`

### 2. Rango de facturas - Fin
- **Type**: Text input
- **Max length**: 50 characters
- **Placeholder**: "000-001-01-00005000"
- **Format**: Same as start
- **Example**: `000-001-01-00005000`

### 3. Próximo número de factura
- **Type**: Read-only display
- **Background**: Gray (#F5F5F5)
- **Value**: Shows current next invoice number or "Sin configurar"
- **Auto-calculated**: 
  - Initialized with `factura_rango_inicio` on first save
  - Updated automatically when invoices are created
  - Displayed in real-time from `currentUser.facturaProximoNumero`

### 4. Fecha de vencimiento del CAI
- **Type**: Text input (date)
- **Max length**: 10 characters
- **Placeholder**: "YYYY-MM-DD"
- **Format**: ISO date format
- **Example**: `2025-12-31`
- **Note**: Stored as DATE in database

## Auto-Calculation Logic

### Next Invoice Number Initialization:

```typescript
// On first save, if range start is set but next number is not:
if (invoiceRangeStart.trim() && !currentUser?.facturaProximoNumero) {
  facturaProximoNumero = invoiceRangeStart.trim();
}
```

### Future Invoice Creation:

When creating an invoice, the system should:
1. Use `currentUser.facturaProximoNumero` as the invoice number
2. Increment the correlative part
3. Update `factura_proximo_numero` in the database
4. Check if it exceeds `factura_rango_fin`

Example increment logic (to be implemented in invoice creation):
```typescript
// Example: "000-001-01-00000001" → "000-001-01-00000002"
function incrementInvoiceNumber(current: string): string {
  const parts = current.split('-');
  const correlative = parseInt(parts[3]);
  const newCorrelative = (correlative + 1).toString().padStart(8, '0');
  return `${parts[0]}-${parts[1]}-${parts[2]}-${newCorrelative}`;
}
```

## Honduran Invoice Format

Standard format: `XXX-XXX-XX-XXXXXXXX`

- **XXX**: Establishment code (3 digits)
- **XXX**: Point of emission (3 digits)
- **XX**: Document type (2 digits)
- **XXXXXXXX**: Correlative number (8 digits)

Example: `000-001-01-00000001`

## Validation (Future Enhancement)

Consider adding:
- Format validation for invoice numbers
- Range validation (start < end)
- CAI expiration date warning (if approaching)
- Check if next number is within range
- Prevent duplicate invoice numbers

## Usage Flow

### Setup:
1. User opens Profile → Datos de facturación
2. Fills in company info (RTN, CAI, etc.)
3. Sets invoice range:
   - Start: `000-001-01-00000001`
   - End: `000-001-01-00005000`
4. Sets CAI expiration: `2025-12-31`
5. Saves → Next invoice number auto-initialized to start

### Invoice Creation:
1. System reads `currentUser.facturaProximoNumero`
2. Creates invoice with that number
3. Increments correlative
4. Updates `factura_proximo_numero` in database
5. Next invoice uses the new number

## Migration Steps

1. **Run updated SQL migration**:
   ```bash
   # In Supabase SQL Editor
   # Run: add_company_fields_to_usuarios.sql
   ```

2. **Verify columns exist**:
   - Check Supabase Dashboard → usuarios table
   - Confirm 4 new columns added

3. **Test the UI**:
   - Open app → Profile → Información de empresa
   - Scroll to "Rango de facturas" section
   - Fill in invoice range fields
   - Verify "Próximo número" shows correctly
   - Save and reload to confirm persistence

## Notes

- All invoice range fields are optional
- Next invoice number is read-only in UI
- Next invoice number auto-initializes on first save
- CAI expiration date uses YYYY-MM-DD format
- Invoice format follows Honduran SAR standards
- Future: Add validation and expiration warnings

## Design Consistency

- ✅ Minimalist design maintained
- ✅ Same input styling as other fields
- ✅ Gray background for read-only field
- ✅ Helper text below each field
- ✅ Section divider for visual grouping
- ✅ Consistent spacing and borders

