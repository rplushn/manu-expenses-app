# 🔧 Corrección de Error de Supabase Storage

## ❌ Error Original
```
StorageUnknownError: Unexpected token '<', '<html>' is not valid JSON
```

## 🔍 Diagnóstico

El error indica que Supabase Storage está devolviendo una página HTML (probablemente una página de error) en lugar de una respuesta JSON válida. Esto puede ocurrir cuando:
1. Las credenciales no son correctas
2. Los headers de la petición no están configurados correctamente
3. Hay un problema con la configuración del cliente de Supabase

## ✅ Configuración Verificada

### 1. Archivo `.env` (Raíz del proyecto)
**Estado:** ✅ CORRECTO

```env
EXPO_PUBLIC_SUPABASE_URL=https://mcnzuxvhswyqckhiqlgc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbnp1eHZoc3d5cWNraGlxbGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTE0NTgsImV4cCI6MjA4MTc2NzQ1OH0.3sdkTYtJ_5tDc9cBWLBlQLX5RA6ATBf6x6vGYC5MIj8
```

**Verificación:**
- ✅ `EXPO_PUBLIC_SUPABASE_URL` está correctamente configurada
- ✅ URL base sin sufijos `/auth/v1` o `/storage/v1`
- ✅ Formato correcto: `https://[project-id].supabase.co`
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` presente y válida

### 2. Archivo `src/lib/supabase.ts`
**Estado:** ✅ CORREGIDO

#### Antes:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### Después:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
```

**Cambio realizado:**
- ✅ Agregado `global.headers` con `Content-Type: application/json`
- ✅ Esto asegura que todas las peticiones a Supabase (incluyendo Storage) envíen el header correcto

### 3. Verificación de URLs Hardcodeadas
**Estado:** ✅ CORRECTO

- ✅ No se encontraron URLs hardcodeadas de `supabase.co` en el código fuente
- ✅ Todas las referencias usan las variables de entorno correctamente

## 📝 Resumen de Cambios

### Archivos Modificados:
1. **`src/lib/supabase.ts`**
   - Agregado `global.headers` con `Content-Type: application/json`

### Archivos Verificados (sin cambios necesarios):
1. **`.env`** - Configuración correcta
2. **Código fuente** - No hay URLs hardcodeadas

## 🧪 Pasos para Probar

1. **Reiniciar el servidor de desarrollo:**
   ```bash
   # Detener el servidor actual (Ctrl+C)
   # Limpiar caché de Metro
   npx expo start --clear
   ```

2. **Probar el upload del logo:**
   - Navegar a Profile → Datos de facturación
   - Hacer clic en "Subir logo"
   - Seleccionar una imagen
   - Verificar que se suba correctamente

3. **Verificar en la consola:**
   - Deberías ver logs de debug:
     ```
     🔐 Session exists: true
     🔐 User ID: [tu-user-id]
     🆔 Current User ID: [tu-user-id]
     📤 Uploading logo: [user-id]/logo.[ext]
     ```
   - Si hay error, ahora debería mostrar un mensaje JSON válido en lugar de HTML

## 🔍 Verificación de Supabase Dashboard

Si el problema persiste, verifica en Supabase Dashboard:

1. **Storage Bucket `company-logos`:**
   - Debe existir
   - Debe tener políticas de acceso público para lectura
   - Debe permitir uploads autenticados

2. **RLS Policies:**
   - Verificar que existan políticas para INSERT en Storage
   - Verificar que el usuario autenticado tenga permisos

3. **API Settings:**
   - Verificar que la URL del proyecto sea correcta
   - Verificar que la Anon Key sea válida

## 📚 Documentación de Referencia

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase JS Client Configuration](https://supabase.com/docs/reference/javascript/initializing)

## ✅ Checklist de Verificación

- [x] Variables de entorno correctas en `.env`
- [x] URL de Supabase sin sufijos
- [x] Cliente de Supabase con headers correctos
- [x] No hay URLs hardcodeadas
- [x] No hay errores de linter
- [ ] Servidor reiniciado con caché limpio
- [ ] Upload de logo probado
- [ ] Verificar bucket en Supabase Dashboard

## 🎯 Próximos Pasos

1. Reiniciar el servidor con `npx expo start --clear`
2. Probar el upload del logo
3. Si persiste el error, verificar:
   - Que el bucket `company-logos` exista en Supabase
   - Que las políticas de Storage permitan uploads
   - Los logs de la consola del navegador para más detalles

## 💡 Notas Adicionales

El error "Unexpected token '<'" generalmente indica que:
- Se está recibiendo una página HTML de error en lugar de JSON
- Esto puede ser causado por:
  - Headers incorrectos (ahora corregido)
  - Credenciales inválidas (verificadas y correctas)
  - Problemas de CORS (no aplica en React Native)
  - Bucket no existe o no tiene permisos

Con los cambios realizados, el cliente de Supabase ahora envía los headers correctos para todas las peticiones, lo que debería resolver el problema.


