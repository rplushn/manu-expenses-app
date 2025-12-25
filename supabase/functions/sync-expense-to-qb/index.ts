// =====================================================
// QuickBooks Expense Sync Edge Function
// =====================================================
// Syncs a single MANU expense to QuickBooks Online
// Uses /bill endpoint (Accounts Payable) for expenses
// Endpoint: POST /sync-expense-to-qb
// Body: { expenseId: string }
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const QB_API_BASE = Deno.env.get('QB_API_BASE') || 'https://sandbox-quickbooks.api.intuit.com';
// Production: 'https://quickbooks.api.intuit.com'
// Sandbox: 'https://sandbox-quickbooks.api.intuit.com'

const QB_CLIENT_ID = Deno.env.get('QB_CLIENT_ID') || '';
const QB_CLIENT_SECRET = Deno.env.get('QB_CLIENT_SECRET') || '';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff in ms

interface QBBillPayload {
  VendorRef: {
    value: string;
    name?: string;
  };
  Line: Array<{
    Amount: number;
    DetailType: 'AccountBasedExpenseLineDetail';
    AccountBasedExpenseLineDetail: {
      AccountRef: {
        value: string;
        name?: string;
      };
    };
  }>;
  TxnDate: string; // YYYY-MM-DD
  DocNumber?: string;
  Memo?: string;
  CurrencyRef?: {
    value: string;
  };
}

interface SyncResult {
  success: boolean;
  qbExpenseId?: string;
  error?: string;
  retryAfter?: number;
}

// Helper: Sleep function for retries
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Refresh QuickBooks access token
async function refreshQBAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token refresh error:', errorData);
      return null;
    }

    const tokenData = await response.json();
    return {
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing QB token:', error);
    return null;
  }
}

