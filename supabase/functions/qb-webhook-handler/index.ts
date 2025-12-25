// =====================================================
// QuickBooks Webhook Handler (Optional - Advanced)
// =====================================================
// Handles webhooks from QuickBooks when bills change
// Endpoint: POST /qb-webhook-handler
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const QB_API_BASE = Deno.env.get('QB_API_BASE') || 'https://quickbooks.api.intuit.com';

interface QBWebhookEvent {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{
        name: string; // "Bill", "Vendor", etc.
        id: string;
        operation: 'Create' | 'Update' | 'Delete';
        lastUpdated: string;
      }>;
    };
  }>;
}

// Helper: Get MANU expense by QB bill ID
async function getExpenseByQBBillId(
  supabase: any,
  qbBillId: string,
  realmId: string
): Promise<any> {
  // Find user with this realm_id
  const { data: user } = await supabase
    .from('usuarios')
    .select('id')
    .eq('qb_realm_id', realmId)
    .single();

  if (!user) {
    return null;
  }

  // Find expense with this qb_expense_id
  const { data: expense } = await supabase
    .from('gastos')
    .select('*')
    .eq('qb_expense_id', qbBillId)
    .eq('usuario_id', user.id)
    .single();

  return expense;
}

// Helper: Fetch bill from QuickBooks API
async function fetchQBBill(
  accessToken: string,
  realmId: string,
  billId: string
): Promise<any> {
  const response = await fetch(
    `${QB_API_BASE}/v3/company/${realmId}/bill/${billId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch bill from QB: ${response.statusText}`);
  }

  return response.json();
}

// Helper: Update MANU expense from QB bill data
async function updateExpenseFromQBBill(
  supabase: any,
  expenseId: string,
  qbBillData: any
): Promise<void> {
  const updates: any = {};

  if (qbBillData.Bill?.TxnDate) {
    updates.fecha = qbBillData.Bill.TxnDate;
  }

  if (qbBillData.Bill?.Line?.[0]?.Amount) {
    updates.monto = qbBillData.Bill.Line[0].Amount;
  }

  if (qbBillData.Bill?.Memo) {
    updates.notas = qbBillData.Bill.Memo;
  }

  // Only update if there are changes
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('gastos')
      .update(updates)
      .eq('id', expenseId);
  }
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

    // Verify webhook signature (if QB provides it)
    const signature = req.headers.get('X-QB-Signature');
    // TODO: Implement signature verification if QB provides it

    // Parse webhook payload
    const webhookData: QBWebhookEvent = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process each event notification
    for (const notification of webhookData.eventNotifications || []) {
      const { realmId, dataChangeEvent } = notification;

      for (const entity of dataChangeEvent.entities || []) {
        // Only process Bill entities
        if (entity.name !== 'Bill') {
          continue;
        }

        const qbBillId = entity.id;
        const operation = entity.operation;

        // Get MANU expense
        const expense = await getExpenseByQBBillId(supabase, qbBillId, realmId);

        if (!expense) {
          console.log(`Expense not found in MANU for QB Bill ID: ${qbBillId}`);
          continue;
        }

        // Get QB connection to fetch full bill data
        const { data: qbConnection } = await supabase
          .from('quickbooks_connections')
          .select('*')
          .eq('qb_realm_id', realmId)
          .eq('qb_connection_status', 'connected')
          .single();

        if (!qbConnection) {
          console.log(`QB connection not found for realm: ${realmId}`);
          continue;
        }

        // Handle different operations
        if (operation === 'Delete') {
          // Mark expense as failed (bill was deleted in QB)
          await supabase
            .from('gastos')
            .update({
              qb_expense_id: null,
              sync_status: 'failed',
              sync_error: 'Bill fue eliminado en QuickBooks',
              last_sync_at: new Date().toISOString(),
            })
            .eq('id', expense.id);
        } else if (operation === 'Update' || operation === 'Create') {
          // Fetch full bill data from QB
          try {
            const qbBillData = await fetchQBBill(
              qbConnection.qb_access_token,
              realmId,
              qbBillId
            );

            // Update MANU expense with QB data
            await updateExpenseFromQBBill(supabase, expense.id, qbBillData);
          } catch (error) {
            console.error(`Error fetching/updating bill ${qbBillId}:`, error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in qb-webhook-handler:', error);
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
