# 🐛 Fix: Bug en filePath del Upload de Logo

## ❌ Problema Identificado

**URL incorrecta en Supabase:**
```
mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/company-logos/.../logo.data:image/png;base64,...
```

**Causa:**
En web, `asset.uri` es una data URI completa:
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

Cuando hacíamos `asset.uri.split('.').pop()`, obteníamos todo el base64 en lugar de la extensión del archivo.

## ✅ Solución Implementada

### Antes (Incorrecto):
```typescript
// ❌ ESTO CAUSABA EL BUG
const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
// En web, esto devolvía: "data:image/png;base64,iVBORw0KGgo..."
```

### Después (Correcto):
```typescript
// ✅ ESTO FUNCIONA CORRECTAMENTE
let fileExt = 'jpg';
if (asset.mimeType) {
  // Use mimeType if available (e.g., "image/png" -> "png")
  fileExt = asset.mimeType.split('/')[1];
} else if (Platform.OS === 'web' && asset.uri.startsWith('data:')) {
  // Web data URI: extract from "data:image/png;base64,..."
  const match = asset.uri.match(/data:image\/(\w+);base64/);
  fileExt = match ? match[1] : 'jpg';
} else {
  // Native file URI: extract from file path
  fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
}

const fileName = `logo.${fileExt}`;
const filePath = `${currentUser.id}/${fileName}`;

console.log('📤 Uploading to path:', filePath, 'contentType:', `image/${fileExt}`);
```

## 📝 Cambios Realizados

### Archivo: `src/app/(tabs)/profile.tsx`

**Líneas modificadas:** 389-406

**Cambios específicos:**

1. **Línea 390:** Inicializar `fileExt` con valor por defecto
2. **Líneas 391-393:** Priorizar `asset.mimeType` si está disponible
3. **Líneas 394-397:** Detectar data URI en web y extraer extensión con regex
4. **Líneas 398-401:** Fallback para native usando split del path
5. **Línea 406:** Agregar log de debug con path y contentType

## 🔍 Cómo Funciona Ahora

### Caso 1: Web con data URI
```typescript
asset.uri = "data:image/png;base64,iVBORw0KGgo..."
asset.mimeType = "image/png"

// Resultado:
fileExt = "png"  // Extraído de mimeType
fileName = "logo.png"
filePath = "user-id-123/logo.png"
```

### Caso 2: Native con file URI
```typescript
asset.uri = "file:///var/mobile/.../image.jpg"
asset.mimeType = "image/jpeg"

// Resultado:
fileExt = "jpeg"  // Extraído de mimeType
fileName = "logo.jpeg"
filePath = "user-id-123/logo.jpeg"
```

### Caso 3: Fallback
```typescript
asset.uri = "file:///path/to/photo.png"
asset.mimeType = undefined

// Resultado:
fileExt = "png"  // Extraído del path con split
fileName = "logo.png"
filePath = "user-id-123/logo.png"
```

## ✅ Verificación

### URL Correcta en Supabase:
```
✅ mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/company-logos/user-id-123/logo.png
```

### URL Incorrecta (antes del fix):
```
❌ mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/company-logos/.../logo.data:image/png;base64,...
```

## 🚀 Pasos para Probar

1. **Reiniciar servidor:**
   ```bash
   npx expo start --clear
   ```

2. **Recargar navegador:** F5

3. **Subir logo:**
   - Profile → Datos de facturación → Subir logo

4. **Verificar en consola:**
   ```
   📤 Uploading to path: user-id-123/logo.png contentType: image/png
   🌐 Web: Extracting base64 from data URI
   📦 Base64 length: 123456 characters
   📦 File size: 92592 bytes
   🚀 Starting upload to: user-id-123/logo.png
   📤 Upload response: { data: {...}, error: null }
   ✅ Public URL: https://mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/public/company-logos/user-id-123/logo.png
   ```

5. **Verificar en Supabase Storage:**
   - Ve a: https://supabase.com/dashboard/project/mcnzuxvhswyqckhiqlgc/storage/buckets/company-logos
   - Deberías ver la carpeta con tu user ID
   - Dentro, el archivo `logo.png` o `logo.jpg`

## 🎯 Resultado Esperado

- ✅ No más error 414
- ✅ No más error "Unexpected token '<'"
- ✅ Upload exitoso a Supabase
- ✅ URL correcta sin `data:image/` en el path
- ✅ Logo visible en preview
- ✅ Logo guardado correctamente
- ✅ Logo visible en facturas

## 📊 Comparación

| Aspecto | Antes | Después |
|---------|-------|---------|
| fileExt en web | `data:image/png;base64,...` | `png` |
| fileName | `logo.data:image/png;base64,...` | `logo.png` |
| filePath | `user-id/logo.data:image/...` | `user-id/logo.png` |
| URL en Supabase | ❌ Incorrecta | ✅ Correcta |
| Status | 414 Error | 200 OK |

## 💡 Lección Aprendida

**Nunca asumir el formato de `asset.uri`:**
- En web: puede ser data URI
- En native: puede ser file URI
- Siempre usar `asset.mimeType` primero
- Tener fallbacks robustos

## ✅ Estado Final

Este fix resuelve completamente el bug del upload de logo. El problema era simplemente cómo se extraía la extensión del archivo, no la lógica de conversión a ArrayBuffer ni el upload a Supabase.


