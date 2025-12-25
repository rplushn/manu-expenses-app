# 🚀 QuickBooks Migration to Production - Quick Reference

## When you're ready to move to PRODUCTION, follow these steps:

### 1️⃣ Get Production Credentials

1. Go to https://developer.intuit.com/app/developer/myapps
2. Select your app → "Keys & credentials"
3. Switch to "Production" tab
4. Copy Client ID and Client Secret

### 2️⃣ Update .env File

Change these values in `.env`:

QB_ENVIRONMENT=production
QB_CLIENT_ID=<production_client_id>
QB_CLIENT_SECRET=<production_client_secret>

text

### 3️⃣ Get Production Tokens

1. Go to https://developer.intuit.com/app/developer/playground
2. Use PRODUCTION credentials
3. Login with REAL QuickBooks account
4. Copy: Realm ID, Access Token, Refresh Token
5. Update .env with these values

### 4️⃣ Fetch Real Account IDs

npx ts-node lib/quickbooks/fetch-accounts.ts

text

This will show your REAL QuickBooks accounts and generate SQL.

### 5️⃣ Update Supabase

Copy the generated SQL aL Editor.

### 6️⃣ Refresh Tokens (when they expire)

npx ts-node lib/quickbooks/refresh-token.ts

text

---

## 📂 Files Created

- `.env` - Environment variables
- `lib/quickbooks/fetch-accounts.ts` - Fetch QB accounts
- `lib/quickbooks/refresh-token.ts` - Refresh expired tokens
- `QUICKBOOKS_SETUP.md` - Full documentation

---

## ⚠️ Important Notes

- Tokens expire every 60 minutes
- Sandbox URL: https://sandbox-quickbooks.api.intuit.com
- Production URL: https://quickbooks.api.intuit.com
- Always keep .env SECRET (never commit to Git)

---

**Status:** Ready for Production Migration ✅
**Last Updated:** December 25, 2025
