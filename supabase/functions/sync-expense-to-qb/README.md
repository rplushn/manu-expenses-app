# Sync Expense to QuickBooks Edge Function

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy sync-expense-to-qb

# Or use Supabase CLI
npx supabase functions deploy sync-expense-to-qb
```

## Environment Variables

Set these in Supabase Dashboard → Edge Functions → Settings:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)

## Testing

```bash
# Test locally
supabase functions serve sync-expense-to-qb

# Test with curl
curl -X POST http://localhost:54321/functions/v1/sync-expense-to-qb \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expenseId": "expense-uuid-here"}'
```

## QuickBooks API Configuration

Update `QB_API_BASE` in `index.ts`:

- **Sandbox:** `https://sandbox-quickbooks.api.intuit.com`
- **Production:** `https://quickbooks.api.intuit.com`

## OAuth Token Refresh

The function includes a placeholder for token refresh. Implement the OAuth2 refresh flow:

1. Get `CLIENT_ID` and `CLIENT_SECRET` from QuickBooks Developer Dashboard
2. Implement `refreshQBAccessToken()` function
3. Store encrypted tokens in `quickbooks_connections` table

