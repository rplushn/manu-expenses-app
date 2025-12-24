# 🔧 Fix: Problema de Caché del Logo

## ❌ Problema

Cuando el usuario:
1. Sube un logo (ej: `logo.png`)
2. Lo elimina
3. Sube un logo diferente (pero con el mismo nombre `logo.png`)

**Resultado:** El navegador muestra el logo anterior (cacheado) en lugar del nuevo.

## 🔍 Causa

El navegador cachea las imágenes por URL. Como el archivo siempre se llama `logo.png` (o `logo.jpg`), la URL es siempre la misma:

```
https://mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/public/company-logos/user-123/logo.png
```

Aunque el contenido del archivo cambie en el servidor, el navegador usa la versión cacheada porque la URL no cambió.

## ✅ Solución: Cache-Busting

Agregar un timestamp único a la URL cada vez que se sube un logo:

```
https://...logo.png?t=1703123456789
```

Cada vez que se sube un logo nuevo, el timestamp cambia, forzando al navegador a descargar la nueva versión.

## 🔧 Implementación

### Cambio en `handleUploadLogo`

**Antes:**
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('company-logos')
  .getPublicUrl(filePath);

// Update database
const { error: dbError } = await supabase
  .from('usuarios')
  .update({ empresa_logo_url: publicUrl })
  .eq('id', currentUser.id);

setCompanyLogoUrl(publicUrl);
setCurrentUser({
  ...currentUser,
  empresaLogoUrl: publicUrl,
});
```

**Después:**
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('company-logos')
  .getPublicUrl(filePath);

// Add timestamp to avoid browser cache
const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

// Update database
const { error: dbError } = await supabase
  .from('usuarios')
  .update({ empresa_logo_url: cacheBustedUrl })
  .eq('id', currentUser.id);

setCompanyLogoUrl(cacheBustedUrl);
setCurrentUser({
  ...currentUser,
  empresaLogoUrl: cacheBustedUrl,
});
```

## 📊 Ejemplo de URLs

### Primera subida:
```
https://mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/public/company-logos/user-123/logo.png?t=1703123456789
```

### Después de eliminar y subir nuevo logo:
```
https://mcnzuxvhswyqckhiqlgc.supabase.co/storage/v1/object/public/company-logos/user-123/logo.png?t=1703123999999
```

**Nota:** El timestamp es diferente, por lo que el navegador descarga la nueva imagen.

## 🎯 Comportamiento Corregido

### Escenario 1: Subir Logo Inicial
```
1. Usuario sube logo.png
2. URL generada: ...logo.png?t=1703123456789
3. Se guarda en DB
4. Se muestra en UI
✅ Logo correcto
```

### Escenario 2: Cambiar Logo
```
1. Usuario elimina logo actual
2. Usuario sube logo diferente (logo.png)
3. URL generada: ...logo.png?t=1703123999999  ← Timestamp diferente
4. Se guarda en DB
5. Se muestra en UI
✅ Logo nuevo (no cacheado)
```

### Escenario 3: Mismo Logo, Diferente Formato
```
1. Usuario tenía logo.png
2. Usuario sube logo.jpg
3. URL generada: ...logo.jpg?t=1703124000000
4. Se guarda en DB
5. Se muestra en UI
✅ Logo nuevo
```

## 🔍 Detalles Técnicos

### `Date.now()`
- Devuelve el timestamp actual en milisegundos
- Ejemplo: `1703123456789`
- Es único en cada llamada (diferente cada milisegundo)

### Query Parameter `?t=`
- No afecta la descarga del archivo
- Supabase Storage ignora este parámetro
- Solo sirve para que el navegador vea una URL "diferente"

### Compatibilidad
- ✅ Funciona en todos los navegadores
- ✅ Funciona en React Native (web y mobile)
- ✅ No afecta el funcionamiento de Supabase Storage

## ✅ Verificación

### Antes del Fix:
```
1. Subir logo A → URL: ...logo.png
2. Ver logo A ✅
3. Eliminar logo A
4. Subir logo B → URL: ...logo.png (misma URL)
5. Ver logo A ❌ (cacheado)
```

### Después del Fix:
```
1. Subir logo A → URL: ...logo.png?t=123
2. Ver logo A ✅
3. Eliminar logo A
4. Subir logo B → URL: ...logo.png?t=456 (URL diferente)
5. Ver logo B ✅ (no cacheado)
```

## 📋 Cambios Realizados

### Archivo: `src/app/(tabs)/profile.tsx`

**Líneas modificadas:** ~453-479

1. **Línea 459:** Crear `cacheBustedUrl` con timestamp
2. **Línea 464:** Guardar `cacheBustedUrl` en DB (en lugar de `publicUrl`)
3. **Línea 475:** Actualizar estado local con `cacheBustedUrl`
4. **Línea 479:** Actualizar store con `cacheBustedUrl`

## 🎉 Resultado

- ✅ Cada logo subido tiene una URL única
- ✅ El navegador descarga la nueva imagen cada vez
- ✅ No más logos cacheados
- ✅ El usuario siempre ve el logo correcto

## 💡 Nota Importante

El timestamp en la URL **NO afecta** el archivo en Supabase Storage. El archivo sigue siendo `logo.png`, pero la URL con el timestamp hace que el navegador lo trate como un recurso diferente.

**El fix está completo y listo para usar.** 🎊


