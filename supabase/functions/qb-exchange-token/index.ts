// QuickBooks OAuth Token Exchange Edge Function
// Exchanges authorization code for access/refresh tokens
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const QB_CLIENT_ID = Deno.env.get('QB_CLIENT_ID') || '';
const QB_CLIENT_SECRET = Deno.env.get('QB_CLIENT_SECRET') || '';
const QB_REDIRECT_URI = Deno.env.get('QB_REDIRECT_URI') || '';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

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
    const { code, realmId } = await req.json();

    if (!code || !realmId) {
      return new Response(
        JSON.stringify({ error: 'code and realmId are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Exchange code for tokens
    const tokenResponse = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: QB_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('QB token exchange error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get company info from QuickBooks API
    let companyName = null;
    try {
      const companyResponse = await fetch(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        companyName = companyData.CompanyInfo?.CompanyName || null;
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
      // Continue without company name
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Save connection to database (tokens will be encrypted by Edge Function)
    // Note: In production, encrypt tokens before saving
    const { data: connection, error: dbError } = await supabase
      .from('quickbooks_connections')
      .upsert({
        usuario_id: user.id,
        qb_access_token: access_token, // TODO: Encrypt with Vault
        qb_refresh_token: refresh_token, // TODO: Encrypt with Vault
        qb_token_expires_at: expiresAt,
        qb_realm_id: realmId,
        qb_company_name: companyName,
        qb_connection_status: 'connected',
        sync_enabled: true,
      }, {
        onConflict: 'usuario_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving connection:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        companyName,
        realmId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in qb-exchange-token:', error);
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

