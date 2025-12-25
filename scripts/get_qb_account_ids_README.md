# Get QuickBooks Account IDs Script

## Descripción

Este script conecta a QuickBooks Sandbox (o Production) y obtiene todos los Account IDs de tipo "Expense" y "Cost of Goods Sold" para mapearlos a las categorías de MANU.

## Requisitos

- **Deno** (recomendado) o **Node.js con ts-node**
- Credenciales de QuickBooks:
  - `ACCESS_TOKEN`: Token de acceso OAuth
  - `REALM_ID`: ID de la compañía en QuickBooks

## Cómo obtener las credenciales

### Opción 1: Desde Supabase (después de conectar QB)

1. Ve a Supabase Dashboard → Table Editor
2. Abre la tabla `quickbooks_connections`
3. Copia:
   - `qb_access_token` → `ACCESS_TOKEN`
   - `qb_realm_id` → `REALM_ID`

### Opción 2: Desde QuickBooks Developer Dashboard

1. Ve a https://developer.intuit.com
2. Abre tu app
3. Ve a "Keys & OAuth"
4. Usa el Access Token y Realm ID de tu conexión de prueba

## Uso

### Con Deno (recomendado)

```bash
# 1. Edita el script y actualiza ACCESS_TOKEN y REALM_ID
nano scripts/get_qb_account_ids.ts

# 2. Ejecuta el script
deno run --allow-net --allow-write scripts/get_qb_account_ids.ts
```

### Con Node.js + ts-node

```bash
# 1. Instala ts-node si no lo tienes
npm install -g ts-node

# 2. Edita el script y actualiza ACCESS_TOKEN y REALM_ID
nano scripts/get_qb_account_ids.ts

# 3. Ejecuta el script
ts-node scripts/get_qb_account_ids.ts
```

## Output

El script genera:

1. **Consola**: Lista de todas las cuentas encontradas
2. **Sugerencias**: Mapeos sugeridos para cada categoría MANU
3. **SQL**: Comandos SQL listos para copiar y pegar en Supabase
4. **Archivo JSON**: `qb_accounts.json` con todos los accounts en formato JSON

## Ejemplo de Output

```
✅ Found 15 expense accounts:

ID              | Name                                    | Type
----------------------------------------------------------------------
123             | Office Expenses                        | Expense
456             | Cost of Goods Sold                     | Cost of Goods Sold
...

📋 Suggested Mappings for MANU Categories:
============================================================

MERCADERIA:
  ✓ Cost of Goods Sold                    → ID: 456

SERVICIOS:
  ✓ Office Expenses                       → ID: 123
  ✓ Contract Labor                        → ID: 789

...

💾 SQL to Update category_mapping:
UPDATE category_mapping
SET qb_account_id = '456'
WHERE manu_category = 'mercaderia';

✅ Accounts saved to qb_accounts.json
```

## Próximos Pasos

1. **Revisa las sugerencias** y ajusta según necesites
2. **Copia los comandos SQL** generados
3. **Ejecuta en Supabase SQL Editor** para actualizar `category_mapping`
4. **Verifica** que los IDs sean correctos antes de sincronizar gastos

## Troubleshooting

### Error: "HTTP 401: Unauthorized"
- El token expiró. Obtén uno nuevo desde Supabase o reconecta QuickBooks.

### Error: "HTTP 400: Bad Request"
- Verifica que `REALM_ID` sea correcto.
- Asegúrate de usar el endpoint correcto (sandbox vs production).

### No se encuentran accounts
- Verifica que tu compañía de QuickBooks tenga cuentas de tipo Expense.
- Prueba con una query más amplia en el script.

## Notas

- El script usa **Sandbox** por defecto. Para producción, cambia `QB_API_BASE`.
- Los tokens OAuth expiran. Si el script falla, obtén un token nuevo.
- El archivo `qb_accounts.json` se guarda en el directorio del script.

