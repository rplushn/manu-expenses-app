# QuickBooks Builder Sync - Documentation

## Overview

Este documento describe el flujo completo de sincronización de gastos desde MANU hacia QuickBooks Builder.

## Arquitectura

```
┌─────────────┐
│   MANU App  │
│  (React Native)
└──────┬──────┘
       │
       │ 1. User creates expense
       │
┌──────▼─────────────────────────────────────┐
│         Supabase Database                  │
│  ┌─────────────────────────────────────┐  │
│  │ gastos table                        │  │
│  │ - sync_status = 'pending'            │  │
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │ quickbooks_connections table        │  │
│  │ - qb_access_token (encrypted)       │  │
│  │ - qb_realm_id                       │  │
│  └─────────────────────────────────────┘  │
└──────┬─────────────────────────────────────┘
       │
       │ 2. Trigger sync (manual or scheduled)
       │
┌──────▼─────────────────────────────────────┐
│    Edge Function                           │
│    sync-expense-to-qb                      │
│  ┌─────────────────────────────────────┐  │
│  │ 1. Get expense + user + QB conn    │  │
│  │ 2. Map category to QB account      │  │
│  │ 3. Build QB API payload             │  │
│  │ 4. POST to QB API                   │  │
│  │ 5. Handle errors & retries          │  │
│  │ 6. Update sync_status               │  │
│  └─────────────────────────────────────┘  │
└──────┬─────────────────────────────────────┘
       │
       │ 3. API Request
       │
┌──────▼─────────────────────────────────────┐
│    QuickBooks Builder API                  │
│    (Sandbox or Production)                  │
└────────────────────────────────────────────┘
```

## Componentes

### 1. Tabla `category_mapping`

Mapea categorías de MANU a cuentas de QuickBooks:

| MANU Category | QB Account Name | QB Account Type |
|--------------|-----------------|-----------------|
| mercaderia | Cost of Goods Sold | Cost of Goods Sold |
| servicios | Office Expenses | Expense |
| marketing | Advertising & Marketing | Expense |
| transporte | Vehicle Expenses | Expense |
| operacion | Operating Expenses | Expense |
| personal | Payroll Expenses | Expense |
| instalaciones | Rent or Lease | Expense |
| impuestos | Taxes & Licenses | Expense |
| equipamiento | Equipment Rental | Expense |
| alimentacion | Meals & Entertainment | Expense |
| otros | Other Expenses | Expense |

### 2. Edge Function: `sync-expense-to-qb`

**Endpoint:** `POST /functions/v1/sync-expense-to-qb`

**Request Body:**
```json
{
  "expenseId": "uuid-del-gasto"
}
```

**Response (Success):**
```json
{
  "success": true,
  "qbExpenseId": "123"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Token expired and refresh failed",
  "retryAfter": 60
}
```

**Flujo:**
1. Valida autenticación del usuario
2. Obtiene el gasto de la base de datos
3. Verifica conexión QB activa
4. Mapea categoría MANU → QB account
5. Construye payload para QuickBooks API
6. Envía a QuickBooks con retry logic
7. Actualiza `gastos` con resultado

### 3. PostgreSQL Functions

#### `sync_all_pending_expenses(user_id)`

Marca todos los gastos pendientes de un usuario para sincronización.

**Uso:**
```sql
SELECT * FROM sync_all_pending_expenses('user-uuid');
```

#### `get_sync_statistics(user_id)`

Retorna estadísticas de sincronización.

**Uso:**
```sql
SELECT * FROM get_sync_statistics('user-uuid');
```

**Resultado:**
```
total_expenses | pending_count | synced_count | failed_count | skipped_count | last_sync_at
---------------|---------------|--------------|--------------|---------------|---------------
     150       |      25       |     120      |      5       |       0       | 2025-12-20 10:30:00
```

#### `retry_failed_syncs(user_id, max_retries)`

Reintenta gastos que fallaron.

**Uso:**
```sql
SELECT * FROM retry_failed_syncs('user-uuid', 3);
```

#### `skip_expense_sync(expense_id, reason)`

Marca un gasto como "skipped" (no se sincronizará).

**Uso:**
```sql
SELECT skip_expense_sync('expense-uuid', 'User requested skip');
```

