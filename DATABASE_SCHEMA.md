# MANU Database Schema - Supabase

## Overview
Base de datos PostgreSQL en Supabase con Row Level Security (RLS) habilitado.

---

## 1. Tabla: `gastos` (expenses)

### Estructura actual:

```sql
CREATE TABLE public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  monto NUMERIC(12, 2) NOT NULL,
  moneda TEXT, -- Legacy field (parece estar en desuso, se usa currency_code)
  categoria TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  fecha DATE NOT NULL, -- YYYY-MM-DD (fecha del gasto, editable por usuario)
  currency_code TEXT, -- Agregado recientemente para multi-moneda (HNL, USD)
  foto_url TEXT, -- URL de imagen en Supabase Storage
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- Timestamp UTC de creación
);

-- Índices
CREATE INDEX idx_gastos_usuario_id ON public.gastos(usuario_id);
CREATE INDEX idx_gastos_fecha ON public.gastos(fecha DESC);
CREATE INDEX idx_gastos_usuario_fecha ON public.gastos(usuario_id, fecha DESC);
```

### Columnas detalladas:

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary Key, auto-generado |
| `usuario_id` | UUID | NO | Foreign Key → `usuarios.id` |
| `monto` | NUMERIC(12,2) | NO | Monto del gasto |
| `moneda` | TEXT | YES | **Legacy** - Parece estar en desuso |
| `categoria` | TEXT | NO | Categoría del gasto (11 opciones) |
| `proveedor` | TEXT | NO | Nombre del proveedor |
| `fecha` | DATE | NO | Fecha del gasto (YYYY-MM-DD, editable) |
| `currency_code` | TEXT | YES | Código de moneda (HNL, USD) - **Agregado recientemente** |
| `foto_url` | TEXT | YES | URL de recibo en Supabase Storage |
| `notas` | TEXT | YES | Notas adicionales (max 500 chars) |
| `created_at` | TIMESTAMPTZ | NO | Timestamp UTC de creación (no editable) |

### Foreign Keys:
- `usuario_id` → `usuarios.id` (ON DELETE CASCADE)

### Row Level Security (RLS):
- Habilitado: `ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;`
- Políticas: Usuarios solo pueden ver/modificar sus propios gastos

---

## 2. Tabla: `usuarios` (users)

### Estructura actual:

```sql
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre_negocio TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'gratis', -- 'gratis' | 'premium'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Campos de empresa (agregados en migraciones)
  empresa_nombre TEXT, -- Nombre legal de la empresa
  empresa_logo_url TEXT, -- URL del logo en Supabase Storage
  empresa_rtn TEXT, -- RTN (Tax ID) para facturas
  empresa_cai TEXT, -- CAI para generación de facturas
  empresa_direccion TEXT, -- Dirección de la empresa
  empresa_telefono TEXT, -- Teléfono de la empresa
  empresa_email TEXT, -- Email de la empresa
  tasa_impuesto NUMERIC(5, 4) DEFAULT 0.15, -- Tasa de impuesto (default 15%)
  factura_rango_inicio TEXT, -- Rango inicio de facturas
  factura_rango_fin TEXT, -- Rango fin de facturas
  factura_proximo_numero TEXT, -- Próximo número de factura
  cai_fecha_vencimiento DATE, -- Fecha de vencimiento del CAI
  
  -- Multi-moneda (agregado recientemente)
  currency_code TEXT DEFAULT 'HNL' -- Moneda principal del usuario
);
```

### Columnas detalladas:

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary Key, referencia `auth.users.id` |
| `email` | TEXT | NO | Email del usuario |
| `nombre_negocio` | TEXT | NO | Nombre del negocio/marca |
| `plan` | TEXT | NO | Plan de suscripción ('gratis' \| 'premium') |
| `created_at` | TIMESTAMPTZ | NO | Fecha de creación |
| `empresa_nombre` | TEXT | YES | Nombre legal de la empresa |
| `empresa_logo_url` | TEXT | YES | URL del logo en Storage |
| `empresa_rtn` | TEXT | YES | RTN (Tax ID) |
| `empresa_cai` | TEXT | YES | CAI para facturas |
| `empresa_direccion` | TEXT | YES | Dirección |
| `empresa_telefono` | TEXT | YES | Teléfono |
| `empresa_email` | TEXT | YES | Email de empresa |
| `tasa_impuesto` | NUMERIC(5,4) | YES | Tasa de impuesto (default 0.15) |
| `factura_rango_inicio` | TEXT | YES | Rango inicio facturas |
| `factura_rango_fin` | TEXT | YES | Rango fin facturas |
| `factura_proximo_numero` | TEXT | YES | Próximo número factura |
| `cai_fecha_vencimiento` | DATE | YES | Vencimiento CAI |
| `currency_code` | TEXT | YES | Moneda principal (HNL, USD) |

### Foreign Keys:
- `id` → `auth.users.id` (ON DELETE CASCADE)

### Row Level Security (RLS):
- Habilitado
- Políticas: Usuarios solo pueden ver/modificar su propio perfil

---

## 3. Autenticación y Sesión

### Tabla: `auth.users` (Supabase Auth)
- **No se modifica directamente** - Gestionada por Supabase Auth
- Contiene: `id`, `email`, `encrypted_password`, `user_metadata`, etc.
- Las contraseñas están **encriptadas por Supabase** (bcrypt)
- Sesiones se almacenan en `auth.sessions` (Supabase interno)

