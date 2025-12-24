# 📍 UBICACIÓN DEL CÓDIGO DEL LOGO

## 🗂️ ARCHIVOS CON CÓDIGO DEL LOGO

### 1. **Profile Screen (Pantalla de Perfil)**
📁 **Archivo:** `src/app/(tabs)/profile.tsx`

#### **Imports (Líneas 1-20):**
```typescript
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
  Image,  // ← Componente Image de React Native
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronRight, X, Crown, Check, Upload, Image as ImageIcon } from 'lucide-react-native';  // ← ImageIcon es el ícono
import * as ImagePicker from 'expo-image-picker';  // ← Para seleccionar imagen
import { useAppStore } from '@/lib/store';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
```

#### **State Variables (Líneas 113-116):**
```typescript
const [companyLogoUrl, setCompanyLogoUrl] = useState('');
const [isUploadingLogo, setIsUploadingLogo] = useState(false);
```

#### **Función de Upload (Líneas 341-430):**
```typescript
const handleUploadLogo = async () => {
  if (!currentUser?.id) return;

  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Se necesita acceso a la galería para seleccionar el logo.'
      );
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    
    // Validate file size (2MB max)
    if (asset.fileSize && asset.fileSize > 2097152) {
      Alert.alert('Error', 'El archivo es muy grande. Máximo 2MB.');
      return;
    }

    setIsUploadingLogo(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Get file extension
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `logo.${fileExt}`;
    const filePath = `${currentUser.id}/${fileName}`;

    console.log('📤 Uploading logo:', filePath);

    // Fetch the file as blob
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, blob, {
        contentType: asset.mimeType || 'image/jpeg',
        upsert: true, // Replace if exists
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Logo uploaded:', publicUrl);

    // Update state
    setCompanyLogoUrl(publicUrl);

    // Update database
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ empresa_logo_url: publicUrl })
      .eq('id', currentUser.id);

    if (updateError) throw updateError;

    // Update local store
    setCurrentUser({
      ...currentUser,
      empresaLogoUrl: publicUrl,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Éxito', 'Logo subido correctamente');
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    Alert.alert('Error', error.message || 'No se pudo subir el logo');
  } finally {
    setIsUploadingLogo(false);
  }
};
```

#### **UI del Logo (Líneas 796-837):**
```typescript
{/* Company Logo */}
<View className="mb-5">
  <Text className="text-[13px] text-[#666666] mb-2">
    Logo de la empresa
  </Text>
  <View className="flex-row items-center" style={{ gap: 12 }}>
    {companyLogoUrl ? (
      <View className="border border-[#E5E5E5] p-2">
        <Image
          source={{ uri: companyLogoUrl }}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
      </View>
    ) : (
      <View className="border border-[#E5E5E5] p-2 w-[100px] h-[100px] items-center justify-center bg-[#F9FAFB]">
        <ImageIcon size={40} strokeWidth={1.5} color="#CCCCCC" />
      </View>
    )}
    <View className="flex-1">
      <Pressable
        onPress={handleUploadLogo}
        disabled={isUploadingLogo}
        className="border border-black px-4 py-3 items-center active:opacity-60"
      >
        {isUploadingLogo ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Upload size={18} strokeWidth={1.5} color="#000000" />
            <Text className="text-[14px] text-black">
              {companyLogoUrl ? 'Cambiar logo' : 'Subir logo'}
            </Text>
          </View>
        )}
      </Pressable>
      <Text className="text-[12px] text-[#999999] mt-2">
        PNG o JPG, máx 2MB
      </Text>
    </View>
  </View>
</View>
```

---

### 2. **Invoice Detail Screen (Pantalla de Detalle de Factura)**
📁 **Archivo:** `src/app/invoices/[id].tsx`

#### **Imports (Líneas 1-25):**
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Image,  // ← Componente Image de React Native
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Printer, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { Invoice, InvoiceItem } from '@/lib/invoice-types';
import { formatCurrency } from '@/lib/invoice-helpers';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
```

#### **UI del Logo en Invoice (Líneas 434-443):**
```typescript
{/* Company Header */}
<View className="mb-6 border border-[#E5E5E5] p-4 bg-[#F9FAFB]">
  {currentUser?.empresaLogoUrl && (
    <View className="items-center mb-3">
      <Image
        source={{ uri: currentUser.empresaLogoUrl }}
        style={{ width: 100, height: 100 }}
        resizeMode="contain"
      />
    </View>
  )}
  <Text className="text-[20px] font-bold text-black mb-3 text-center">
    {currentUser?.empresaNombre || currentUser?.nombreNegocio || 'MI EMPRESA'}
  </Text>
  {/* ... resto del header ... */}
