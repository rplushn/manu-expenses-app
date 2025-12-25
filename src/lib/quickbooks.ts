// QuickBooks integration utilities
import { supabase } from './supabase';

export interface QBConnection {
  id: string;
  usuario_id: string;
  qb_realm_id: string;
  qb_company_name: string | null;
  qb_connection_status: 'connected' | 'disconnected' | 'expired';
  last_sync_at: string | null;
  sync_enabled: boolean;
  created_at: string;
}

export interface QBSyncLog {
  id: string;
  expense_id: string;
  sync_status: 'pending' | 'synced' | 'failed' | 'skipped';
  qb_expense_id: string | null;
  sync_error: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface QBSyncStats {
  total_expenses: number;
  pending_count: number;
  synced_count: number;
  failed_count: number;
  skipped_count: number;
  last_sync_at: string | null;
}

// Get QuickBooks connection for current user
export async function getQBConnection(userId: string): Promise<QBConnection | null> {
  try {
    const { data, error } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('usuario_id', userId)
      .eq('qb_connection_status', 'connected')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching QB connection:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getQBConnection:', error);
    return null;
  }
}

// Save QuickBooks OAuth tokens (encrypted via Edge Function)
export async function saveQBConnection(
  userId: string,
  accessToken: string,
  refreshToken: string,
  realmId: string,
  companyName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call Edge Function to save encrypted tokens
    const { data, error } = await supabase.functions.invoke('save-qb-connection', {
      body: {
        accessToken,
        refreshToken,
        realmId,
        companyName,
      },
    });

    if (error) {
      console.error('Error saving QB connection:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in saveQBConnection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Disconnect QuickBooks
export async function disconnectQB(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('quickbooks_connections')
      .update({ qb_connection_status: 'disconnected' })
      .eq('usuario_id', userId);

    if (error) {
      console.error('Error disconnecting QB:', error);
      return { success: false, error: error.message };
    }

    // Also update usuarios table
    await supabase
      .from('usuarios')
      .update({ qb_connected: false, qb_realm_id: null })
      .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Error in disconnectQB:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get sync statistics
export async function getQBSyncStats(userId: string): Promise<QBSyncStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_sync_statistics', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching sync stats:', error);
      return null;
    }

    return data?.[0] || {
      total_expenses: 0,
      pending_count: 0,
      synced_count: 0,
      failed_count: 0,
      skipped_count: 0,
      last_sync_at: null,
    };
  } catch (error) {
    console.error('Error in getQBSyncStats:', error);
    return null;
  }
}

// Get recent sync logs
export async function getQBSyncLogs(
  userId: string,
  limit: number = 5
): Promise<QBSyncLog[]> {
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('id, sync_status, qb_expense_id, sync_error, last_sync_at, created_at')
      .eq('usuario_id', userId)
      .in('sync_status', ['synced', 'failed', 'pending'])
      .order('last_sync_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return [];
    }

    return (data || []).map((expense) => ({
      id: expense.id,
      expense_id: expense.id,
      sync_status: expense.sync_status as QBSyncLog['sync_status'],
      qb_expense_id: expense.qb_expense_id,
      sync_error: expense.sync_error,
      last_sync_at: expense.last_sync_at,
      created_at: expense.created_at,
    }));
  } catch (error) {
    console.error('Error in getQBSyncLogs:', error);
    return [];
  }
}

// Sync single expense to QuickBooks
export async function syncExpenseToQB(expenseId: string): Promise<{
  success: boolean;
  qbExpenseId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-expense-to-qb', {
      body: { expenseId },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: data?.success || false,
      qbExpenseId: data?.qbExpenseId,
      error: data?.error,
    };
  } catch (error) {
    console.error('Error in syncExpenseToQB:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Retry failed syncs
export async function retryFailedSyncs(
  userId: string,
  maxRetries: number = 3
): Promise<{ success: boolean; retried: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('retry_failed_syncs', {
      p_user_id: userId,
      p_max_retries: maxRetries,
    });

    if (error) {
      return { success: false, retried: 0, error: error.message };
    }

    const retried = data?.length || 0;
    return { success: true, retried };
  } catch (error) {
    return {
      success: false,
      retried: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Toggle auto-sync
export async function toggleAutoSync(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update usuarios table
    const { error: userError } = await supabase
      .from('usuarios')
      .update({ qb_sync_enabled: enabled })
      .eq('id', userId);

    if (userError) {
      return { success: false, error: userError.message };
    }

    // Update connection table
    const { error: connError } = await supabase
      .from('quickbooks_connections')
      .update({ sync_enabled: enabled })
      .eq('usuario_id', userId);

    if (connError) {
      return { success: false, error: connError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

