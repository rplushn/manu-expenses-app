-- =====================================================
-- QuickBooks Batch Sync PostgreSQL Functions
-- =====================================================
-- Functions to sync multiple expenses to QuickBooks
-- =====================================================

-- =====================================================
-- STEP 1: Function to sync all pending expenses for a user
-- =====================================================
-- Note: This function marks expenses as ready for sync.
-- The actual sync is performed by the Edge Function.
-- This can be called by pg_cron or manually.

CREATE OR REPLACE FUNCTION sync_all_pending_expenses(p_user_id UUID)
RETURNS TABLE (
  expense_id UUID,
  sync_status expense_sync_status,
  qb_expense_id TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_expense RECORD;
  v_has_qb_connection BOOLEAN;
BEGIN
  -- Check if user has active QB connection
  SELECT EXISTS(
    SELECT 1
    FROM public.quickbooks_connections
    WHERE usuario_id = p_user_id
      AND qb_connection_status = 'connected'
      AND sync_enabled = true
  ) INTO v_has_qb_connection;

  IF NOT v_has_qb_connection THEN
    RAISE NOTICE 'User % does not have active QuickBooks connection', p_user_id;
    RETURN;
  END IF;

  -- Loop through all pending expenses for this user
  FOR v_expense IN
    SELECT 
      g.id,
      g.usuario_id,
      g.monto,
      g.categoria,
      g.proveedor,
      g.fecha,
      g.currency_code,
      g.notas,
      g.created_at
    FROM public.gastos g
    WHERE g.usuario_id = p_user_id
      AND g.sync_status = 'pending'
      AND g.created_at >= NOW() - INTERVAL '1 year' -- Only sync expenses from last year
    ORDER BY g.created_at ASC
    LIMIT 100 -- Process max 100 at a time to avoid timeout
  LOOP
    BEGIN
      -- Mark expense as ready for sync (Edge Function will process it)
      -- The Edge Function should be called separately via HTTP or scheduled job
      
      -- For now, just return the expense IDs that need syncing
      RETURN QUERY SELECT
        v_expense.id,
        'pending'::expense_sync_status,
        NULL::TEXT,
        'Ready for sync'::TEXT;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error and continue
        UPDATE public.gastos
        SET 
          sync_status = 'failed',
          sync_error = SQLERRM,
          last_sync_at = NOW()
        WHERE id = v_expense.id;

        RETURN QUERY SELECT
          v_expense.id,
          'failed'::expense_sync_status,
          NULL::TEXT,
          SQLERRM;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION sync_all_pending_expenses IS 'Queues all pending expenses for a user to be synced to QuickBooks via Edge Function';

-- =====================================================
-- STEP 2: Function to get sync statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_sync_statistics(p_user_id UUID)
RETURNS TABLE (
  total_expenses BIGINT,
  pending_count BIGINT,
  synced_count BIGINT,
  failed_count BIGINT,
  skipped_count BIGINT,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_expenses,
    COUNT(*) FILTER (WHERE sync_status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE sync_status = 'synced')::BIGINT as synced_count,
    COUNT(*) FILTER (WHERE sync_status = 'failed')::BIGINT as failed_count,
    COUNT(*) FILTER (WHERE sync_status = 'skipped')::BIGINT as skipped_count,
    MAX(last_sync_at) as last_sync_at
  FROM public.gastos
  WHERE usuario_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_sync_statistics IS 'Returns sync statistics for a user';

-- =====================================================
-- STEP 3: Function to retry failed syncs
-- =====================================================

CREATE OR REPLACE FUNCTION retry_failed_syncs(p_user_id UUID, p_max_retries INTEGER DEFAULT 3)
RETURNS TABLE (
  expense_id UUID,
  retry_count INTEGER,
  status TEXT
) AS $$
DECLARE
  v_expense RECORD;
  v_retry_count INTEGER;
BEGIN
  -- Reset failed expenses to pending (if retry count allows)
  -- Note: This is a simplified version. In production, you'd track retry counts separately
  
  FOR v_expense IN
    SELECT id
    FROM public.gastos
    WHERE usuario_id = p_user_id
      AND sync_status = 'failed'
      AND last_sync_at < NOW() - INTERVAL '1 hour' -- Wait at least 1 hour before retry
    ORDER BY last_sync_at ASC
    LIMIT 50 -- Limit retries per call
  LOOP
    -- Reset to pending for retry
    UPDATE public.gastos
    SET 
      sync_status = 'pending',
      sync_error = NULL,
      last_sync_at = NULL
    WHERE id = v_expense.id;

    RETURN QUERY SELECT
      v_expense.id,
      1::INTEGER, -- Simplified retry count
      'queued_for_retry'::TEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION retry_failed_syncs IS 'Resets failed expenses to pending for retry';

-- =====================================================
-- STEP 4: Function to mark expenses as skipped
-- =====================================================

CREATE OR REPLACE FUNCTION skip_expense_sync(p_expense_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.gastos
  SET 
    sync_status = 'skipped',
    sync_error = p_reason,
    last_sync_at = NOW()
  WHERE id = p_expense_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION skip_expense_sync IS 'Marks an expense as skipped (will not be synced)';

-- =====================================================
-- STEP 5: Scheduled job function (called by pg_cron)
-- =====================================================

-- Note: This requires pg_cron extension
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION scheduled_sync_pending_expenses()
RETURNS void AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Process pending expenses for all users with active QB connections
  FOR v_user IN
    SELECT DISTINCT u.id
    FROM public.usuarios u
    INNER JOIN public.quickbooks_connections qbc ON qbc.usuario_id = u.id
    WHERE u.qb_connected = true
      AND u.qb_sync_enabled = true
      AND qbc.qb_connection_status = 'connected'
      AND qbc.sync_enabled = true
  LOOP
    -- Call sync function (this will queue expenses for Edge Function)
    PERFORM sync_all_pending_expenses(v_user.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION scheduled_sync_pending_expenses IS 'Scheduled function to sync pending expenses for all active users';

-- =====================================================
-- STEP 6: Grant permissions
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION sync_all_pending_expenses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sync_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_syncs(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION skip_expense_sync(UUID, TEXT) TO authenticated;

-- =====================================================
-- STEP 7: Example usage
-- =====================================================

-- Sync all pending expenses for a user:
-- SELECT * FROM sync_all_pending_expenses('user-uuid-here');

-- Get sync statistics:
-- SELECT * FROM get_sync_statistics('user-uuid-here');

-- Retry failed syncs:
-- SELECT * FROM retry_failed_syncs('user-uuid-here', 3);

-- Skip an expense:
-- SELECT skip_expense_sync('expense-uuid-here', 'User requested skip');

-- =====================================================
-- STEP 8: Setup pg_cron job (optional, requires pg_cron extension)
-- =====================================================

-- Schedule sync job to run every hour
-- SELECT cron.schedule(
--   'sync-pending-expenses',
--   '0 * * * *', -- Every hour
--   $$SELECT scheduled_sync_pending_expenses();$$
-- );

