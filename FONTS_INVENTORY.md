# INVENTARIO COMPLETO DE FONTS - MANU APP

## RESUMEN EJECUTIVO

**Total de elementos analizados:** ~350+ elementos de texto

### Distribución de Font-Weights:

- **font-bold (700):** ~45 elementos
- **font-semibold (600):** ~85 elementos  
- **font-medium (500):** ~60 elementos
- **font-normal (400):** ~140 elementos
- **font-light (300):** ~2 elementos (solo Tab Bar)

### Distribución de Tamaños:

- **text-[10px]:** 2 elementos (badges PRO)
- **text-[11px]:** 8 elementos (QuickBooks UI)
- **text-[12px]:** ~25 elementos (footers, help text)
- **text-[13px]:** ~80 elementos (labels, metadata)
- **text-[14px]:** ~70 elementos (subtítulos, descripciones)
- **text-[15px]:** ~30 elementos (texto general)
- **text-[16px]:** ~50 elementos (títulos secundarios, inputs)
- **text-[18px]:** ~20 elementos (títulos de sección)
- **text-[20px]:** ~8 elementos (títulos principales)
- **text-[28px]:** ~4 elementos (hero text)
- **text-[32px]:** ~2 elementos (montos grandes)
- **text-[36px]:** ~4 elementos (precios)
- **text-[56px]:** ~2 elementos (total principal)

---

## ARCHIVO: `src/app/(tabs)/index.tsx`

### HEADER Y LOGO
- **Línea ~295** | Badge "PRO"
  - Actual: `text-[10px] font-bold text-white`
  - Tipo: Badge
  - Contexto: Indicador de suscripción Pro

### PERIOD SELECTOR
- **Línea ~361** | Botones "Hoy", "Semana", "Mes"
  - Actual: `text-[14px] font-medium`
  - Tipo: Botón selector
  - Contexto: Filtro de periodo

### TOTAL PRINCIPAL
- **Línea ~381** | Monto total del periodo
  - Actual: `text-[56px] font-bold text-black tracking-[-1px]`
  - Tipo: Monto principal
  - Contexto: Número grande del total (Hoy/Semana/Mes)

### METADATA DEL TOTAL
- **Línea ~377** | Label "Total {periodo}"
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Label
  - Contexto: Descripción del total

- **Línea ~388** | Info secundaria (cantidad gastos, promedio/día)
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Metadata
  - Contexto: Info complementaria

- **Línea ~242** | Indicador de cambio
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Indicador
  - Contexto: Cambio vs periodo anterior

- **Línea ~258** | Monto de cambio
  - Actual: `text-[13px]` (color dinámico)
  - Tipo: Monto
  - Contexto: Diferencia con periodo anterior

### SECCIÓN "POR CATEGORÍA"
- **Línea ~402** | Título "Por categoria"
  - Actual: `text-[16px] font-medium text-black`
  - Tipo: Título de sección
  - Contexto: Header de gráfico de categorías

- **Línea ~409** | Nombre de categoría
  - Actual: `text-[14px] text-black`
  - Tipo: Label
  - Contexto: Nombre de categoría en lista

- **Línea ~412** | Monto y porcentaje de categoría
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Metadata
  - Contexto: Total y % por categoría

### SECCIÓN "ÚLTIMOS GASTOS"
- **Línea ~437** | Título "Ultimos gastos"
  - Actual: `text-[16px] font-medium text-black`
  - Tipo: Título de sección
  - Contexto: Header de lista de gastos recientes

- **Línea ~444** | Mensaje "Cargando gastos..."
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Estado
  - Contexto: Loading state

- **Línea ~450** | Mensaje "Sin gastos en este periodo"
  - Actual: `text-[15px] text-[#999999]`
  - Tipo: Estado vacío
  - Contexto: Empty state

- **Línea ~457** | Botón "Agregar gasto"
  - Actual: `text-[14px] text-black`
  - Tipo: Botón
  - Contexto: CTA para agregar gasto