## Manejo de Errores

### 401 - Token Expirado

1. Intentar refresh del token usando `refresh_token`
2. Si refresh exitoso, actualizar `quickbooks_connections` con nuevo token
3. Reintentar la sincronización
4. Si refresh falla, marcar conexión como `expired` y notificar al usuario

### 429 - Rate Limit

1. Leer header `Retry-After` de la respuesta
2. Esperar el tiempo indicado
3. Reintentar (máximo 3 veces)
4. Si persiste, marcar como `failed` con error "Rate limited"

### Otros Errores (400, 500, etc.)

1. Guardar mensaje de error en `sync_error`
2. Marcar `sync_status = 'failed'`
3. Permitir retry manual o automático después de 1 hora

## Reintentos

- **Máximo de reintentos:** 3
- **Backoff exponencial:** 1s, 2s, 4s
- **Rate limit:** Respeta `Retry-After` header
- **Token refresh:** No cuenta como reintento

## Sincronización Automática

### Opción 1: pg_cron (Recomendado)

Configurar job que ejecute cada hora:

```sql
SELECT cron.schedule(
  'sync-pending-expenses',
  '0 * * * *', -- Cada hora
  $$SELECT scheduled_sync_pending_expenses();$$
);
```

### Opción 2: Edge Function Scheduler

Usar Supabase Edge Functions con triggers o webhooks.

### Opción 3: Cliente (React Native)

Llamar Edge Function después de crear/editar gasto:

```typescript
// After creating expense
const { data, error } = await supabase.functions.invoke('sync-expense-to-qb', {
  body: { expenseId: newExpense.id }
});
```

## Webhook (Opcional - Avanzado)

Para sincronización bidireccional (QB → MANU):

1. Configurar webhook en QuickBooks Developer Dashboard
2. Crear Edge Function `qb-webhook-handler`
3. Procesar eventos: `Purchase.Create`, `Purchase.Update`, `Purchase.Delete`
4. Actualizar gastos en MANU según corresponda

**Nota:** Requiere validación de firma del webhook y manejo de duplicados.

## Seguridad

### Encriptación de Tokens

Los tokens OAuth se almacenan encriptados usando:
- **Opción A:** `expo-crypto` + `expo-secure-store` (cliente)
- **Opción B:** Supabase Vault (Edge Functions)
- **Opción C:** `pgcrypto` (PostgreSQL)

Ver `QUICKBOOKS_VAULT_ENCRYPTION.md` para detalles.

### Row Level Security (RLS)

- Usuarios solo pueden ver/editar sus propias conexiones QB
- Usuarios solo pueden sincronizar sus propios gastos
- Service role key solo usado en Edge Functions (server-side)

## Testing

### Sandbox vs Production

- **Sandbox:** `https://sandbox-quickbooks.api.intuit.com`
- **Production:** `https://quickbooks.api.intuit.com`

Cambiar `QB_API_BASE` en Edge Function según ambiente.

### Datos de Prueba

1. Crear gasto en MANU
2. Verificar `sync_status = 'pending'`
3. Llamar Edge Function manualmente
4. Verificar `sync_status = 'synced'` y `qb_expense_id` poblado
5. Verificar en QuickBooks que el expense existe

## Troubleshooting

### "Token expired and refresh failed"

- Verificar que `qb_refresh_token` es válido
- Verificar credenciales OAuth en QuickBooks Developer Dashboard
- Implementar refresh token logic si falta

### "Rate limited by QuickBooks API"

- Reducir frecuencia de sincronización
- Implementar queue system con delays
- Contactar QuickBooks support para aumentar rate limit

### "Could not determine QuickBooks account"

- Verificar que `category_mapping` tiene entrada para la categoría
- Verificar que `is_active = true` en el mapping
- Agregar mapping faltante manualmente

## Próximos Pasos

1. ✅ Migración de base de datos
2. ✅ Edge Function para sync individual
3. ✅ PostgreSQL functions para batch sync
4. ✅ Mapeo de categorías
5. ⏳ Implementar refresh token logic
6. ⏳ Configurar pg_cron job
7. ⏳ Testing en sandbox
8. ⏳ Webhook handler (opcional)

