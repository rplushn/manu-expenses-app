# MANU - Gastos claros, negocios seguros

App minimalista para control de gastos diarios para pequenos negocios en Centroamerica.

## Estructura

```
src/
  app/
    _layout.tsx         - Root layout con navegacion, auth y tema
    login.tsx           - Pantalla de inicio de sesion
    signup.tsx          - Pantalla de registro
    add-expense.tsx     - Modal para agregar gastos con OCR, notas y foto
    (tabs)/
      _layout.tsx       - Layout de tabs con navegacion inferior
      index.tsx         - Home con resumen del dia
      history.tsx       - Historial con modal de detalle y edicion
      reports.tsx       - Reportes por categoria con PDF
      profile.tsx       - Perfil del usuario
  lib/
    supabase.ts         - Cliente de Supabase
    auth.ts             - Servicio de autenticacion
    store.ts            - Zustand store con Supabase
    ocr.ts              - Servicio de OCR con OpenAI (gpt-4o-mini)
    pdf-generator.ts    - Generador de reportes PDF
    types.ts            - Tipos TypeScript
    cn.ts               - Helper para classNames
```

## Funcionalidades

### Autenticacion
- Registro con email, contrasena y nombre del negocio
- Inicio de sesion con email y contrasena
- Sesion persistente con Supabase Auth
- Cierre de sesion

### Dashboard (Home)
- Selector de periodo: Hoy / Semana / Mes
- Total del periodo con comparacion vs periodo anterior
- Indicador de tendencia (verde = menos gastos, rojo = mas)
- Promedio diario para semana y mes
- Grafica de barras por categoria
- Ultimos 3 gastos del periodo seleccionado

### Agregar Gasto
- Escaneo de recibos con camara o galeria
- OCR automatico con OpenAI Vision (gpt-4o-mini)
- Auto-completado de monto, categoria y proveedor
- **Selector de fecha**: Permite asignar gastos a fechas pasadas (hasta hoy)
- Campo de notas opcional (max 500 caracteres)
- Subida de fotos de recibos a Supabase Storage (bucket: receipt-images)
- 11 categorias: Mercaderia, Servicios, Marketing, Transporte, Operacion, Personal, Instalaciones, Impuestos, Equipamiento, Alimentacion, Otros
- Haptics feedback

### Historial
- Busqueda por nombre de proveedor o categoria
- Lista de gastos con indicadores de notas y recibo
- Modal de detalle al tocar un gasto:
  - Monto, categoria, proveedor
  - Fecha y hora (fecha de negocio + hora de registro)
  - Notas (si existen)
  - Foto del recibo (si existe)
- **Edicion de gastos**: Permite modificar monto, categoria, proveedor, notas y **fecha del gasto**
- Eliminacion con confirmacion

### Reportes
- Selector de periodo interactivo
- Total con comparacion vs periodo anterior
- Tarjetas de estadisticas rapidas:
  - Mayor gasto del periodo
  - Proveedor con mas gastos
- Desglose detallado por categoria con barras animadas
- Exportar reporte a PDF

### Perfil
- Datos del usuario y negocio
- Cierre de sesion

### Sincronizacion
- Gastos se guardan en PostgreSQL via Supabase
- Fotos de recibos suben a bucket "receipt-images"
- Cada usuario solo ve sus propios datos (RLS)
- Indicador de sync en Home

## Variables de Entorno

```env
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=tu_api_key_openai
```

## Base de Datos (Supabase)

### Tabla: usuarios
- id (UUID, PK)
- email (text)
- nombre_negocio (text)
- plan (text: 'gratis' | 'premium')
- created_at (timestamp)

### Tabla: gastos
- id (UUID, PK)
- usuario_id (UUID, FK -> usuarios)
- monto (numeric)
- moneda (text)
- categoria (text)
- proveedor (text)
- **fecha** (date) - Fecha de negocio del gasto (YYYY-MM-DD local), editable por el usuario
- foto_url (text, nullable) - URL de la imagen del recibo
- notas (text, nullable)
- **created_at** (timestamptz) - Timestamp UTC de creación del registro, NO editable

#### Nota sobre fechas:
- `fecha` (`expense_date` en código): Fecha del gasto según el usuario (calendario local). Se usa para filtros de "Hoy", "Semana", "Mes".
- `created_at`: Timestamp UTC de cuando se creó el registro. Solo se usa para mostrar la hora y ordenar cronológicamente.
- Al editar un gasto, solo se modifica `fecha`, nunca `created_at`.

### Storage Buckets
**imagenes-recibos** (privado)
- Estructura: {usuario_id}/receipt_{usuario_id}_{timestamp}.jpg
- URLs firmadas con 7 dias de validez

## Monetizacion (RevenueCat)

### Planes
- **Plan Gratis**: 20 gastos por mes
- **Plan Pro**: Gastos ilimitados (299 LPS / $11.99 USD mensual)

### Configuracion RevenueCat
- Entitlement: "pro"
- Offering: "default"
- Package: "$rc_monthly"
- Productos: pro_monthly (Test Store, App Store, Play Store)

### Logica de Limites
- src/lib/expense-limits.ts controla los limites mensuales
- Usuarios Free: maximo 20 gastos/mes
- Usuarios Pro: gastos ilimitados
- Modal de suscripcion aparece al alcanzar limite

## Diseno

Estilo ultra minimalista inspirado en Uber/Vercel:
- Fondo blanco puro (#FFFFFF)
- Texto negro (#000000) y grises (#666666, #999999)
- Error: #DC2626 (unico color)
- Iconos outline de Lucide
- Sin sombras ni gradientes
- Tipografia system (SF Pro)

## Moneda

Los montos se muestran en Lempiras (L), moneda de Honduras.
