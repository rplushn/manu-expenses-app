// =====================================================
// QuickBooks Token Manager
// =====================================================
// Functions to manage QuickBooks OAuth tokens in Supabase
// =====================================================

import { supabase } from '@/lib/supabase';

export interface QBConnection {
  id: string;
  usuario_id: string;
  qb_access_token: string;
  qb_refresh_token: string;
  qb_token_expires_at: string;
  qb_realm_id: string;
  qb_company_name?: string | null;
  qb_company_id?: string | null;
  qb_connection_status: 'connected' | 'disconnected' | 'expired';
  sync_enabled: boolean;
  last_sync_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Saves or updates QuickBooks token for a user
 * @param usuario_id User ID
 * @param qb_access_token QuickBooks access token
 * @param qb_realm_id QuickBooks realm/company ID
 * @param environment 'sandbox' or 'production'
 * @param qb_refresh_token Optional refresh token
 * @param qb_company_name Optional company name
 * @returns QBConnection or null if error
 */
export async function saveQBToken(
  usuario_id: string,
  qb_access_token: string,
  qb_realm_id: string,
  environment: 'sandbox' | 'production' = 'sandbox',
  qb_refresh_token?: string,
  qb_company_name?: string
): Promise<QBConnection | null> {
  try {
    // Calculate token expiration (typically 60 minutes = 3600 seconds)
    const expiresIn = 3600; // Default 1 hour
    const qb_token_expires_at = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { data, error } = await supabase
      .from('qb_connection')
      .upsert(
        {
          usuario_id,
          qb_access_token,
          qb_refresh_token: qb_refresh_token || '',
          qb_token_expires_at,
          qb_realm_id,
          qb_company_name: qb_company_name || null,
          qb_connection_status: 'connected',
          sync_enabled: true,
        },
        {
          onConflict: 'usuario_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving QB token:', error);
      return null;
    }

    return data as QBConnection;
  } catch (error) {
    console.error('Exception in saveQBToken:', error);
    return null;
  }
}

/**
 * Gets QuickBooks access token for a user
 * @param usuario_id User ID
 * @returns Access token string or null if not found/not active
 */
export async function getQBToken(usuario_id: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('qb_connection')
      .select('qb_access_token, qb_connection_status, qb_token_expires_at')
      .eq('usuario_id', usuario_id)
      .eq('qb_connection_status', 'connected')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error getting QB token:', error);
      return null;
    }

    if (!data || data.qb_connection_status !== 'connected') {
      return null;
    }

    // Check if token is expired
    if (data.qb_token_expires_at) {
      const expiresAt = new Date(data.qb_token_expires_at);
      if (expiresAt < new Date()) {
        console.warn('QB token expired for user:', usuario_id);
        return null;
      }
    }

    return data.qb_access_token || null;
  } catch (error) {
    console.error('Exception in getQBToken:', error);
    return null;
  }
}

/**
 * Checks if user has an active QuickBooks connection
 * @param usuario_id User ID
 * @returns true if connected and active, false otherwise
 */
export async function isQBConnected(userId: string): Promise<boolean> {
  console.log('[QB DEBUG] ==================');
  console.log('[QB DEBUG] isQBConnected called');
  console.log('[QB DEBUG] Received userId:', userId);
  console.log('[QB DEBUG] userId type:', typeof userId);
  
  try {
    const { data, error } = await supabase
      .from('qb_connection')
      .select('qb_access_token, is_active')
      .eq('usuario_id', userId)
      .single();

    console.log('[QB DEBUG] Query result - data:', data);
    console.log('[QB DEBUG] Query result - error:', error);

    const result = !!(data?.qb_access_token && data?.is_active);
    console.log('[QB DEBUG] Connection result:', result);
    console.log('[QB DEBUG] ==================');
    
    return result;
  } catch (error) {
    console.log('[QB DEBUG] Exception in isQBConnected:', error);
    console.log('[QB DEBUG] ==================');
    return false;
  }
}

/**
 * Disconnects QuickBooks for a user (sets qb_connection_status = 'disconnected')
 * @param usuario_id User ID
 * @returns true if successful, false otherwise
 */
export async function disconnectQB(usuario_id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('qb_connection')
      .update({
        qb_connection_status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('usuario_id', usuario_id);

    if (error) {
      console.error('Error disconnecting QB:', error);
      return false;
    }

    // Also update usuarios table (trigger should handle this, but we do it explicitly)
    await supabase
      .from('usuarios')
      .update({
        qb_connected: false,
        qb_realm_id: null,
      })
      .eq('id', usuario_id);

    return true;
  } catch (error) {
    console.error('Exception in disconnectQB:', error);
    return false;
  }
}

