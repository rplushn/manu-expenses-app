# Company Profile Fields Implementation

## Overview

This implementation adds company/business profile fields to the `usuarios` table and creates a UI section in the Profile screen to edit them. These fields are required for invoice generation.

## Database Changes

### SQL Migration

Run `add_company_fields_to_usuarios.sql` in Supabase SQL Editor:

```sql
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS empresa_rtn TEXT,
ADD COLUMN IF NOT EXISTS empresa_cai TEXT,
ADD COLUMN IF NOT EXISTS empresa_direccion TEXT,
ADD COLUMN IF NOT EXISTS empresa_telefono TEXT,
ADD COLUMN IF NOT EXISTS empresa_email TEXT,
ADD COLUMN IF NOT EXISTS tasa_impuesto NUMERIC(5, 4) DEFAULT 0.15;
```

### New Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `empresa_rtn` | TEXT | YES | NULL | Company RTN (Tax ID) |
| `empresa_cai` | TEXT | YES | NULL | CAI code for invoices |
| `empresa_direccion` | TEXT | YES | NULL | Company address |
| `empresa_telefono` | TEXT | YES | NULL | Company phone |
| `empresa_email` | TEXT | YES | NULL | Company email for invoices |
| `tasa_impuesto` | NUMERIC(5,4) | YES | 0.15 | Tax rate (0.15 = 15%) |

## Code Changes

### 1. Updated `CurrentUser` Interface (`src/lib/store.ts`)

Added optional company fields to the user state:

```typescript
export interface CurrentUser {
  id: string;
  email: string;
  nombreNegocio: string;
  plan: string;
  empresaRtn?: string;
  empresaCai?: string;
  empresaDireccion?: string;
  empresaTelefono?: string;
  empresaEmail?: string;
  tasaImpuesto?: number;
}
```

### 2. Updated Profile Screen (`src/app/(tabs)/profile.tsx`)

#### Added State Variables:
- `showCompanyInfoModal`: Controls modal visibility
- `companyRtn`, `companyCai`, `companyAddress`, `companyPhone`, `companyEmail`, `taxRate`: Form fields
- `isSavingCompanyInfo`: Loading state

#### Added Functions:
- `handleEditCompanyInfo()`: Opens modal and loads current values
- `handleSaveCompanyInfo()`: Saves data to Supabase and updates local state

#### UI Changes:
1. **New Section**: "Datos de facturación" between profile info and help section
2. **Menu Item**: Shows "Configurado" or "Sin configurar" based on whether RTN is set
3. **Modal**: Full-screen form with 6 input fields

## UI Design

The implementation follows the existing minimalist design:
- ✅ White background
- ✅ Black text
- ✅ No shadows
- ✅ Simple borders (#E5E5E5)
- ✅ Consistent with existing modals
- ✅ Same input styling as business name modal

## Form Fields

### 1. RTN de la empresa
- **Type**: Numeric input
- **Max length**: 13 characters
- **Placeholder**: "0801199012345"
- **Description**: Company tax ID

### 2. CAI (Código de Autorización)
- **Type**: Text input
- **Max length**: 50 characters
- **Placeholder**: "CAI-123456-789012-345678"
- **Description**: Authorization code for invoices

### 3. Dirección
- **Type**: Multiline text
- **Min height**: 60px
- **Placeholder**: "Calle Principal, Col. Centro"
- **Description**: Company address

### 4. Teléfono
- **Type**: Phone input
- **Max length**: 20 characters
- **Placeholder**: "+504 1234-5678"
- **Description**: Company phone

### 5. Email de facturación
- **Type**: Email input
- **Max length**: 100 characters
- **Placeholder**: "facturacion@empresa.com"
- **Description**: Email for invoices

### 6. Tasa de impuesto (%)
- **Type**: Decimal input
- **Max length**: 5 characters
- **Default**: "15" (15%)
- **Placeholder**: "15"
- **Description**: Tax rate percentage
- **Note**: Stored as decimal (15% = 0.15)

## Data Flow

### Loading Data:
1. User taps "Información de empresa" menu item
2. `handleEditCompanyInfo()` is called
3. Current values loaded from `currentUser` state
4. Tax rate converted from decimal to percentage (0.15 → "15")
5. Modal opens with pre-filled values

### Saving Data:
1. User fills form and taps "Guardar"
2. `handleSaveCompanyInfo()` is called
3. Tax rate converted from percentage to decimal ("15" → 0.15)
4. Data sent to Supabase via `supabase.from('usuarios').update()`
5. Local state updated via `setCurrentUser()`
6. Success message shown
7. Modal closes

## Validation

- All fields are optional (nullable in database)
- Tax rate defaults to 15% if not provided
- Empty strings are stored as NULL in database
- Input lengths are limited via `maxLength` prop

## Usage in Invoice Generation

These fields will be used when generating invoices:

```typescript
// Example: Creating an invoice
const invoice = {
  // ... other fields
  cai: currentUser.empresaCai,
  // Invoice header will include:
  // - Company name (currentUser.nombreNegocio)
  // - RTN (currentUser.empresaRtn)
  // - Address (currentUser.empresaDireccion)
  // - Phone (currentUser.empresaTelefono)
  // - Email (currentUser.empresaEmail)
  // Tax calculation:
  impuesto: subtotal * (currentUser.tasaImpuesto || 0.15)
};
```

## Migration Steps

1. **Run SQL migration**:
   ```bash
   # In Supabase SQL Editor
   # Paste and run: add_company_fields_to_usuarios.sql
   ```

2. **Verify columns**:
   - Go to Supabase Dashboard → Database → Tables → usuarios
   - Check that new columns exist

3. **Test the UI**:
   - Open app → Profile tab
   - Tap "Información de empresa"
   - Fill in company details
   - Tap "Guardar"
   - Verify data is saved in Supabase

4. **Verify data persistence**:
   - Close and reopen the modal
   - Check that values are pre-filled
   - Log out and log back in
   - Check that values persist

## Notes

- The tax rate is stored as a decimal (0.15) but displayed as a percentage (15%) in the UI
- All company fields are optional - users can leave them empty
- The "Configurado" status is based on whether RTN is set (primary identifier)
- No changes were made to existing auth logic or profile fields
- Uses the same Supabase client pattern as the rest of the app

## Future Enhancements

Consider adding:
- Validation for RTN format (13 digits)
- Validation for CAI format
- Email validation
- Phone number formatting
- Invoice number range tracking (rango_inicial, rango_final)
- CAI expiration date