// Helper: Get or create vendor in QuickBooks
async function getOrCreateVendor(
  supabase: any,
  accessToken: string,
  realmId: string,
  vendorName: string,
  userId: string
): Promise<string | null> {
  try {
    // First, check if vendor exists in our local cache
    const { data: cachedVendor } = await supabase
      .from('qb_vendors')
      .select('qb_vendor_id')
      .eq('usuario_id', userId)
      .eq('vendor_name', vendorName)
      .single();

    if (cachedVendor?.qb_vendor_id) {
      return cachedVendor.qb_vendor_id;
    }

    // Search for vendor in QuickBooks
    const searchResponse = await fetch(
      `${QB_API_BASE}/v3/company/${realmId}/query?query=SELECT * FROM Vendor WHERE DisplayName = '${encodeURIComponent(vendorName)}'`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.QueryResponse?.Vendor?.length > 0) {
        const vendorId = searchData.QueryResponse.Vendor[0].Id;
        // Cache it
        await supabase
          .from('qb_vendors')
          .insert({
            usuario_id: userId,
            vendor_name: vendorName,
            qb_vendor_id: vendorId,
          })
          .onConflict(['usuario_id', 'vendor_name'])
          .merge();
        return vendorId;
      }
    }

    // Vendor doesn't exist, create it
    const createResponse = await fetch(
      `${QB_API_BASE}/v3/company/${realmId}/vendor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          DisplayName: vendorName,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('Error creating vendor:', errorData);
      return null;
    }

    const vendorData = await createResponse.json();
    const vendorId = vendorData.Vendor?.Id;

    if (vendorId) {
      // Cache it
      await supabase
        .from('qb_vendors')
        .insert({
          usuario_id: userId,
          vendor_name: vendorName,
          qb_vendor_id: vendorId,
        })
        .onConflict(['usuario_id', 'vendor_name'])
        .merge();
      return vendorId;
    }

    return null;
  } catch (error) {
    console.error('Error in getOrCreateVendor:', error);
    return null;
  }
}

// Helper: Get QB account ID for MANU category
async function getQBAccountIdForCategory(
  supabase: any,
  manuCategory: string,
  userId: string
): Promise<string | null> {
  try {
    // First check user-specific mapping
    const { data: userMapping } = await supabase
      .from('category_qb_mapping')
      .select('qb_account_id')
      .eq('usuario_id', userId)
      .eq('manu_category', manuCategory)
      .single();

    if (userMapping?.qb_account_id) {
      return userMapping.qb_account_id;
    }

    // Fallback to default mapping
    const { data: defaultMapping } = await supabase
      .from('category_mapping')
      .select('qb_account_id')
      .eq('manu_category', manuCategory)
      .eq('is_active', true)
      .single();

    return defaultMapping?.qb_account_id || null;
  } catch (error) {
    console.error('Error getting QB account ID:', error);
    return null;
  }
}

// Helper: Build QB bill payload
async function buildQBBillPayload(
  expense: any,
  qbAccountId: string,
  qbVendorId: string
): Promise<QBBillPayload> {
  // Convert MANU currency to QB currency code
  const currencyMap: Record<string, string> = {
    'HNL': 'HNL',
    'USD': 'USD',
  };
  const qbCurrency = currencyMap[expense.currency_code] || 'USD';

  // Format date as YYYY-MM-DD
  const expenseDate = expense.fecha || expense.expense_date || new Date().toISOString().split('T')[0];

  const payload: QBBillPayload = {
    VendorRef: {
      value: qbVendorId,
    },
    Line: [
      {
        Amount: expense.monto || expense.amount,
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: qbAccountId,
          },
        },
      },
    ],
    TxnDate: expenseDate,
    DocNumber: `MANU-${expense.id.substring(0, 8)}`,
    Memo: expense.notas || expense.notes || expense.proveedor || expense.provider || '',
  };

  if (qbCurrency !== 'USD') {
    payload.CurrencyRef = {
      value: qbCurrency,
    };
  }

  return payload;
}

// Helper: Sync expense to QuickBooks with retry logic
async function syncExpenseToQB(
  expense: any,
  user: any,
  qbConnection: any,
  supabase: any
): Promise<SyncResult> {
  // Get QB account ID for category
  const qbAccountId = await getQBAccountIdForCategory(
    supabase,
    expense.categoria || expense.category,
    user.id
  );

  if (!qbAccountId) {
    return {
      success: false,
      error: 'No se encontró cuenta de QuickBooks para esta categoría. Configura el mapeo en Configuración.',
    };
  }

  // Get or create vendor
  const vendorName = expense.proveedor || expense.provider || 'Sin proveedor';
  const qbVendorId = await getOrCreateVendor(
    supabase,
    qbConnection.qb_access_token,
    qbConnection.qb_realm_id,
    vendorName,
    user.id
  );

  if (!qbVendorId) {
    return {
      success: false,
      error: 'No se pudo crear o encontrar el proveedor en QuickBooks',
    };
  }

  // Build payload
  const payload = await buildQBBillPayload(expense, qbAccountId, qbVendorId);

  // Get access token
  let accessToken = qbConnection.qb_access_token;
  const realmId = qbConnection.qb_realm_id;

  // Retry logic
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Make API call to QuickBooks
      const response = await fetch(`${QB_API_BASE}/v3/company/${realmId}/bill`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      // Handle different response codes
      if (response.status === 201) {
        // Success!
        const qbBillId = responseData.Bill?.Id;
        
        return {
          success: true,
          qbExpenseId: qbBillId?.toString(),
        };
      } else if (response.status === 401) {
        // Token expired, try to refresh
        console.log('Token expired, attempting refresh...');
        const refreshResult = await refreshQBAccessToken(qbConnection.qb_refresh_token);

        if (refreshResult) {
          // Update connection with new token
          await supabase
            .from('quickbooks_connections')
            .update({
              qb_access_token: refreshResult.accessToken,
              qb_token_expires_at: new Date(Date.now() + refreshResult.expiresIn * 1000).toISOString(),
            })
            .eq('id', qbConnection.id);

          accessToken = refreshResult.accessToken;
          // Retry with new token (don't count as retry attempt)
          continue;
        } else {
          return {
            success: false,
            error: 'Token expirado y no se pudo renovar. Por favor, reconecta QuickBooks.',
          };
        }
      } else if (response.status === 429) {
        // Rate limited
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        const waitTime = Math.min(retryAfter * 1000, Math.pow(2, attempt) * 1000);
        
        if (attempt < MAX_RETRIES - 1) {
          console.log(`Rate limited, waiting ${waitTime}ms...`);
          await sleep(waitTime);
          continue;
        }
        
        return {
          success: false,
          error: 'Límite de solicitudes alcanzado. Intenta más tarde.',
          retryAfter,
        };
      } else {
        // Other error
        const errorMessage = responseData.fault?.error?.[0]?.detail || 
                            responseData.fault?.error?.[0]?.message || 
                            `HTTP ${response.status}: ${response.statusText}`;
        
        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error(`Sync attempt ${attempt + 1} failed:`, error);
      
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  return {
    success: false,
    error: 'Máximo de reintentos alcanzado',
  };
}

// Main handler
serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Parse request
    const { expenseId } = await req.json();

    if (!expenseId) {
      return new Response(
        JSON.stringify({ error: 'expenseId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get expense
    const { data: expense, error: expenseError } = await supabase
      .from('gastos')
      .select('*')
      .eq('id', expenseId)
      .eq('usuario_id', user.id)
      .single();

    if (expenseError || !expense) {
      return new Response(
        JSON.stringify({ error: 'Expense not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if already synced
    if (expense.sync_status === 'synced' && expense.qb_expense_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Expense already synced',
          qbExpenseId: expense.qb_expense_id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user data
    const { data: userData, error: userDataError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User data not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get QuickBooks connection
    const { data: qbConnection, error: qbError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('qb_connection_status', 'connected')
      .single();

    if (qbError || !qbConnection) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks connection not found or not connected' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(qbConnection.qb_token_expires_at);
    if (tokenExpiresAt < new Date()) {
      // Try to refresh
      const refreshResult = await refreshQBAccessToken(qbConnection.qb_refresh_token);
      if (refreshResult) {
        await supabase
          .from('quickbooks_connections')
          .update({
            qb_access_token: refreshResult.accessToken,
            qb_token_expires_at: new Date(Date.now() + refreshResult.expiresIn * 1000).toISOString(),
          })
          .eq('id', qbConnection.id);
        qbConnection.qb_access_token = refreshResult.accessToken;
      } else {
        return new Response(
          JSON.stringify({ error: 'QuickBooks token expired. Please reconnect.' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Sync expense to QuickBooks
    const syncResult = await syncExpenseToQB(expense, userData, qbConnection, supabase);

    // Update expense with sync result
    if (syncResult.success) {
      await supabase
        .from('gastos')
        .update({
          qb_expense_id: syncResult.qbExpenseId,
          sync_status: 'synced',
          last_sync_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq('id', expenseId);

      // Update user's last sync time
      await supabase
        .from('usuarios')
        .update({ qb_last_sync_at: new Date().toISOString() })
        .eq('id', user.id);
    } else {
      await supabase
        .from('gastos')
        .update({
          sync_status: 'failed',
          sync_error: syncResult.error,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', expenseId);
    }

    return new Response(
      JSON.stringify(syncResult),
      {
        status: syncResult.success ? 200 : 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in sync-expense-to-qb:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