</View>
```

---

### 3. **Store (Estado Global)**
📁 **Archivo:** `src/lib/store.ts`

#### **Interface CurrentUser (Líneas 30-47):**
```typescript
export interface CurrentUser {
  id: string;
  email: string;
  nombreNegocio: string;
  plan: string;
  empresaNombre?: string;
  empresaLogoUrl?: string;  // ← Campo del logo
  empresaRtn?: string;
  empresaCai?: string;
  empresaDireccion?: string;
  empresaTelefono?: string;
  empresaEmail?: string;
  tasaImpuesto?: number;
  facturaRangoInicio?: string;
  facturaRangoFin?: string;
  facturaProximoNumero?: string;
  caiFechaVencimiento?: string;
}
```

---

## 🔍 RESUMEN DE UBICACIONES

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `src/app/(tabs)/profile.tsx` | 1-20 | Imports (Image, ImagePicker, ImageIcon) |
| `src/app/(tabs)/profile.tsx` | 113-116 | State variables (companyLogoUrl, isUploadingLogo) |
| `src/app/(tabs)/profile.tsx` | 341-430 | Función handleUploadLogo (upload completo) |
| `src/app/(tabs)/profile.tsx` | 796-837 | UI del logo (preview y botón) |
| `src/app/invoices/[id].tsx` | 1-25 | Imports (Image) |
| `src/app/invoices/[id].tsx` | 434-443 | Display del logo en invoice |
| `src/lib/store.ts` | 30-47 | Interface CurrentUser (empresaLogoUrl) |

---

## ⚠️ PUNTOS CRÍTICOS A REVISAR

### 1. **Imports**
- ✅ `Image` debe venir de `react-native` (NO de `expo-image`)
- ✅ `ImageIcon` viene de `lucide-react-native` (alias para evitar conflicto)
- ✅ `ImagePicker` viene de `expo-image-picker`

### 2. **Props del Image Component**
- ✅ Usar `resizeMode="contain"` (NO `contentFit="contain"`)
- ✅ `source={{ uri: companyLogoUrl }}` para mostrar la imagen

### 3. **Supabase Storage**
- ✅ Bucket: `company-logos`
- ✅ Ruta: `${currentUser.id}/logo.{ext}`
- ✅ Permisos: Público para lectura

### 4. **Base de Datos**
- ✅ Campo: `empresa_logo_url` en tabla `usuarios`
- ✅ Tipo: `TEXT`
- ✅ Nullable: Sí

---

## 🐛 ERRORES COMUNES

### Error: "Unexpected token '<'"
**Causa:** Usar `expo-image` en lugar de `react-native` Image
**Solución:** Cambiar import a `import { Image } from 'react-native';`

### Error: "contentFit is not a valid prop"
**Causa:** `contentFit` es de `expo-image`, no de `react-native`
**Solución:** Usar `resizeMode="contain"` en lugar de `contentFit="contain"`

### Error: "Cannot read property 'publicUrl'"
**Causa:** El bucket no existe o no tiene permisos públicos
**Solución:** Crear bucket `company-logos` en Supabase Storage con acceso público

---

## 📝 NOTAS PARA EL DESARROLLADOR

1. **El código del logo está en 3 archivos principales:**
   - `src/app/(tabs)/profile.tsx` - Upload y preview
   - `src/app/invoices/[id].tsx` - Display en facturas
   - `src/lib/store.ts` - Tipo TypeScript

2. **Dependencias necesarias:**
   - `expo-image-picker` - Para seleccionar imagen
   - `react-native` - Para componente Image (built-in)

3. **Storage en Supabase:**
   - Bucket: `company-logos`
   - Política: Público (lectura)
   - Límite: 2MB
   - Tipos: image/png, image/jpeg, image/jpg

4. **Base de datos:**
   - Tabla: `usuarios`
   - Columna: `empresa_logo_url` (TEXT, nullable)

---

## 🔗 ARCHIVOS COMPLETOS

Para ver el código completo, revisar:
- `src/app/(tabs)/profile.tsx` (líneas 1-1178)
- `src/app/invoices/[id].tsx` (líneas 1-606)
- `src/lib/store.ts` (líneas 30-47)


