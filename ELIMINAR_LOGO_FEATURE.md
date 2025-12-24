# ✅ Feature: Botón "Eliminar Logo"

## 📋 Implementación Completada

Se ha agregado la funcionalidad para eliminar el logo de la empresa en la pantalla de Profile.

## 🔧 Cambios Realizados

### 1. Nueva Función `handleDeleteLogo`

**Ubicación:** Después de `handleUploadLogo` (líneas ~491-548)

```typescript
const handleDeleteLogo = async () => {
  if (!currentUser?.id) return;

  Alert.alert(
    'Eliminar logo',
    '¿Seguro que quieres quitar el logo de tu empresa?',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => Haptics.selectionAsync(),
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Try to remove all possible logo variants
            const filesToRemove = [
              `${currentUser.id}/logo.png`,
              `${currentUser.id}/logo.jpg`,
              `${currentUser.id}/logo.jpeg`,
            ];

            // Attempt to remove files (ignore errors if files don't exist)
            await supabase.storage
              .from('company-logos')
              .remove(filesToRemove);

            // Update database
            const { error: dbError } = await supabase
              .from('usuarios')
              .update({ empresa_logo_url: null })
              .eq('id', currentUser.id);

            if (dbError) throw dbError;

            // Update local state
            setCompanyLogoUrl('');
            setCurrentUser({
              ...currentUser,
              empresaLogoUrl: undefined,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Listo', 'Logo eliminado correctamente');
          } catch (error) {
            console.error('Error deleting logo:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'No se pudo eliminar el logo');
          }
        },
      },
    ]
  );
};
```

### 2. Botón "Eliminar Logo" en UI

**Ubicación:** Debajo del texto "PNG o JPG, máx 2MB" (líneas ~944-952)

```typescript
{companyLogoUrl && (
  <Pressable
    onPress={handleDeleteLogo}
    className="mt-3 active:opacity-60"
  >
    <Text className="text-[13px] text-[#DC2626] text-center">
      Eliminar logo
    </Text>
  </Pressable>
)}
```

## ✅ Características

### 1. Confirmación Antes de Eliminar
- **Título:** "Eliminar logo"
- **Mensaje:** "¿Seguro que quieres quitar el logo de tu empresa?"
- **Botones:**
  - "Cancelar" (style: cancel)
  - "Eliminar" (style: destructive, color rojo)

### 2. Eliminación de Archivos
- Intenta eliminar todas las variantes posibles:
  - `{userId}/logo.png`
  - `{userId}/logo.jpg`
  - `{userId}/logo.jpeg`
- Ignora errores si los archivos no existen

### 3. Actualización de Base de Datos
- Actualiza `empresa_logo_url` a `null` en la tabla `usuarios`
- Solo lanza error si falla la actualización de DB

### 4. Actualización de Estado Local
- `setCompanyLogoUrl('')` - Limpia el estado local
- `setCurrentUser({ ...currentUser, empresaLogoUrl: undefined })` - Actualiza el store

### 5. Feedback al Usuario
- **Éxito:** Alert "Listo, Logo eliminado correctamente"
- **Error:** Alert "Error, No se pudo eliminar el logo"
- **Haptics:** Feedback táctil en iOS

## 🎨 Diseño del Botón

### Estilo:
- **Color:** Rojo (#DC2626) - Indica acción destructiva
- **Tamaño:** 13px - Texto pequeño, secundario
- **Posición:** Debajo del texto "PNG o JPG, máx 2MB"
- **Alineación:** Centrado
- **Margen:** `mt-3` (12px arriba)
- **Interacción:** `active:opacity-60` - Feedback visual al tocar

### Visibilidad:
- Solo se muestra si `companyLogoUrl` tiene un valor
- Si no hay logo, el botón no aparece

## 📊 Flujo de Usuario

### Escenario 1: Eliminar Logo Exitoso
```
1. Usuario ve el logo en Profile
2. Usuario hace clic en "Eliminar logo"
3. Aparece Alert de confirmación
4. Usuario hace clic en "Eliminar"
5. Haptic feedback
6. Se eliminan archivos de Storage
7. Se actualiza DB (empresa_logo_url = null)
8. Se actualiza estado local
9. Logo desaparece de la UI
10. Alert "Listo, Logo eliminado correctamente"
```

### Escenario 2: Usuario Cancela
```
1. Usuario hace clic en "Eliminar logo"
2. Aparece Alert de confirmación
3. Usuario hace clic en "Cancelar"
4. Haptic feedback
5. Alert se cierra
6. No se hace ningún cambio
```

### Escenario 3: Error al Eliminar
```
1. Usuario hace clic en "Eliminar"
2. Intenta eliminar archivos (puede fallar, se ignora)
3. Intenta actualizar DB
4. Si DB falla → Error
5. Alert "Error, No se pudo eliminar el logo"
6. Logo permanece en la UI
```

## 🔍 Detalles Técnicos

### Archivos a Eliminar
```typescript
const filesToRemove = [
  `${currentUser.id}/logo.png`,
  `${currentUser.id}/logo.jpg`,
  `${currentUser.id}/logo.jpeg`,
];
```

**Razón:** El usuario puede haber subido el logo en diferentes formatos en diferentes momentos.

### Manejo de Errores
```typescript
// Attempt to remove files (ignore errors if files don't exist)
await supabase.storage
  .from('company-logos')
  .remove(filesToRemove);
```

**Razón:** Los archivos pueden no existir en Storage (solo URL en DB), por lo que ignoramos errores de Storage pero validamos errores de DB.

### Actualización de Estado
```typescript
setCompanyLogoUrl('');  // String vacío para el input
setCurrentUser({
  ...currentUser,
  empresaLogoUrl: undefined,  // undefined para el store
});
```

**Razón:** `''` para el estado local del modal, `undefined` para el store global.

## ✅ Verificaciones

| Aspecto | Estado |
|---------|--------|
| Función `handleDeleteLogo` | ✅ Implementada |
| Alert de confirmación | ✅ Implementado |
| Eliminación de archivos | ✅ Implementado |
| Actualización de DB | ✅ Implementado |
| Actualización de estado | ✅ Implementado |
| Botón en UI | ✅ Implementado |
| Visibilidad condicional | ✅ Solo si hay logo |
| Estilo destructivo | ✅ Color rojo |
| Haptic feedback | ✅ Implementado |
| Manejo de errores | ✅ Implementado |

## 🎯 Resultado

### Antes:
```
┌─────────────────────┐
│   [LOGO 100x100]    │
│                     │
│  [Cambiar logo]     │
│  PNG o JPG, máx 2MB │
└─────────────────────┘
```

### Después:
```
┌─────────────────────┐
│   [LOGO 100x100]    │
│                     │
│  [Cambiar logo]     │
│  PNG o JPG, máx 2MB │
│  Eliminar logo      │ ← NUEVO
└─────────────────────┘
```

### Sin Logo:
```
┌─────────────────────┐
│   [ICON 40x40]      │
│                     │
│  [Subir logo]       │
│  PNG o JPG, máx 2MB │
│  (sin botón)        │ ← No aparece
└─────────────────────┘
```

## 🎉 Conclusión

Se ha implementado exitosamente la funcionalidad para eliminar el logo de la empresa:

- ✅ Botón visible solo cuando hay logo
- ✅ Confirmación antes de eliminar
- ✅ Eliminación de archivos en Storage
- ✅ Actualización de base de datos
- ✅ Actualización de estado local y store
- ✅ Feedback visual y táctil al usuario
- ✅ Manejo robusto de errores

**La funcionalidad está lista para usar.** 🎊


