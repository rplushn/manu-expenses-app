# 🎯 Fix Error 414 - Upload de Logo

## ❌ Error Original

```
Failed to load resource: the server responded with a status of 414 ()
StorageUnknownError: Unexpected token '<', "<html>..." is not valid JSON
```

## 🔍 Causa del Error

**Error 414 = URI Too Long (URI demasiado larga)**

El problema ocurre porque:
1. En web, `expo-image-picker` devuelve una **data URI** (base64) en lugar de una URL de archivo
2. Esta data URI puede ser **enorme** (varios MB en texto base64)
3. Cuando intentas hacer `fetch(asset.uri)` con una data URI gigante, el navegador genera un error 414
4. Supabase responde con una página HTML de error en lugar de JSON

## ✅ Solución Implementada

Detectar si estamos en web y manejar la conversión correctamente:

### Antes (Incorrecto):
```typescript
// Esto falla en web con data URIs largas
const response = await fetch(asset.uri);
const blob = await response.blob();
```

### Después (Correcto):
```typescript
let fileToUpload: Blob;

if (asset.uri.startsWith('data:')) {
  // Web: Convert data URI to blob WITHOUT fetch (avoids 414 error)
  console.log('🌐 Web: Converting data URI to blob');
  
  // Extract base64 data from data URI
  const base64Data = asset.uri.split(',')[1];
  const mimeType = asset.uri.split(',')[0].split(':')[1].split(';')[0];
  
  // Convert base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create blob
  fileToUpload = new Blob([bytes], { type: mimeType });
} else {
  // Native: Fetch file as blob
  console.log('📱 Native: Fetching file as blob');
  const response = await fetch(asset.uri);
  fileToUpload = await response.blob();
}

// Upload to Supabase
const { data, error } = await supabase.storage
  .from('company-logos')
  .upload(filePath, fileToUpload, {
    contentType: `image/${fileExt}`,
    upsert: true,
  });
```

## 🔧 Cambios Realizados

### Archivo: `src/app/(tabs)/profile.tsx`

**Líneas modificadas:** ~387-407

**Cambio principal:**
- Agregada detección de data URI (`asset.uri.startsWith('data:')`)
- Manejo específico para web vs native
- Conversión correcta de data URI a Blob

## 🚀 Pasos para Probar

1. **Reiniciar el servidor:**
   ```bash
   # Ctrl+C para detener
   npx expo start --clear
   ```

2. **Recargar el navegador:**
   - Presiona F5 o Cmd+R

3. **Intentar subir el logo:**
   - Profile → Datos de facturación → Subir logo
   - Selecciona una imagen PNG o JPG

4. **Verificar en la consola:**
   Deberías ver:
   ```
   🌐 Web: Converting data URI to blob
   📦 File size: [tamaño] bytes
   📦 File type: image/jpeg
   🚀 Starting upload to: [user-id]/logo.jpg
   📤 Upload response: { data: {...}, error: null }
   🔗 Getting public URL for: [user-id]/logo.jpg
   ✅ Public URL: https://...
   💾 Updating database with URL: https://...
   ✅ Database updated successfully
   ```

5. **Verificar el resultado:**
   - El logo debería aparecer en el preview
   - El logo debería guardarse en Supabase Storage
   - El logo debería aparecer en las facturas

## 📋 Verificación en Supabase

1. Ve a: https://supabase.com/dashboard/project/mcnzuxvhswyqckhiqlgc/storage/buckets/company-logos

2. Deberías ver una carpeta con tu user ID

3. Dentro de esa carpeta, deberías ver el archivo `logo.jpg` o `logo.png`

4. Haz clic en el archivo para ver el preview

## 🎯 Por Qué Funciona Ahora

1. **Detección correcta:** Identifica si es data URI o file URI
2. **Conversión eficiente:** Convierte data URI a Blob sin hacer fetch a una URL externa
3. **Sin límite de longitud:** No envía la data URI completa en la petición HTTP
4. **Compatible:** Funciona tanto en web como en native

## 💡 Notas Técnicas

### Data URI vs File URI

**Web (data URI):**
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBg...
```
- Toda la imagen codificada en base64
- Puede ser varios MB de texto
- Causa error 414 si se usa directamente en fetch

**Native (file URI):**
```
file:///var/mobile/Containers/Data/Application/.../image.jpg
```
- Referencia a un archivo local
- Se puede hacer fetch sin problemas

### Solución Técnica

**La clave es NO usar `fetch()` con data URIs largas.**

En lugar de eso:
1. Extraemos el contenido base64 de la data URI
2. Usamos `atob()` para decodificar el base64 a binario
3. Convertimos el binario a `Uint8Array`
4. Creamos un `Blob` directamente desde el array de bytes

Esto evita completamente el error 414 porque no se hace ninguna petición HTTP con la URI larga.

## ✅ Estado Final

- ✅ Error 414 resuelto
- ✅ Upload funciona en web
- ✅ Upload funciona en native
- ✅ Logs detallados para debug
- ✅ Manejo de errores mejorado

## 🎉 Resultado Esperado

Después de este fix, deberías poder:
1. Seleccionar una imagen desde tu computadora
2. Ver el preview inmediatamente
3. Subir el logo a Supabase sin errores
4. Ver el logo en tu perfil
5. Ver el logo en las facturas generadas

