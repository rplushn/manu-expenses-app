-- =====================================================
-- Test Script for Invoice Schema
-- =====================================================
-- Run this AFTER running the migration to verify everything works
-- =====================================================

-- 1. Verify tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('facturas', 'factura_items')
ORDER BY table_name;

-- 2. Verify indexes exist
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('facturas', 'factura_items')
ORDER BY tablename, indexname;

-- 3. Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('facturas', 'factura_items');

-- 4. Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('facturas', 'factura_items')
ORDER BY tablename, policyname;

-- 5. Test insert (requires authenticated user)
-- Uncomment and run as authenticated user:

/*
-- Insert test invoice
INSERT INTO facturas (
    usuario_id,
    fecha,
    cliente_nombre,
    cliente_rtn,
    numero,
    cai,
    subtotal,
    descuento,
    impuesto,
    total,
    notas
) VALUES (
    auth.uid(),
    CURRENT_DATE,
    'Cliente de Prueba',
    '0801199012345',
    'FAC-TEST-001',
    'CAI-123456-789012-345678',
    1000.00,
    50.00,
    142.50,
    1092.50,
    'Factura de prueba'
) RETURNING *;

-- Get the invoice ID from above and use it here
-- Replace 'YOUR-INVOICE-ID' with the actual ID
INSERT INTO factura_items (
    factura_id,
    descripcion,
    cantidad,
    precio_unitario,
    subtotal,
    orden
) VALUES
    ('YOUR-INVOICE-ID', 'Producto A', 2.000, 300.00, 600.00, 1),
    ('YOUR-INVOICE-ID', 'Producto B', 1.000, 400.00, 400.00, 2)
RETURNING *;

-- Query the test invoice with items
SELECT 
    f.*,
    json_agg(
        json_build_object(
            'id', fi.id,
            'descripcion', fi.descripcion,
            'cantidad', fi.cantidad,
            'precio_unitario', fi.precio_unitario,
            'subtotal', fi.subtotal,
            'orden', fi.orden
        ) ORDER BY fi.orden
    ) as items
FROM facturas f
LEFT JOIN factura_items fi ON fi.factura_id = f.id
WHERE f.usuario_id = auth.uid()
AND f.numero = 'FAC-TEST-001'
GROUP BY f.id;

-- Clean up test data
DELETE FROM facturas WHERE numero = 'FAC-TEST-001' AND usuario_id = auth.uid();
*/

-- =====================================================
-- Expected Results:
-- =====================================================
-- 1. Should show 2 tables (facturas, factura_items)
-- 2. Should show multiple indexes for each table
-- 3. Should show rowsecurity = true for both tables
-- 4. Should show 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
-- 5. Test inserts should work when authenticated
-- =====================================================

