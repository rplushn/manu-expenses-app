# 📘 QuickBooks Online Integration - Setup Guide

## 🎯 Overview

This document contains ALL steps needed to migrate from QuickBooks Sandbox to Production.

---

## 📋 Current Status

✅ **COMPLETED (Sandbox):**
- Database tables created in Supabase
- RLS policies configured
- OAuth 2.0 working with sandbox
- Account mapping script working
- Category mappings updated with sandbox Account IDs

---

## 🚀 Migration to Production - Complete Checklist

### **PREREQUISITES**

Before starting, you MUST have:

- [ ] Active QuickBooks Online subscription (paid account)
- [ ] Intuit Developer account with app approved for production
- [ ] Access to your production QuickBooks company
- [ ] Client ID and Client Secret from Intuit Developer Portal

---

## 📝 Step-by-Step Migration Process

### **STEP 1: Update Intuit App to Production**

1. Go to: https://developer.intuit.com/app/developer/myapps
2. Select your app
3. Click "Keys & credentials"
4. Switch from " to "Production" keys
5. Copy the **Production Client ID** and **Production Client Secret**

---

### **STEP 2: Update .env File**

Open .env and update these values:

QB_ENVIRONMENT=production
QB_CLIENT_ID=your_production_client_id_here
QB_CLIENT_SECRET=your_production_client_secret_here
QB_ACCESS_TOKEN=
QB_REFRESH_TOKEN=
QB_REALM_ID=

text

---

### **STEP 3: Get Production OAuth Tokens**

1. Go to: https://developer.intuit.com/app/developer/playground
2. Select your app
3. Select scopes: com.intuit.quickbooks.accounting
4. Click "Get authorization code"
5. Login with your REAL QuickBooks account (not sandbox)
6. Authorize the app
7. Copy the Realm ID, Access Token, and Refresh Token

---

### **STEP 4: Update .env with Production Tokens**

QB_ENVIRONMENT=production
QB_REALM_ID=1234567890
QB_ACCESS_TOKEN=eyJhbGc...
QB_REFRESH_TOKEN=AB11...
QB_CLIENT_ID=AB...
QB_CLIENT_SECRET=12345...

text

---

### **STEP 5: Fetch Production Account IDs**

Run the script to get your REAL QuickBooks accounts:

npx ts-node lib/quickbooks/fetch-accounts.ts

text

This will output:
1. List of ALL your real QuickBooks accounts
2. SQL UPDATE statements with real Account IDs

---

### **STEP 6: Update Supabase with Production Account IDs**

1. Copy the generated SQL from Step 5
2. Go to Supabase SQL Editor
3. Paste and run the SQL
4. Verify with: SELECT * FROM category_qb_mapping;

---

### **STEP 7: Test the Integration**

Create a test expense in your app and verify it syncs to real QuickBooks.

---

## 🔄 Token Refresh (IMPORTANT)

Access tokens expire every 60 minutes. When expired, run:

npx ts-node lib/quickbooks/refresh-token.ts

text

---

## 🆘 Troubleshooting

### Error: 403 Forbidden
- Check QB_ENVIRONMENT in .env
- Verify token was generated for correct environment

### Error: Invalid Realm ID
- Get Realm ID from OAuth flow
- Update .env with correct Realm ID

### Error: Token Expired
- Run: npx ts-node lib/quickbooks/refresh-token.ts

---

## 📞 Support Resources

- Intuit Developer Docs: https://developer.intu/app/developer/qbo/docs/get-started
- OAuth 2.0 Guide: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0

---

## ✅ Production Readiness Checklist

- [ ] All environment variables set correctly
- [ ] Production tokens obtained and working
- [ ] Account mappings updated with production IDs
- [ ] Token refresh mechanism implemented
- [ ] Error handling tested

---

Last Updated: December 25, 2025
Status: Ready for Production Migration
