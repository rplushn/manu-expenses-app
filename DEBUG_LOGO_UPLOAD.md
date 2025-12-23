# 🔍 Debug de Upload de Logo - Instrucciones

## ✅ Estado Actual

- ✅ Bucket `company-logos` creado en Supabase
- ✅ Políticas de acceso configuradas
- ✅ Logs de debug agregados al código

## 🚀 Pasos para Probar y Ver el Error Exacto

### 1. Reiniciar el Servidor

En la terminal donde corre `npx expo start`, presiona:
```
Ctrl+C (para detener)
```

Luego ejecuta:
```bash
npx expo start --clear
```

### 2. Recargar la App en el Navegador

- Presiona **F5** o **Cmd+R** en el navegador donde está corriendo la app

### 3. Abrir la Consola del Navegador

- Presiona **F12** o **Cmd+Option+I**
- Ve a la pestaña **Console**

### 4. Intentar Subir el Logo

1. Ve a **Profile** → **Datos de facturación**
2. Haz clic en **"Subir logo"**
3. Selecciona una imagen

### 5. Ver los Logs en la Consola

Deberías ver estos logs en orden:

```
🔐 Session exists: true
🔐 User ID: [tu-user-id]
🆔 Current User ID: [tu-user-id]
📤 Uploading logo: [user-id]/logo.[ext]
📦 Blob size: [tamaño] bytes
📦 Blob type: image/[tipo]
🚀 Starting upload to: [user-id]/logo.[ext]
📤 Upload response: { data: ..., error: ... }
```

### 6. Si Hay Error

Si aparece un error, copia **TODO** el mensaje de error de la consola y envíamelo.

Específicamente busca:
- ❌ Upload error details: { ... }
- El mensaje completo del error

## 🔍 Posibles Causas del Error

### Error 1: "Bucket not found"
**Solución:** Verificar que el bucket se llame exactamente `company-logos` (con guión, no underscore)

### Error 2: "Unauthorized" o "403"
**Solución:** Verificar que las políticas de RLS estén correctas

### Error 3: "Invalid file type"
**Solución:** Verificar que el archivo sea PNG o JPG

### Error 4: "File too large"
**Solución:** Verificar que el archivo sea menor a 2MB

## 📋 Checklist de Verificación en Supabase

Ve a: https://supabase.com/dashboard/project/mcnzuxvhswyqckhiqlgc/storage/buckets

### Verificar Bucket:
- [ ] El bucket se llama **exactamente** `company-logos`
- [ ] El bucket está marcado como **Public** (checkbox activado)
- [ ] El bucket existe y está visible en la lista

### Verificar Políticas:
Ve a la pestaña **Policies** del bucket `company-logos`

Deberías tener estas políticas:

1. **public_read** o similar
   - Operation: SELECT
   - Policy: `true` o `bucket_id = 'company-logos'`

2. **authenticated_upload** o similar
   - Operation: INSERT
   - Policy: `(bucket_id = 'company-logos') AND (auth.uid()::text = (storage.foldername(name))[1])`

3. **authenticated_update** o similar
   - Operation: UPDATE
   - Policy: `(bucket_id = 'company-logos') AND (auth.uid()::text = (storage.foldername(name))[1])`

4. **authenticated_delete** o similar
   - Operation: DELETE
   - Policy: `(bucket_id = 'company-logos') AND (auth.uid()::text = (storage.foldername(name))[1])`

## 🎯 Próximos Pasos

1. Reinicia el servidor: `npx expo start --clear`
2. Recarga el navegador: F5
3. Abre la consola: F12
4. Intenta subir el logo
5. Copia **TODOS** los logs de la consola
6. Envíame los logs completos

## 📸 Capturas Útiles

Si es posible, toma capturas de:
1. La consola del navegador con los logs
2. La página de Storage en Supabase mostrando el bucket `company-logos`
3. La página de Policies del bucket mostrando las 4 políticas

## 💡 Nota Importante

Los logs ahora son **MUCHO MÁS DETALLADOS**. Cada paso del proceso mostrará información específica que nos ayudará a identificar exactamente dónde está fallando el upload.

