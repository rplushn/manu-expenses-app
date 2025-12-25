# QuickBooks Token Encryption with Supabase Vault

## Overview
Los tokens de OAuth de QuickBooks (`access_token` y `refresh_token`) son datos sensibles que deben encriptarse antes de almacenarse en la base de datos.

## Opción Recomendada: Supabase Vault

Supabase Vault es la solución nativa de Supabase para encriptación de datos sensibles. Sin embargo, **Vault no está disponible directamente en el cliente de Supabase JS**.

### Alternativas de Implementación:

### Opción A: Encriptación en el Cliente (Recomendada para React Native)

Usar `expo-crypto` o `react-native-crypto` para encriptar tokens antes de insertar:

```typescript
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Encriptar token antes de guardar
async function encryptToken(token: string, key: string): Promise<string> {
  // Usar AES-256-GCM o similar
  // Implementar según librería elegida
}

// Guardar encriptado en Supabase
async function saveQBConnection(accessToken: string, refreshToken: string) {
  const encryptedAccess = await encryptToken(accessToken, ENCRYPTION_KEY);
  const encryptedRefresh = await encryptToken(refreshToken, ENCRYPTION_KEY);
  
  await supabase
    .from('quickbooks_connections')
    .insert({
      usuario_id: userId,
      qb_access_token: encryptedAccess,
      qb_refresh_token: encryptedRefresh,
      // ...
    });
}
```

### Opción B: Edge Function con Vault (Recomendada para Producción)

Crear una Edge Function en Supabase que maneje la encriptación usando Vault:

```typescript
// supabase/functions/save-qb-connection/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { accessToken, refreshToken, realmId } = await req.json();
  
  // Encriptar usando Supabase Vault (solo disponible en Edge Functions)
  const encryptedAccess = await vault.encrypt(accessToken);
  const encryptedRefresh = await vault.encrypt(refreshToken);
  
  // Guardar en base de datos
  const supabase = createClient(...);
  await supabase
    .from('quickbooks_connections')
    .insert({
      qb_access_token: encryptedAccess,
      qb_refresh_token: encryptedRefresh,
      // ...
    });
});
```

### Opción C: pgcrypto en PostgreSQL (Más Simple)

Usar la extensión `pgcrypto` directamente en PostgreSQL:

```sql
-- En la migración, cambiar tipo de columna:
ALTER TABLE quickbooks_connections
ALTER COLUMN qb_access_token TYPE BYTEA USING pgp_sym_encrypt(qb_access_token, 'encryption_key');

-- O usar funciones de encriptación en triggers
```

**Nota:** Requiere manejar la clave de encriptación de forma segura.

## Recomendación Final

Para React Native/Expo, usar **Opción A** con `expo-crypto` o `expo-secure-store`:
- Más control sobre la encriptación
- Funciona offline
- No requiere Edge Functions
- Clave de encriptación se puede almacenar en `expo-secure-store`

## Implementación Sugerida

```typescript
// src/lib/qb-encryption.ts
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_NAME = 'qb_encryption_key';

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (!key) {
    key = await Crypto.getRandomBytesAsync(32).then(bytes => 
      Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    );
    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
  }
  return key;
}

// Implementar encriptación/desencriptación según librería elegida
```

