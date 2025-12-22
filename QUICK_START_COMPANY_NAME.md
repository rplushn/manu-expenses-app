# 🚀 Quick Start: Company Name & Complete Invoice Header

## Step 1: Run Database Migration

Open Supabase SQL Editor and run:

```sql
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS empresa_nombre TEXT;
```

✅ Done! Column added.

## Step 2: Add Company Information

1. Open app → Go to **Profile** tab
2. Tap **Información de empresa**
3. **NEW!** See "Nombre de la empresa" as first field
4. Enter your legal company name:
   ```
   Example: RPLUS INVERSIONES S DE RL
   ```
5. Fill in other fields (RTN, CAI, etc.)
6. Tap **Guardar**

## Step 3: View Complete Invoice Header

1. Go to **Facturas** tab
2. Tap any invoice
3. **NEW!** See complete company header:

```
┌─────────────────────────────────────┐
│   RPLUS INVERSIONES S DE RL         │ ← Your legal name
│   RTN: 08011990123456               │
│   CAI: ABC-123-456-789              │
│   Fecha vencimiento CAI: 31/12/2025 │
│   Dirección: Tegucigalpa, Honduras  │
│   Tel: 2222-2222 | email@company.hn│
└─────────────────────────────────────┘
```

## What's New?

### ✨ New Field in Profile

**"Nombre de la empresa"** - First field in billing section

- Legal/official company name
- Used in invoices and PDFs
- Example: "RPLUS INVERSIONES S DE RL"
- Separate from business/brand name

### 📄 Complete Invoice Header

**Before:**
```
Mi Negocio
RTN: 08011990123456
Tegucigalpa
```

**After:**
```
RPLUS INVERSIONES S DE RL
RTN: 08011990123456
CAI: ABC-123-456-789
Fecha vencimiento CAI: 31/12/2025
Dirección: Tegucigalpa, Honduras
Tel: 2222-2222 | contacto@rplus.hn
```

## Honduras Compliance ✅

The invoice header now shows **all legally required information**:

1. ✅ Legal company name
2. ✅ RTN (Tax ID)
3. ✅ CAI (Authorization Code)
4. ✅ CAI expiration date
5. ✅ Physical address
6. ✅ Contact information

## Field Priority

The system uses this priority for company name display:

1. **empresa_nombre** (legal name) ← Preferred
2. **nombre_negocio** (brand name) ← Fallback
3. **"MI EMPRESA"** (default) ← Last resort

## Profile Screen Fields

**Datos de facturación section:**

1. **Nombre de la empresa*** (NEW!)
   - Legal company name
   - Example: "RPLUS INVERSIONES S DE RL"
   - 100 character limit

2. **RTN de la empresa**
   - Tax ID number
   - 13 digits

3. **CAI (Código de Autorización)**
   - Authorization code
   - 50 character limit

4. **Dirección de la empresa**
   - Full physical address

5. **Teléfono de la empresa**
   - Contact phone

6. **Email de la empresa**
   - Contact email

7. **Tasa de impuesto (ISV)**
   - Default: 15%

8. **Rango de facturas**
   - Start and end numbers

9. **Fecha de vencimiento del CAI**
   - CAI expiration date

## Invoice Display

### Screen View
- Company name: 20px, bold, centered
- All info: 13px, gray, centered
- CAI date: DD/MM/YYYY format
- Professional card layout

### PDF View
- Same information
- Print-ready format
- Honduras-compliant

## Examples

### Example 1: Full Information
```
Profile Input:
- Nombre de la empresa: "RPLUS INVERSIONES S DE RL"
- RTN: "08011990123456"
- CAI: "ABC-123-456-789"
- Fecha vencimiento CAI: "2025-12-31"
- Dirección: "Tegucigalpa, Honduras"
- Teléfono: "2222-2222"
- Email: "contacto@rplus.hn"

Invoice Header:
┌─────────────────────────────────────┐
│   RPLUS INVERSIONES S DE RL         │
│   RTN: 08011990123456               │
│   CAI: ABC-123-456-789              │
│   Fecha vencimiento CAI: 31/12/2025 │
│   Dirección: Tegucigalpa, Honduras  │
│   Tel: 2222-2222 | contacto@rplus.hn│
└─────────────────────────────────────┘
```

### Example 2: Minimal Information
```
Profile Input:
- Nombre de la empresa: "MI EMPRESA S DE RL"
- RTN: "08011990123456"

Invoice Header:
┌─────────────────────────┐
│   MI EMPRESA S DE RL    │
│   RTN: 08011990123456   │
└─────────────────────────┘
```

## Troubleshooting

### Company name not showing?
**Check:**
1. Database migration ran successfully
2. Field filled in Profile → Datos de facturación
3. Saved changes in Profile
4. Reloaded invoice detail screen

### Still shows "Mi Negocio"?
**Check:**
1. empresa_nombre field is empty
2. System falls back to nombre_negocio
3. Fill in empresa_nombre in Profile

### CAI not showing?
**Check:**
1. empresa_cai field filled in Profile
2. cai_fecha_vencimiento field filled in Profile
3. Both fields required for CAI section

## Files Changed

- ✅ `add_empresa_nombre_field.sql` - Database migration
- ✅ `src/lib/store.ts` - Type definition
- ✅ `src/app/(tabs)/profile.tsx` - Profile UI
- ✅ `src/app/invoices/[id].tsx` - Invoice display

## No App Restart Needed!

Just run the SQL migration and reload the Profile screen.

## Summary

**Before:**
- Basic company info
- Missing legal name field
- Incomplete invoice header
- Not fully compliant

**After:**
- ✅ Legal company name field
- ✅ Complete invoice header
- ✅ All required information
- ✅ Honduras-compliant
- ✅ Professional appearance

**Status:** Ready to use! 🎉

---

**Next:** Fill in your company information in Profile → Datos de facturación