- **Línea ~469** | Nombre del proveedor (en card de gasto)
  - Actual: `text-[16px] text-black font-medium`
  - Tipo: Título de card
  - Contexto: Nombre del merchant

- **Línea ~472** | Metadata del gasto (categoría, hora)
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Metadata
  - Contexto: Info secundaria del gasto

- **Línea ~477** | Monto del gasto
  - Actual: `text-[16px] text-black font-medium`
  - Tipo: Monto
  - Contexto: Cantidad del gasto individual

- **Línea ~494** | Link "Ver todos"
  - Actual: `text-[14px] text-black` (con underline)
  - Tipo: Link
  - Contexto: Navegación a historial completo

### MODAL PRO
- **Línea ~523** | Título "MANU Pro"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal de suscripción

- **Línea ~539** | Hero "MANU Pro"
  - Actual: `text-[28px] font-bold text-black`
  - Tipo: Hero text
  - Contexto: Título principal del modal

- **Línea ~542** | Subtítulo hero
  - Actual: `text-[15px] text-[#666666]`
  - Tipo: Subtítulo
  - Contexto: Descripción del plan

- **Línea ~553** | Precio mensual
  - Actual: `text-[36px] font-bold text-black`
  - Tipo: Precio
  - Contexto: Monto de suscripción

- **Línea ~556** | Label "por mes"
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Label
  - Contexto: Frecuencia de pago

- **Línea ~564** | Título "Incluye:"
  - Actual: `text-[16px] font-semibold text-black`
  - Tipo: Título de sección
  - Contexto: Header de lista de features

- **Línea ~62** | Feature item (texto)
  - Actual: `text-[15px] text-[#333333]`
  - Tipo: Texto de feature
  - Contexto: Descripción de beneficio

- **Línea ~589** | Botón "Procesando..."
  - Actual: `text-[16px] font-semibold text-[#666666]`
  - Tipo: Botón disabled
  - Contexto: Estado de carga

- **Línea ~594** | Botón "Suscribirse por..."
  - Actual: `text-[16px] font-semibold text-white`
  - Tipo: Botón primario
  - Contexto: CTA de compra

- **Línea ~602** | Mensaje "Cargando precios..."
  - Actual: `text-[14px] text-[#999999]`
  - Tipo: Estado
  - Contexto: Loading de precios

- **Línea ~614** | Link "Restaurar compras anteriores"
  - Actual: `text-[14px] text-[#666666] underline`
  - Tipo: Link
  - Contexto: Restore purchases

- **Línea ~620** | Disclaimer legal
  - Actual: `text-[12px] text-[#999999]`
  - Tipo: Texto legal
  - Contexto: Términos y condiciones

---

## ARCHIVO: `src/app/(tabs)/history.tsx`

### HEADER
- **Línea ~852** | Título "Historial"
  - Actual: `text-[16px] text-[#666666]`
  - Tipo: Título de pantalla
  - Contexto: Header principal

