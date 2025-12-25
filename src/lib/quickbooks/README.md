# QuickBooks Account Fetcher

## Descripción

Script para obtener todos los Account IDs de QuickBooks y generar automáticamente los comandos SQL para mapear categorías MANU a cuentas de QuickBooks.

## Uso

### Opción 1: Node.js (Recomendado)

```bash
# Ejecutar directamente con Node.js
node src/lib/quickbooks/fetch-accounts.js
```

### Opción 2: TypeScript con ts-node

```bash
# Si tienes ts-node instalado
npx ts-node src/lib/quickbooks/fetch-accounts.ts
```

### Opción 3: Deno

```bash
# Ejecutar con Deno
deno run --allow-net src/lib/quickbooks/fetch-accounts.ts
```

## Output

El script genera:

1. **Tabla completa de accounts** agrupados por tipo (Asset, Expense, Income, etc.)
2. **Mapeos sugeridos** para cada categoría MANU
3. **SQL INSERT statements** listos para copiar y pegar en Supabase

## Ejemplo de Output

```
======================================================================
🚀 QuickBooks Account Fetcher
======================================================================

▶ 🔍 Finding best account matches for MANU categories...
  ✓ mercaderia → Cost of Goods Sold
  ✓ servicios → Office Expenses
  ...

======================================================================
💾 GENERATED SQL
======================================================================

INSERT INTO public.category_qb_mapping (
  usuario_id,
  manu_category,
  qb_account_id,
  qb_account_name
) VALUES (
  auth.uid(),
  'mercaderia',
  '123',
  'Cost of Goods Sold'
)
ON CONFLICT (usuario_id, manu_category)
DO UPDATE SET
  qb_account_id = EXCLUDED.qb_account_id,
  qb_account_name = EXCLUDED.qb_account_name,
  updated_at = NOW();
```

## Notas

- El script usa `fetch` nativo (no requiere axios)
- Las credenciales están hardcodeadas en el archivo
- El SQL generado usa `auth.uid()` - reemplázalo con un user_id específico si es necesario
- Los mapeos son automáticos basados en keywords - revisa y ajusta según necesites

