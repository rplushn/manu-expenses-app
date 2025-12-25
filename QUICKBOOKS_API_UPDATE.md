# QuickBooks API Update - Bill Endpoint

## Cambios Importantes

### 1. Endpoint Correcto: `/bill` (no `/expense`)

QuickBooks Online **NO tiene un endpoint `/expense` directo**. Para crear gastos, se usa:
- **Endpoint:** `POST /v3/company/{realmId}/bill`
- **Tipo:** Accounts Payable (Cuentas por pagar)
- **Documentación:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill

### 2. Payload Correcto

```json
{
  "VendorRef": {
    "value": "{vendor_id}"
  },
  "Line": [
    {
      "Amount": 100.00,
      "DetailType": "AccountBasedExpenseLineDetail",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": {
          "value": "{account_id}"
        }
      }
    }
  ],
  "TxnDate": "2025-12-20",
  "DocNumber": "MANU-12345678",
  "Memo": "Notas del gasto",
  "CurrencyRef": {
    "value": "USD"
  }
}
```

### 3. Auto-creación de Vendors

- Si el proveedor no existe en QuickBooks, se crea automáticamente
- Se cachea en tabla `qb_vendors` para evitar duplicados
- Búsqueda primero, luego creación si no existe

### 4. Mapeo de Categorías

**Tabla `category_qb_mapping` (por usuario):**
- Permite personalización por usuario
- Requiere `qb_account_id` (no solo nombre)
- Fallback a `category_mapping` (defaults)

**Tabla `category_mapping` (defaults):**
- Actualizada para incluir `qb_account_id`
- Se debe poblar con IDs reales de QuickBooks

### 5. Refresh Token Implementado

- Función `refreshQBAccessToken()` completamente implementada
- Usa OAuth2 endpoint de Intuit
- Actualiza tokens en base de datos automáticamente

## Migraciones Necesarias

1. **Ejecutar `quickbooks_vendors_migration.sql`**
   - Crea tabla `qb_vendors` para cache de vendors

2. **Ejecutar `quickbooks_category_qb_mapping_migration.sql`**
   - Crea tabla `category_qb_mapping` para mapeos personalizados
   - Crea función `get_qb_account_id_for_category()`

3. **Actualizar `category_mapping` con Account IDs**
   - Necesitas obtener los Account IDs reales de QuickBooks
   - Ejemplo query:
   ```sql
   UPDATE category_mapping 
   SET qb_account_id = '123' 
   WHERE manu_category = 'mercaderia';
   ```

## Variables de Entorno

Agregar en Supabase Edge Functions:

```env
QB_API_BASE=https://quickbooks.api.intuit.com  # o sandbox
QB_CLIENT_ID=tu_client_id
QB_CLIENT_SECRET=tu_client_secret
```

## Testing

1. **Sandbox:**
   - Usar `https://sandbox-quickbooks.api.intuit.com`
   - Crear cuenta de prueba en https://developer.intuit.com

2. **Production:**
   - Usar `https://quickbooks.api.intuit.com`
   - Requiere app aprobada por Intuit

## Errores Comunes

### "No se encontró cuenta de QuickBooks"
- **Causa:** `qb_account_id` no está configurado en `category_mapping`
- **Solución:** Obtener Account IDs de QB y actualizar la tabla

### "No se pudo crear o encontrar el proveedor"
- **Causa:** Error al crear vendor en QuickBooks
- **Solución:** Verificar permisos de la app en QuickBooks

### "Token expirado"
- **Causa:** Token OAuth expiró
- **Solución:** El sistema intenta refresh automático, si falla requiere reconexión

## Próximos Pasos

1. ✅ Edge Function actualizada con `/bill` endpoint
2. ✅ Auto-creación de vendors implementada
3. ✅ Refresh token implementado
4. ⏳ Poblar `category_mapping` con Account IDs reales
5. ⏳ Testing en sandbox
6. ⏳ Configurar webhook (opcional)

