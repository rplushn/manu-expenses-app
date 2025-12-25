// =====================================================
// Get QuickBooks Account IDs Script
// =====================================================
// Fetches all Expense accounts from QuickBooks Sandbox
// Outputs JSON file with account IDs and names
// =====================================================

// Usage:
// 1. Set your credentials below
// 2. Run: deno run --allow-net --allow-write scripts/get_qb_account_ids.ts
//    OR: ts-node scripts/get_qb_account_ids.ts (if using Node.js)

// =====================================================
// CONFIGURATION - UPDATE THESE VALUES
// =====================================================

const QB_API_BASE = 'https://sandbox-quickbooks.api.intuit.com';
// For production: 'https://quickbooks.api.intuit.com'

// Get these from your QuickBooks Developer Dashboard
// or from the OAuth callback after connecting
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE';
const REALM_ID = 'YOUR_REALM_ID_HERE';

// Output file
const OUTPUT_FILE = 'qb_accounts.json';

// =====================================================
// TYPES
// =====================================================

interface QBAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  FullyQualifiedName?: string;
}

interface OutputAccount {
  id: string;
  name: string;
  type: string;
  subType?: string;
}

// =====================================================
// FUNCTIONS
// =====================================================

async function getQBAccounts(): Promise<QBAccount[]> {
  try {
    console.log('🔍 Fetching accounts from QuickBooks...\n');
    
    // Query all expense-related accounts
    // This includes Expense and Cost of Goods Sold accounts
    const query = `SELECT * FROM Account WHERE AccountType = 'Expense' OR AccountType = 'Cost of Goods Sold'`;
    const encodedQuery = encodeURIComponent(query);
    
    const url = `${QB_API_BASE}/v3/company/${REALM_ID}/query?query=${encodedQuery}`;
    
    console.log(`📡 Request URL: ${url}\n`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    // Check for errors in response
    if (data.fault) {
      throw new Error(`QuickBooks API Error: ${JSON.stringify(data.fault, null, 2)}`);
    }
    
    const accounts = data.QueryResponse?.Account || [];
    
    if (accounts.length === 0) {
      console.warn('⚠️  No accounts found. Check your query or credentials.');
      return [];
    }
    
    return accounts.map((acc: any) => ({
      Id: acc.Id,
      Name: acc.Name,
      AccountType: acc.AccountType,
      AccountSubType: acc.AccountSubType,
      FullyQualifiedName: acc.FullyQualifiedName,
    }));
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    throw error;
  }
}

function formatAccountsForOutput(accounts: QBAccount[]): OutputAccount[] {
  return accounts.map(acc => ({
    id: acc.Id,
    name: acc.Name,
    type: acc.AccountType,
    subType: acc.AccountSubType,
  }));
}

function suggestMappings(accounts: OutputAccount[]): void {
  console.log('\n📋 Suggested Mappings for MANU Categories:\n');
  console.log('=' .repeat(60));
  
  const mappings: Record<string, string[]> = {
    'mercaderia': ['Cost of Goods Sold', 'COGS', 'Cost of Sales', 'Merchandise'],
    'servicios': ['Office Expenses', 'Contract Labor', 'Professional Services', 'Services'],
    'marketing': ['Advertising & Marketing', 'Marketing', 'Promotional', 'Advertising'],
    'transporte': ['Vehicle Expenses', 'Auto', 'Car and Truck', 'Transportation'],
    'operacion': ['Operating Expenses', 'General & Administrative', 'Operating'],
    'personal': ['Payroll Expenses', 'Wages', 'Salaries', 'Payroll'],
    'instalaciones': ['Rent or Lease', 'Rent Expense', 'Rent'],
    'impuestos': ['Taxes & Licenses', 'Tax', 'Taxes'],
    'equipamiento': ['Equipment Rental', 'Equipment', 'Equipment Expense'],
    'alimentacion': ['Meals & Entertainment', 'Meals', 'Entertainment'],
    'otros': ['Other Expenses', 'Miscellaneous', 'Other'],
  };
  
  Object.entries(mappings).forEach(([category, keywords]) => {
    const matches = accounts.filter(acc => 
      keywords.some(keyword => 
        acc.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (matches.length > 0) {
      console.log(`\n${category.toUpperCase()}:`);
      matches.forEach(match => {
        console.log(`  ✓ ${match.name.padEnd(40)} → ID: ${match.id}`);
      });
    } else {
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ⚠ No matching account found`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
}

function generateSQLUpdates(accounts: OutputAccount[]): void {
  console.log('\n\n💾 SQL to Update category_mapping:\n');
  console.log('-- Copy and paste this into Supabase SQL Editor\n');
  console.log('-- =====================================================');
  
  const mappings: Record<string, string[]> = {
    'mercaderia': ['Cost of Goods Sold', 'COGS', 'Cost of Sales'],
    'servicios': ['Office Expenses', 'Contract Labor', 'Professional Services'],
    'marketing': ['Advertising & Marketing', 'Marketing'],
    'transporte': ['Vehicle Expenses', 'Auto', 'Car and Truck'],
    'operacion': ['Operating Expenses', 'General & Administrative'],
    'personal': ['Payroll Expenses', 'Wages', 'Salaries'],
    'instalaciones': ['Rent or Lease', 'Rent Expense'],
    'impuestos': ['Taxes & Licenses', 'Tax'],
    'equipamiento': ['Equipment Rental', 'Equipment'],
    'alimentacion': ['Meals & Entertainment', 'Meals'],
    'otros': ['Other Expenses', 'Miscellaneous'],
  };
  
  Object.entries(mappings).forEach(([category, keywords]) => {
    const match = accounts.find(acc => 
      keywords.some(keyword => 
        acc.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (match) {
      console.log(`UPDATE category_mapping`);
      console.log(`SET qb_account_id = '${match.id}'`);
      console.log(`WHERE manu_category = '${category}';`);
      console.log('');
    }
  });
  
  console.log('-- =====================================================\n');
}

async function saveToFile(data: OutputAccount[]): Promise<void> {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    await Deno.writeTextFile(OUTPUT_FILE, jsonContent);
    console.log(`✅ Accounts saved to ${OUTPUT_FILE}\n`);
  } catch (error) {
    console.error(`❌ Error saving to file: ${error}`);
    throw error;
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('🚀 QuickBooks Account ID Fetcher\n');
  console.log('='.repeat(60));
  
  // Validate credentials
  if (ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE' || REALM_ID === 'YOUR_REALM_ID_HERE') {
    console.error('❌ ERROR: Please update ACCESS_TOKEN and REALM_ID in the script!');
    console.error('\nTo get these values:');
    console.error('1. Connect QuickBooks in the MANU app');
    console.error('2. Check the quickbooks_connections table in Supabase');
    console.error('3. Or get them from QuickBooks Developer Dashboard\n');
    Deno.exit(1);
  }
  
  try {
    // Fetch accounts
    const accounts = await getQBAccounts();
    
    if (accounts.length === 0) {
      console.log('⚠️  No accounts found.');
      Deno.exit(0);
    }
    
    // Format for output
    const outputAccounts = formatAccountsForOutput(accounts);
    
    // Display results
    console.log(`\n✅ Found ${outputAccounts.length} expense accounts:\n`);
    console.log('ID'.padEnd(15) + ' | ' + 'Name'.padEnd(40) + ' | Type');
    console.log('-'.repeat(70));
    
    outputAccounts.forEach((acc) => {
      console.log(
        acc.id.padEnd(15) + ' | ' + 
        acc.name.padEnd(40) + ' | ' + 
        acc.type
      );
    });
    
    // Suggest mappings
    suggestMappings(outputAccounts);
    
    // Generate SQL
    generateSQLUpdates(outputAccounts);
    
    // Save to file
    await saveToFile(outputAccounts);
    
    console.log('✨ Done! Check qb_accounts.json for the full list.\n');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    Deno.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { getQBAccounts, formatAccountsForOutput };
