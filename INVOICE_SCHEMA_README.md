# Invoice Module - Database Schema

## Overview

This document describes the database schema for the MANU invoice module. The schema follows the same date architecture as the existing `gastos` (expenses) table.

## Date Architecture

**Important**: The invoice module uses the same date pattern as expenses:

- **`fecha`** (date): Local business date in YYYY-MM-DD format
  - Used for filtering invoices by period (Today/Week/Month)
  - Represents the invoice date as seen by the business
  - NOT affected by timezone conversions

- **`created_at`** (timestamptz): UTC timestamp
  - When the invoice was created in the system
  - Used for audit trails and ordering
  - Automatically set by database

## Tables

### 1. `facturas` (Invoices)

Main invoice table storing header information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key (auto-generated) |
| `usuario_id` | UUID | NO | Foreign key to `usuarios` table |
| `fecha` | DATE | NO | Local business date (YYYY-MM-DD) |
| `created_at` | TIMESTAMPTZ | NO | UTC timestamp (auto-set) |
| `cliente_nombre` | TEXT | NO | Client name |
| `cliente_rtn` | TEXT | YES | Client RTN (Tax ID) |
| `cliente_telefono` | TEXT | YES | Client phone |
| `cliente_email` | TEXT | YES | Client email |
| `numero` | TEXT | NO | Invoice number/correlative |
| `cai` | TEXT | NO | CAI code from empresa profile |
| `subtotal` | NUMERIC(12,2) | NO | Subtotal before discount/tax |
| `descuento` | NUMERIC(12,2) | NO | Discount amount (default: 0) |
| `impuesto` | NUMERIC(12,2) | NO | Tax amount (default: 0) |
| `total` | NUMERIC(12,2) | NO | Final total |
| `notas` | TEXT | YES | Optional notes |
| `estado` | TEXT | NO | Status: 'emitida', 'pagada', 'anulada' |

**Indexes:**
- `idx_facturas_usuario_id` - Fast lookup by user
- `idx_facturas_fecha` - Fast date range queries
- `idx_facturas_usuario_fecha` - Composite index for user + date queries

**Constraints:**
- All monetary values must be >= 0
- `estado` must be one of: 'emitida', 'pagada', 'anulada'

### 2. `factura_items` (Invoice Line Items)

Invoice line items table storing individual products/services.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key (auto-generated) |
| `factura_id` | UUID | NO | Foreign key to `facturas` |
| `descripcion` | TEXT | NO | Product/service description |
| `cantidad` | NUMERIC(12,3) | NO | Quantity (supports decimals) |
| `precio_unitario` | NUMERIC(12,2) | NO | Unit price |
| `subtotal` | NUMERIC(12,2) | NO | Line total (cantidad × precio_unitario) |
| `orden` | INTEGER | NO | Display order (default: 0) |
| `created_at` | TIMESTAMPTZ | NO | UTC timestamp (auto-set) |

**Indexes:**
- `idx_factura_items_factura_id` - Fast lookup by invoice

**Constraints:**
- `cantidad` must be > 0
- All monetary values must be >= 0
- Cascading delete: deleting an invoice deletes all its items

## Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

### Facturas Policies:
- ✅ Users can **view** only their own invoices
- ✅ Users can **insert** invoices for themselves
- ✅ Users can **update** only their own invoices
- ✅ Users can **delete** only their own invoices

### Factura Items Policies:
- ✅ Users can **view** items only from their own invoices
- ✅ Users can **insert** items only to their own invoices
- ✅ Users can **update** items only from their own invoices
- ✅ Users can **delete** items only from their own invoices

## Installation

### Option 1: Full Migration (with automatic triggers)

Run `supabase_invoice_migration.sql` in the Supabase SQL Editor.

**Features:**
- Automatic calculation of item subtotals
- Automatic validation of invoice totals
- Helper functions and triggers

### Option 2: Simple Migration (manual calculations)

Run `supabase_invoice_migration_simple.sql` in the Supabase SQL Editor.

**Features:**
- Basic tables and indexes
- RLS policies
- No automatic triggers (you handle calculations in app code)

**Recommended**: Use Option 2 (simple) for better control and easier debugging.

## Usage Examples

### Creating an Invoice