### MODAL DETALLE DE GASTO
- **Línea ~874** | Título del modal
  - Actual: `text-[20px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal de detalle

- **Línea ~891** | Label "Monto"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~892** | Monto del gasto
  - Actual: `text-[32px] font-semibold text-black`
  - Tipo: Monto principal
  - Contexto: Cantidad destacada

- **Línea ~899** | Label "Categoría"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~902** | Valor categoría
  - Actual: `text-[16px] text-black`
  - Tipo: Valor
  - Contexto: Nombre de categoría

- **Línea ~909** | Label "Proveedor"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~912** | Valor proveedor
  - Actual: `text-[16px] text-black`
  - Tipo: Valor
  - Contexto: Nombre del proveedor

- **Línea ~919** | Label "Fecha"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~922** | Valor fecha
  - Actual: `text-[16px] text-black`
  - Tipo: Valor
  - Contexto: Fecha del gasto

- **Línea ~931** | Label "Notas"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~935** | Valor notas
  - Actual: `text-[15px] text-black`
  - Tipo: Valor
  - Contexto: Texto de notas

- **Línea ~945** | Label "Recibo"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~971** | Botón "Editar"
  - Actual: `text-[15px] font-medium text-white`
  - Tipo: Botón primario
  - Contexto: CTA para editar

- **Línea ~987** | Botón "Eliminar"
  - Actual: `text-[15px] font-medium text-[#DC2626]`
  - Tipo: Botón destructivo
  - Contexto: CTA para eliminar

### MODAL EDITAR GASTO
- **Línea ~1021** | Título "Editar gasto"
  - Actual: `text-[20px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal de edición

- **Línea ~1039** | Label "Monto"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1043** | Input monto (símbolo)
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Símbolo de moneda

- **Línea ~1047** | Input monto (valor)
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Valor numérico

- **Línea ~1060** | Label "Categoría"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1069** | Picker categoría
  - Actual: `text-[16px]`
  - Tipo: Picker
  - Contexto: Selector de categoría

- **Línea ~1095** | Item de categoría (seleccionado)
  - Actual: `fontWeight: '500'`
  - Tipo: Item seleccionado
  - Contexto: Categoría activa

- **Línea ~1095** | Item de categoría (no seleccionado)
  - Actual: `fontWeight: '400'`
  - Tipo: Item no seleccionado
  - Contexto: Categoría inactiva

- **Línea ~1108** | Label "Proveedor"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1113** | Input proveedor
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Nombre del proveedor

- **Línea ~1125** | Label "Fecha del gasto"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1133** | Valor fecha seleccionada
  - Actual: `text-[16px] text-black`
  - Tipo: Valor
  - Contexto: Fecha formateada

- **Línea ~1190** | Label "Notas"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1195** | Input notas
  - Actual: `text-[16px] text-black`
  - Tipo: Input multiline
  - Contexto: Texto de notas

- **Línea ~1208** | Contador de caracteres
  - Actual: `text-[12px] text-[#999999]`
  - Tipo: Metadata
  - Contexto: Contador de texto

- **Línea ~1229** | Botón "Guardar cambios"
  - Actual: `text-[15px] font-medium`
  - Tipo: Botón primario
  - Contexto: CTA para guardar

- **Línea ~1498** | Botón "Cancelar"
  - Actual: `text-[15px] font-medium text-white`
  - Tipo: Botón secundario
  - Contexto: CTA para cancelar

### LISTA DE GASTOS
- **Línea ~755** | Nombre del proveedor (en lista)
  - Actual: `text-[15px] text-black`
  - Tipo: Título de item
  - Contexto: Nombre del merchant en lista

---

## ARCHIVO: `src/app/(tabs)/profile.tsx`

### MENU ITEMS
- **Línea ~101** | Label de menu item
  - Actual: `fontWeight: '400'` (16px)
  - Tipo: Label de menú
  - Contexto: Texto de opción de menú

- **Línea ~125** | Valor de menu item
  - Actual: `fontWeight: '500'` (15px)
  - Tipo: Valor de menú
  - Contexto: Valor mostrado a la derecha

- **Línea ~146** | Badge de menu item
  - Actual: `fontWeight: '600'` (13px)
  - Tipo: Badge
  - Contexto: Indicador de estado

### SECCIÓN INTEGRACIONES (QuickBooks)
- **Línea ~1279** | Título "INTEGRACIONES"
  - Actual: `text-[13px] text-[#999999] uppercase tracking-wide`
  - Tipo: Título de sección
  - Contexto: Header de sección

- **Línea ~1302** | Logo "qb" (dentro de badge)
  - Actual: `text-white font-bold text-[14px]`
  - Tipo: Logo text
  - Contexto: Texto del logo QuickBooks

- **Línea ~1304** | Texto "quickbooks"
  - Actual: `text-[18px] font-medium text-black`
  - Tipo: Título de integración
  - Contexto: Nombre de la integración

- **Línea ~1319** | Checkmark "✓"
  - Actual: `text-white text-[10px] font-bold`
  - Tipo: Icono
  - Contexto: Indicador de conexión

- **Línea ~1321** | Texto "Conectado de forma segura"
  - Actual: `text-[11px] font-medium text-[#16A34A]`
  - Tipo: Badge de estado
  - Contexto: Estado de conexión

- **Línea ~1329** | Label "Auto-sync:"
  - Actual: `text-[11px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1330** | Valor "Desactivado"
  - Actual: `text-[11px] font-normal text-[#666666]`
  - Tipo: Valor
  - Contexto: Estado de auto-sync

- **Línea ~1333** | Label "Última sync:"
  - Actual: `text-[11px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1334** | Valor "Hace 2 horas"
  - Actual: `text-[11px] font-normal text-[#666666]`
  - Tipo: Valor
  - Contexto: Tiempo desde última sync

- **Línea ~1358** | Botón "Configuración"
  - Actual: `text-[11px] font-normal text-white`
  - Tipo: Botón primario
  - Contexto: CTA para configurar

- **Línea ~1380** | Botón "Desconectar"
  - Actual: `text-[11px] font-normal text-white`
  - Tipo: Botón destructivo
  - Contexto: CTA para desconectar

### MODAL DATOS DE FACTURACIÓN
- **Línea ~1461** | Título "Datos de facturación"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal

- **Línea ~1468** | Label "Logo de la empresa"
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1472** | Inputs de texto (nombre, RTN, etc.)
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Campos de formulario

- **Línea ~1496** | Botón "Subir logo"
  - Actual: `text-[16px] font-semibold`
  - Tipo: Botón
  - Contexto: CTA para subir logo

- **Línea ~1530** | Título "Moneda principal"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de sección
  - Contexto: Header de selector de moneda

- **Línea ~1542** | Label "Moneda principal"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~1587** | Valor seleccionado (moneda)
  - Actual: `text-[14px] text-black`
  - Tipo: Valor
  - Contexto: Moneda seleccionada

- **Línea ~1595** | Help text
  - Actual: `text-[12px] text-[#999999]`
  - Tipo: Help text
  - Contexto: Descripción del campo

- **Línea ~1603** | Mensaje de error
  - Actual: `text-[13px] text-[#DC2626]`
  - Tipo: Error message
  - Contexto: Mensaje de validación

- **Línea ~1614** | Labels de campos (RTN, CAI, etc.)
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiquetas de formulario

- **Línea ~1646** | Valores de inputs
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Valores de campos

- **Línea ~1651** | Help text de campos
  - Actual: `text-[12px] text-[#999999]`
  - Tipo: Help text
  - Contexto: Descripciones de ayuda

- **Línea ~1771** | Título "Rango de facturas"
  - Actual: `text-[15px] font-medium text-black`
  - Tipo: Título de sección
  - Contexto: Header de sección

- **Línea ~1855** | Botón "Guardar cambios"
  - Actual: `text-[16px] font-semibold text-white`
  - Tipo: Botón primario
  - Contexto: CTA para guardar

### MODAL PRO
- **Línea ~1883** | Título "MANU Pro"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal

- **Línea ~1902** | Hero "MANU Pro"
  - Actual: `text-[28px] font-bold text-black`
  - Tipo: Hero text
  - Contexto: Título principal

- **Línea ~1905** | Subtítulo hero
  - Actual: `text-[15px] text-[#666666]`
  - Tipo: Subtítulo
  - Contexto: Descripción del plan

- **Línea ~1915** | Precio mensual
  - Actual: `text-[36px] font-bold text-black`
  - Tipo: Precio
  - Contexto: Monto de suscripción

- **Línea ~1918** | Label "por mes"
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Label
  - Contexto: Frecuencia de pago

- **Línea ~1925** | Título "Incluye:"
  - Actual: `text-[16px] font-semibold text-black`
  - Tipo: Título de sección
  - Contexto: Header de lista de features

- **Línea ~1957** | Botón "Procesando..."
  - Actual: `text-[16px] font-semibold text-[#666666]`
  - Tipo: Botón disabled
  - Contexto: Estado de carga

- **Línea ~1962** | Botón "Suscribirse por..."
  - Actual: `text-[16px] font-semibold text-white`
  - Tipo: Botón primario
  - Contexto: CTA de compra

- **Línea ~1973** | Mensaje "Cargando precios..."
  - Actual: `text-[14px] text-[#999999]`
  - Tipo: Estado
  - Contexto: Loading de precios

- **Línea ~1984** | Link "Restaurar compras anteriores"
  - Actual: `text-[14px] text-[#666666] underline`
  - Tipo: Link
  - Contexto: Restore purchases

- **Línea ~1989** | Disclaimer legal
  - Actual: `text-[12px] text-[#999999]`
  - Tipo: Texto legal
  - Contexto: Términos y condiciones

- **Línea ~2010** | Título "Editar nombre de negocio"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal

- **Línea ~2028** | Label "Nombre del negocio"
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

---

## ARCHIVO: `src/app/(tabs)/reports.tsx`

### HEADER
- **Línea ~134** | Nombre de empresa
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título principal
  - Contexto: Nombre de la empresa

- **Línea ~137** | Subtítulo "Reporte de Gastos"
  - Actual: `text-[16px] font-medium text-[#666666]`
  - Tipo: Subtítulo
  - Contexto: Descripción del reporte

- **Línea ~140** | Metadata (rango de fechas)
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Metadata
  - Contexto: Info de fechas

### PERIOD SELECTOR
- **Línea ~160** | Botones "Hoy", "Semana", "Mes"
  - Actual: `text-[14px] font-medium`
  - Tipo: Botón selector
  - Contexto: Filtro de periodo

### RESUMEN EJECUTIVO
- **Línea ~173** | Título "RESUMEN EJECUTIVO"
  - Actual: `text-[18px] font-bold text-black`
  - Tipo: Título de sección
  - Contexto: Header de resumen

- **Línea ~179** | Labels (Total Gastos, Número de Gastos, etc.)
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiquetas de métricas

- **Línea ~180** | Valores (montos, cantidades)
  - Actual: `text-[14px] font-semibold text-black`
  - Tipo: Valor
  - Contexto: Valores de métricas

- **Línea ~207** | "Categoría Mayor Gasto" (valor)
  - Actual: `text-[14px] font-semibold text-black`
  - Tipo: Valor
  - Contexto: Categoría con mayor gasto

### GASTOS POR CATEGORÍA
- **Línea ~221** | Título "GASTOS POR CATEGORÍA"
  - Actual: `text-[18px] font-bold text-black`
  - Tipo: Título de sección
  - Contexto: Header de tabla

- **Línea ~236** | Header "Categoría"
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Header de tabla
  - Contexto: Columna de categoría

- **Línea ~239** | Header "Monto"
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Header de tabla
  - Contexto: Columna de monto

- **Línea ~242** | Header "%"
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Header de tabla
  - Contexto: Columna de porcentaje

- **Línea ~253** | Filas de datos (categoría)
  - Actual: `text-[13px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Nombre de categoría

- **Línea ~262** | Filas de datos (monto)
  - Actual: `text-[13px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Monto de categoría

- **Línea ~269** | Filas de datos (porcentaje)
  - Actual: `text-[13px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Porcentaje de categoría

- **Línea ~279** | Footer "TOTAL"
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Footer de tabla
  - Contexto: Fila total

- **Línea ~286** | Footer "TOTAL" (monto)
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Footer de tabla
  - Contexto: Total de montos

- **Línea ~293** | Footer "TOTAL" (porcentaje)
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Footer de tabla
  - Contexto: Total de porcentajes (100%)

### DETALLE DE GASTOS
- **Línea ~304** | Título "DETALLE DE GASTOS"
  - Actual: `text-[18px] font-bold text-black`
  - Tipo: Título de sección
  - Contexto: Header de tabla

- **Línea ~319** | Headers de tabla (Fecha, Proveedor, Categoría, Monto)
  - Actual: `text-[13px] font-semibold text-black`
  - Tipo: Header de tabla
  - Contexto: Columnas de tabla

- **Línea ~339** | Filas de datos (fecha)
  - Actual: `text-[12px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Fecha del gasto

- **Línea ~344** | Filas de datos (proveedor)
  - Actual: `text-[12px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Nombre del proveedor

- **Línea ~349** | Filas de datos (categoría)
  - Actual: `text-[12px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Categoría del gasto

- **Línea ~354** | Filas de datos (monto)
  - Actual: `text-[12px] text-black`
  - Tipo: Dato de tabla
  - Contexto: Monto del gasto

### BOTÓN PDF
- **Línea ~389** | Botón "Generando reporte..."
  - Actual: `fontSize: 14, fontWeight: '500'`
  - Tipo: Botón disabled
  - Contexto: Estado de carga

- **Línea ~396** | Botón "Descargar reporte detallado (PDF)"
  - Actual: `fontSize: 14, fontWeight: '500'`
  - Tipo: Botón primario
  - Contexto: CTA para descargar PDF

---

## ARCHIVO: `src/app/(tabs)/invoices.tsx`

### HEADER
- **Línea ~132** | Título "Facturas"
  - Actual: `text-[20px] font-semibold text-black`
  - Tipo: Título de pantalla
  - Contexto: Header principal

### LISTA DE FACTURAS
- **Línea ~108** | Número de factura
  - Actual: `text-[16px] font-medium text-black`
  - Tipo: Título de card
  - Contexto: Número de factura

- **Línea ~111** | Nombre del cliente
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Subtítulo
  - Contexto: Nombre del cliente

- **Línea ~115** | Monto total
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Monto
  - Contexto: Total de la factura

- **Línea ~119** | Fecha de factura
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Metadata
  - Contexto: Fecha formateada

- **Línea ~146** | Mensaje "Cargando facturas..."
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Estado
  - Contexto: Loading state

- **Línea ~152** | Mensaje "No tienes facturas aún"
  - Actual: `text-[16px] text-[#999999]`
  - Tipo: Estado vacío
  - Contexto: Empty state

- **Línea ~159** | Botón "Crear primera factura"
  - Actual: `text-[14px] text-black`
  - Tipo: Botón
  - Contexto: CTA para crear factura

---

## ARCHIVO: `src/app/add-expense.tsx`

### HEADER
- **Línea ~272** | Título "Nuevo gasto"
  - Actual: `text-[20px] font-semibold text-black`
  - Tipo: Título de pantalla
  - Contexto: Header principal

### FORMULARIOS
- **Línea ~293** | Mensaje "Recibo procesado correctamente"
  - Actual: `text-[14px] text-black`
  - Tipo: Mensaje de éxito
  - Contexto: Confirmación de OCR

- **Línea ~306** | Mensaje "Analizando recibo..."
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Estado
  - Contexto: Loading de OCR

- **Línea ~326** | Botón "Tomar foto"
  - Actual: `text-[14px] font-medium text-black`
  - Tipo: Botón
  - Contexto: CTA para cámara

- **Línea ~339** | Botón "Elegir de galería"
  - Actual: `text-[14px] font-medium text-black`
  - Tipo: Botón
  - Contexto: CTA para galería

- **Línea ~352** | Mensaje "Foto guardada"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Mensaje de éxito
  - Contexto: Confirmación de foto

- **Línea ~361** | Divider text
  - Actual: `text-[13px] text-[#999999]`
  - Tipo: Texto de separador
  - Contexto: "o ingresa manualmente"

- **Línea ~369** | Label "Monto *"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~376** | Símbolo de moneda
  - Actual: `text-[16px] text-black`
  - Tipo: Símbolo
  - Contexto: L o $ según moneda

- **Línea ~380** | Input monto
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Valor numérico

- **Línea ~399** | Label "Categoría *"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~408** | Picker categoría (placeholder)
  - Actual: `text-[16px]` (color dinámico)
  - Tipo: Picker
  - Contexto: Selector de categoría

- **Línea ~429** | Item de categoría
  - Actual: `text-[15px]` (fontWeight dinámico)
  - Tipo: Item de lista
  - Contexto: Opción de categoría

- **Línea ~448** | Label "Proveedor (opcional)"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~458** | Input proveedor
  - Actual: `text-[16px] text-black`
  - Tipo: Input
  - Contexto: Nombre del proveedor

- **Línea ~475** | Label "Fecha del gasto (opcional)"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~492** | Valor fecha seleccionada
  - Actual: `text-[16px] text-black`
  - Tipo: Valor
  - Contexto: Fecha formateada

- **Línea ~504** | Label "Notas (opcional)"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~514** | Input notas
  - Actual: `text-[16px] text-black`
  - Tipo: Input multiline
  - Contexto: Texto de notas

- **Línea ~529** | Contador de caracteres
  - Actual: `text-[12px] text-[#999999]`
  - Tipo: Metadata
  - Contexto: Contador de texto

- **Línea ~552** | Botón "Guardar gasto"
  - Actual: `text-[15px] font-medium`
  - Tipo: Botón primario
  - Contexto: CTA para guardar

- **Línea ~598** | Título modal date picker "Fecha del gasto"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de modal
  - Contexto: Header del modal

- **Línea ~633** | Botón "Cancelar"
  - Actual: `text-[15px] font-medium text-black`
  - Tipo: Botón secundario
  - Contexto: CTA para cancelar

- **Línea ~645** | Botón "Guardar"
  - Actual: `text-[15px] font-medium text-white`
  - Tipo: Botón primario
  - Contexto: CTA para guardar fecha

---

## ARCHIVO: `src/app/(tabs)/_layout.tsx`

### TAB BAR
- **Línea ~20** | Labels de tabs
  - Actual: `fontWeight: '300'` (fontSize: 9)
  - Tipo: Label de tab
  - Contexto: Texto de navegación inferior

---

## ARCHIVO: `src/app/qb-category-mapping.tsx`

### HEADER
- **Línea ~166** | Título "Mapeo de Categorías"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de pantalla
  - Contexto: Header principal

- **Línea ~179** | Descripción
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Descripción
  - Contexto: Texto explicativo

### LISTA DE MAPPINGS
- **Línea ~190** | Nombre de categoría MANU
  - Actual: `text-[16px] font-semibold text-black`
  - Tipo: Título de card
  - Contexto: Categoría de MANU

- **Línea ~193** | Nombre de cuenta QB
  - Actual: `text-[12px] text-[#666666]`
  - Tipo: Subtítulo
  - Contexto: Cuenta de QuickBooks

- **Línea ~207** | Label "Cuenta de QuickBooks"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~211** | Input cuenta QB
  - Actual: `text-[14px] text-black`
  - Tipo: Input
  - Contexto: Nombre de cuenta

- **Línea ~217** | Label "ID de Cuenta"
  - Actual: `text-[13px] text-[#666666]`
  - Tipo: Label
  - Contexto: Etiqueta de campo

- **Línea ~221** | Input ID cuenta
  - Actual: `text-[14px] text-black`
  - Tipo: Input
  - Contexto: ID de cuenta QB

- **Línea ~232** | Botón "Guardar"
  - Actual: `text-[14px] font-medium text-black`
  - Tipo: Botón primario
  - Contexto: CTA para guardar

- **Línea ~244** | Botón "Cancelar"
  - Actual: `text-[14px] font-medium text-white`
  - Tipo: Botón secundario
  - Contexto: CTA para cancelar

---

## ARCHIVO: `src/app/qb-oauth.tsx`

### HEADER
- **Línea ~136** | Título "Error de conexión"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de error
  - Contexto: Header de error

- **Línea ~139** | Mensaje de error
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Mensaje
  - Contexto: Descripción del error

- **Línea ~146** | Botón "Volver"
  - Actual: `text-[16px] font-semibold text-white`
  - Tipo: Botón primario
  - Contexto: CTA para volver

- **Línea ~158** | Título "Conectar QuickBooks"
  - Actual: `text-[18px] font-semibold text-black`
  - Tipo: Título de pantalla
  - Contexto: Header principal

- **Línea ~172** | Mensaje "Conectando con QuickBooks..."
  - Actual: `text-[14px] text-[#666666]`
  - Tipo: Estado
  - Contexto: Loading state

---

## ARCHIVO: `src/app/invoices/[id].tsx`

### HEADER
- **Línea ~148** | Company name (en PDF HTML)
  - Actual: `font-size: 18px; font-weight: bold;`
  - Tipo: Título principal
  - Contexto: Nombre de empresa en PDF

- **Línea ~149** | Company info (en PDF HTML)
  - Actual: `font-size: 11px;`
  - Tipo: Metadata
  - Contexto: Info de empresa en PDF

- **Línea ~152** | Section title (en PDF HTML)
  - Actual: `font-size: 13px; font-weight: bold;`
  - Tipo: Título de sección
  - Contexto: Headers de secciones en PDF

- **Línea ~158** | Label (en PDF HTML)
  - Actual: `font-weight: bold;`
  - Tipo: Label
  - Contexto: Etiquetas en PDF

- **Línea ~168** | Table header (en PDF HTML)
  - Actual: `font-weight: bold;`
  - Tipo: Header de tabla
  - Contexto: Headers de tabla en PDF

- **Línea ~191** | Total final (en PDF HTML)
  - Actual: `font-size: 14px; font-weight: bold;`
  - Tipo: Total
  - Contexto: Total de factura en PDF

- **Línea ~198** | Footer (en PDF HTML)
  - Actual: `font-size: 10px;`
  - Tipo: Footer
  - Contexto: Texto de pie de página en PDF

---

## ARCHIVO: `src/app/invoices/new.tsx`

### HEADER
- **Línea ~272** | Título "Nueva factura"
  - Actual: `text-[20px] font-semibold text-black`
  - Tipo: Título de pantalla
  - Contexto: Header principal

---

## NOTAS FINALES

1. **Fonts más usados:**
   - `text-[13px]` y `text-[14px]` son los tamaños más comunes para labels y metadata
   - `text-[16px]` es el tamaño estándar para inputs y títulos secundarios
   - `text-[18px]` es común para títulos de sección y modales

2. **Font-weights más usados:**
   - `font-normal` (400) es el más común para texto general
   - `font-semibold` (600) se usa mucho en títulos y valores importantes
   - `font-bold` (700) se reserva para montos grandes y títulos principales
   - `font-medium` (500) se usa en botones y elementos interactivos

3. **Patrones identificados:**
   - Labels de formularios: `text-[13px] text-[#666666]` (sin font-weight específico = normal)
   - Inputs: `text-[16px] text-black` (sin font-weight específico = normal)
   - Títulos de sección: `text-[18px] font-semibold` o `font-bold`
   - Montos grandes: `font-bold` con tamaños grandes (32px, 36px, 56px)
   - Botones: `font-medium` o `font-semibold` según importancia

---

**FIN DEL INVENTARIO**