### Flujo de autenticación:
1. Usuario se registra → `supabase.auth.signUp()` crea registro en `auth.users`
2. Trigger automático crea perfil en `usuarios` (si existe)
3. Sesión se persiste en AsyncStorage (React Native)
4. Token JWT se almacena localmente y se refresca automáticamente

### Variables de entorno:
```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=... # Clave pública (no encripta datos)
```

---

## 4. Tablas de Conexiones Externas

### ❌ NO EXISTE tabla `quickbooks_connections` o similar

**Confirmación:** No hay tablas para almacenar conexiones con servicios externos como QuickBooks.

**Necesario para integración:**
- Crear tabla `quickbooks_connections` o `external_integrations`
- Campos sugeridos: `usuario_id`, `service_name`, `access_token`, `refresh_token`, `expires_at`, `realm_id`, etc.

---

## 5. Encriptación de Datos Sensibles

### Estado actual:
- **Contraseñas**: Encriptadas por Supabase Auth (bcrypt) en `auth.users`
- **Datos en `usuarios` y `gastos`**: **NO encriptados** (plain text)
- **Tokens/API Keys**: No se almacenan actualmente

### Recomendaciones para QuickBooks:
- **Access Tokens**: Deben encriptarse antes de guardar
- **Refresh Tokens**: Deben encriptarse antes de guardar
- Opciones:
  1. **Supabase Vault** (recomendado): Encriptación nativa de Supabase
  2. **pgcrypto**: Extensión PostgreSQL para encriptación
  3. **Application-level**: Encriptar en el cliente antes de insertar

---

## 6. Columnas de Sincronización

### ❌ NO EXISTEN columnas de tracking de sync

**Columnas faltantes en `gastos`:**
- `qb_expense_id` TEXT - ID del gasto en QuickBooks
- `sync_status` TEXT - Estado de sincronización ('pending', 'synced', 'error')
- `last_sync_at` TIMESTAMPTZ - Última vez que se sincronizó
- `sync_error` TEXT - Mensaje de error si falló la sync

**Columnas faltantes en `usuarios`:**
- `qb_connection_status` TEXT - Estado de conexión QB
- `qb_last_sync_at` TIMESTAMPTZ - Última sync general
- `qb_realm_id` TEXT - Realm ID de QuickBooks

---

## 7. Storage Buckets (Supabase Storage)

### Buckets existentes:
1. **`receipt-images`** (privado)
   - Estructura: `{usuario_id}/receipt_{usuario_id}_{timestamp}.jpg`
   - URLs firmadas con 7 días de validez
   - RLS: Usuarios solo ven sus propias imágenes

2. **`company-logos`** (público)
   - Estructura: `{usuario_id}/logo.{ext}`
   - Acceso público para lectura
   - RLS: Usuarios solo pueden subir/actualizar sus propios logos

---

## 8. Resumen para Integración QuickBooks

### ✅ Lo que existe:
- Tabla `gastos` con estructura básica
- Tabla `usuarios` con perfil completo
- RLS habilitado y funcionando
- Autenticación segura con Supabase Auth

### ❌ Lo que falta:
1. **Tabla de conexiones**: `quickbooks_connections` o similar
2. **Columnas de sync en `gastos`**:
   - `qb_expense_id`
   - `sync_status`
   - `last_sync_at`
   - `sync_error`
3. **Encriptación de tokens**: Sistema para encriptar access/refresh tokens
4. **Columnas de sync en `usuarios`**:
   - `qb_connection_status`
   - `qb_last_sync_at`
   - `qb_realm_id`

### 📋 Migración sugerida:

```sql
-- 1. Crear tabla de conexiones QuickBooks
CREATE TABLE public.quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Encriptado
  refresh_token TEXT NOT NULL, -- Encriptado
  expires_at TIMESTAMPTZ NOT NULL,
  realm_id TEXT NOT NULL,
  company_name TEXT,
  connection_status TEXT DEFAULT 'active' CHECK (connection_status IN ('active', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id)
);

-- 2. Agregar columnas de sync a gastos
ALTER TABLE public.gastos
ADD COLUMN IF NOT EXISTS qb_expense_id TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- 3. Agregar columnas de sync a usuarios
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS qb_connection_status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS qb_last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qb_realm_id TEXT;

-- 4. Índices para performance
CREATE INDEX idx_gastos_sync_status ON public.gastos(sync_status);
CREATE INDEX idx_gastos_qb_expense_id ON public.gastos(qb_expense_id);
CREATE INDEX idx_qb_connections_usuario_id ON public.quickbooks_connections(usuario_id);

-- 5. Habilitar RLS en nueva tabla
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
CREATE POLICY "Users can view own QB connections"
  ON public.quickbooks_connections FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own QB connections"
  ON public.quickbooks_connections FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own QB connections"
  ON public.quickbooks_connections FOR UPDATE
  USING (auth.uid() = usuario_id);
```

---

## Notas Importantes

1. **Campo `moneda` en `gastos`**: Parece ser legacy. El código actual usa `currency_code`.
2. **Fechas**: `fecha` es DATE (sin timezone), `created_at` es TIMESTAMPTZ (UTC).
3. **RLS**: Todas las tablas tienen RLS habilitado - importante mantenerlo para seguridad.
4. **Encriptación**: Considerar usar Supabase Vault para tokens de QuickBooks.