```sql
-- 1. Insert invoice header
INSERT INTO facturas (
    usuario_id,
    fecha,
    cliente_nombre,
    numero,
    cai,
    subtotal,
    descuento,
    impuesto,
    total
) VALUES (
    auth.uid(),                    -- Current user
    '2024-12-22',                  -- Local business date
    'Cliente Ejemplo',
    'FAC-001',
    'CAI-123456',
    1000.00,                       -- Subtotal
    50.00,                         -- Discount
    142.50,                        -- Tax (15% of 950)
    1092.50                        -- Total
) RETURNING id;

-- 2. Insert line items (using the returned invoice id)
INSERT INTO factura_items (
    factura_id,
    descripcion,
    cantidad,
    precio_unitario,
    subtotal,
    orden
) VALUES
    ('invoice-uuid-here', 'Producto A', 2, 300.00, 600.00, 1),
    ('invoice-uuid-here', 'Producto B', 1, 400.00, 400.00, 2);
```

### Querying Invoices

```sql
-- Get all invoices for current user (today)
SELECT * FROM facturas
WHERE usuario_id = auth.uid()
AND fecha = CURRENT_DATE
ORDER BY created_at DESC;

-- Get invoices with items for a date range
SELECT 
    f.*,
    json_agg(
        json_build_object(
            'id', fi.id,
            'descripcion', fi.descripcion,
            'cantidad', fi.cantidad,
            'precio_unitario', fi.precio_unitario,
            'subtotal', fi.subtotal
        ) ORDER BY fi.orden
    ) as items
FROM facturas f
LEFT JOIN factura_items fi ON fi.factura_id = f.id
WHERE f.usuario_id = auth.uid()
AND f.fecha >= '2024-12-01'
AND f.fecha <= '2024-12-31'
GROUP BY f.id
ORDER BY f.fecha DESC, f.created_at DESC;
```

### Updating Invoice Status

```sql
UPDATE facturas
SET estado = 'pagada'
WHERE id = 'invoice-uuid-here'
AND usuario_id = auth.uid();
```

### Deleting an Invoice

```sql
-- This will also delete all associated items (CASCADE)
DELETE FROM facturas
WHERE id = 'invoice-uuid-here'
AND usuario_id = auth.uid();
```

## TypeScript Types

Here are the TypeScript types you'll need in your app:

```typescript
export type InvoiceStatus = 'emitida' | 'pagada' | 'anulada';

export interface Invoice {
  id: string;
  usuario_id: string;
  fecha: string;                    // YYYY-MM-DD format
  created_at: string;               // ISO timestamp
  cliente_nombre: string;
  cliente_rtn?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  numero: string;
  cai: string;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  notas?: string;
  estado: InvoiceStatus;
}

export interface InvoiceItem {
  id: string;
  factura_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  orden: number;
  created_at: string;               // ISO timestamp
}

// For creating new invoices (omit auto-generated fields)
export type CreateInvoice = Omit<Invoice, 'id' | 'created_at'>;
export type CreateInvoiceItem = Omit<InvoiceItem, 'id' | 'created_at'>;
```

## Calculation Logic

### Item Subtotal
```
item.subtotal = item.cantidad × item.precio_unitario
```

### Invoice Totals
```
invoice.subtotal = SUM(all item subtotals)
invoice.total = invoice.subtotal - invoice.descuento + invoice.impuesto
```

**Note**: If using the full migration with triggers, item subtotals are calculated automatically. Otherwise, calculate them in your app code before inserting.

## Migration Checklist

- [ ] Run migration SQL in Supabase SQL Editor
- [ ] Verify tables exist in Supabase Dashboard → Database → Tables
- [ ] Verify RLS policies in Supabase Dashboard → Authentication → Policies
- [ ] Test insert with authenticated user
- [ ] Test query with authenticated user
- [ ] Test RLS (try accessing another user's invoice - should fail)
- [ ] Add TypeScript types to your app
- [ ] Create Zustand store actions for invoices
- [ ] Build invoice UI components

## Notes

- The `fecha` field uses the same pattern as `gastos.fecha` - it's a local business date
- Filters for Today/Week/Month should use `fecha`, not `created_at`
- The `numero` field should be unique per user (enforce in app logic or add unique constraint)
- Consider adding a `rango_inicial` and `rango_final` to track invoice number ranges per CAI
- The `estado` field allows tracking invoice lifecycle (issued → paid → cancelled)

## Support

For questions or issues with the schema, refer to:
- Supabase documentation: https://supabase.com/docs
- PostgreSQL numeric types: https://www.postgresql.org/docs/current/datatype-numeric.html
- RLS policies: https://supabase.com/docs/guides/auth/row-level-security

