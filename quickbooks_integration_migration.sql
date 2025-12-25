-- =====================================================
-- MANU QuickBooks Builder Integration - Database Migration
-- =====================================================
-- This migration adds support for QuickBooks integration:
-- 1. Creates quickbooks_connections table
-- 2. Adds sync tracking columns to gastos table
-- 3. Adds QB connection status to usuarios table
-- 4. Creates indexes for performance
-- 5. Sets up RLS policies
-- 6. Configures Supabase Vault for token encryption
-- =====================================================

-- =====================================================
-- STEP 1: Enable required extensions
-- =====================================================

-- Enable pgcrypto for encryption (if using manual encryption)
-- Note: Supabase Vault handles encryption automatically, but we include this for reference
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- STEP 2: Create ENUM types
-- =====================================================

-- Connection status enum
DO $$ BEGIN
  CREATE TYPE qb_connection_status AS ENUM ('connected', 'disconnected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Sync status enum
DO $$ BEGIN
  CREATE TYPE expense_sync_status AS ENUM ('pending', 'synced', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- STEP 3: Create quickbooks_connections table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- QuickBooks OAuth tokens (will be encrypted with Supabase Vault)
  qb_access_token TEXT NOT NULL,
  qb_refresh_token TEXT NOT NULL,
  qb_token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- QuickBooks company info
  qb_realm_id TEXT NOT NULL,
  qb_company_name TEXT,
  qb_company_id TEXT,
  
  -- Connection status
  qb_connection_status qb_connection_status NOT NULL DEFAULT 'disconnected',
  
  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(usuario_id) -- One connection per user
);

-- Add comments for documentation
COMMENT ON TABLE public.quickbooks_connections IS 'Stores QuickBooks OAuth connections for each user';
COMMENT ON COLUMN public.quickbooks_connections.qb_access_token IS 'QuickBooks access token (encrypted with Supabase Vault)';
COMMENT ON COLUMN public.quickbooks_connections.qb_refresh_token IS 'QuickBooks refresh token (encrypted with Supabase Vault)';
COMMENT ON COLUMN public.quickbooks_connections.qb_realm_id IS 'QuickBooks company/realm ID';
COMMENT ON COLUMN public.quickbooks_connections.qb_connection_status IS 'Current status of QB connection';
COMMENT ON COLUMN public.quickbooks_connections.sync_enabled IS 'Whether automatic sync is enabled';

-- =====================================================
-- STEP 4: Add columns to gastos table
-- =====================================================

ALTER TABLE public.gastos
ADD COLUMN IF NOT EXISTS qb_expense_id TEXT,
ADD COLUMN IF NOT EXISTS sync_status expense_sync_status NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Add comments
COMMENT ON COLUMN public.gastos.qb_expense_id IS 'ID of the expense in QuickBooks (if synced)';
COMMENT ON COLUMN public.gastos.sync_status IS 'Sync status: pending, synced, failed, or skipped';
COMMENT ON COLUMN public.gastos.last_sync_at IS 'Last time this expense was synced to QuickBooks';
COMMENT ON COLUMN public.gastos.sync_error IS 'Error message if sync failed';

-- =====================================================
-- STEP 5: Add columns to usuarios table
-- =====================================================

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS qb_connected BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS qb_realm_id TEXT,
ADD COLUMN IF NOT EXISTS qb_last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qb_sync_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comments
COMMENT ON COLUMN public.usuarios.qb_connected IS 'Whether user has an active QuickBooks connection';
COMMENT ON COLUMN public.usuarios.qb_realm_id IS 'QuickBooks realm ID (denormalized from quickbooks_connections)';
COMMENT ON COLUMN public.usuarios.qb_last_sync_at IS 'Last time expenses were synced to QuickBooks';
COMMENT ON COLUMN public.usuarios.qb_sync_enabled IS 'Whether automatic sync is enabled for this user';

-- =====================================================
-- STEP 6: Create indexes for performance
-- =====================================================

-- Indexes for quickbooks_connections
CREATE INDEX IF NOT EXISTS idx_qb_connections_usuario_id 
  ON public.quickbooks_connections(usuario_id);

CREATE INDEX IF NOT EXISTS idx_qb_connections_status 
  ON public.quickbooks_connections(qb_connection_status);

CREATE INDEX IF NOT EXISTS idx_qb_connections_usuario_status 
  ON public.quickbooks_connections(usuario_id, qb_connection_status);

-- Indexes for gastos sync tracking
CREATE INDEX IF NOT EXISTS idx_gastos_sync_status 
  ON public.gastos(sync_status);

CREATE INDEX IF NOT EXISTS idx_gastos_qb_expense_id 
  ON public.gastos(qb_expense_id) 
  WHERE qb_expense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gastos_usuario_sync_status 
  ON public.gastos(usuario_id, sync_status);

CREATE INDEX IF NOT EXISTS idx_gastos_usuario_sync_time 
  ON public.gastos(usuario_id, last_sync_at) 
  WHERE last_sync_at IS NOT NULL;

-- Index for pending syncs (most common query)
CREATE INDEX IF NOT EXISTS idx_gastos_pending_sync 
  ON public.gastos(usuario_id, created_at) 
  WHERE sync_status = 'pending';

-- =====================================================
-- STEP 7: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: Create RLS Policies for quickbooks_connections
-- =====================================================

-- Policy: Users can view their own QB connections
DROP POLICY IF EXISTS "Users can view own QB connections" ON public.quickbooks_connections;
CREATE POLICY "Users can view own QB connections"
  ON public.quickbooks_connections
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Policy: Users can insert their own QB connections
DROP POLICY IF EXISTS "Users can insert own QB connections" ON public.quickbooks_connections;
CREATE POLICY "Users can insert own QB connections"
  ON public.quickbooks_connections
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can update their own QB connections
DROP POLICY IF EXISTS "Users can update own QB connections" ON public.quickbooks_connections;
CREATE POLICY "Users can update own QB connections"
  ON public.quickbooks_connections
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can delete their own QB connections
DROP POLICY IF EXISTS "Users can delete own QB connections" ON public.quickbooks_connections;
CREATE POLICY "Users can delete own QB connections"
  ON public.quickbooks_connections
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- =====================================================
-- STEP 9: Create trigger to update updated_at timestamp
-- =====================================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for quickbooks_connections
DROP TRIGGER IF EXISTS update_quickbooks_connections_updated_at ON public.quickbooks_connections;
CREATE TRIGGER update_quickbooks_connections_updated_at
  BEFORE UPDATE ON public.quickbooks_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 10: Create function to sync qb_connected status
-- =====================================================

-- Function to update usuarios.qb_connected when connection changes
CREATE OR REPLACE FUNCTION sync_qb_connection_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usuarios table when connection status changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.usuarios
    SET 
      qb_connected = (NEW.qb_connection_status = 'connected'),
      qb_realm_id = NEW.qb_realm_id,
      qb_sync_enabled = NEW.sync_enabled
    WHERE id = NEW.usuario_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.usuarios
    SET 
      qb_connected = false,
      qb_realm_id = NULL,
      qb_sync_enabled = false
    WHERE id = OLD.usuario_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync connection status
DROP TRIGGER IF EXISTS sync_qb_connection_status_trigger ON public.quickbooks_connections;
CREATE TRIGGER sync_qb_connection_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quickbooks_connections
  FOR EACH ROW
  EXECUTE FUNCTION sync_qb_connection_status();

-- =====================================================
-- STEP 11: Supabase Vault Configuration
-- =====================================================

-- Note: Supabase Vault encryption is handled at the application level
-- The tokens should be encrypted before inserting into the database
-- 
-- Example encryption flow (in application code):
-- 1. Use Supabase Vault API to encrypt tokens
-- 2. Store encrypted values in qb_access_token and qb_refresh_token
-- 3. Decrypt when needed using Vault API
--
-- For now, we store tokens as TEXT. Encryption should be implemented
-- in the application layer using Supabase Vault or pgcrypto.

-- =====================================================
-- STEP 12: Verification Queries
-- =====================================================

-- Verify table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('quickbooks_connections', 'gastos', 'usuarios')
ORDER BY table_name, ordinal_position;

-- Verify indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('quickbooks_connections', 'gastos')
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'quickbooks_connections';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify all tables, columns, indexes, and policies were created
-- 3. Implement Supabase Vault encryption in application code
-- 4. Test RLS policies with different users
-- 5. Implement QuickBooks OAuth flow
-- 6. Implement sync logic
--
-- =====================================================

