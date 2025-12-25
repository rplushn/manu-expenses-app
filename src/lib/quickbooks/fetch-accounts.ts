// =====================================================
// QuickBooks Account Fetcher
// =====================================================
// Fetches all active accounts from QuickBooks API v2
// Generates SQL INSERT statements for category_qb_mapping
// =====================================================

// =====================================================
// CONFIGURATION
// =====================================================

const REALM_ID = '9341455987854302';
const ACCESS_TOKEN = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwieX5vcmciOiJIMCJ9..VlKKdV1WOBIUe9M72xZqaw.ymRs_rJuvQRrGEs9-auLZ7HLOVpJCz3ymrLF-cteVle4IW8vSYT61kvYPOPbH8OJ6W3P_lddRc13wdLQKN02yGj0VeS-_OUi61vApgP-Bb-pILifXkVl6vSuPs6RY075-l6yAFysFBSb37sKbF0G3xoekjuu5dMv9nm64b4SgXINsangl69JVYfViO1gYqZd5a_KPrfRWiCeC6pmi7rKqxA9707ElP1HxnNHV8QwCmGVep0e1uJj8NiWcbGwT3u0aMO0lY26jNHZ2OnGGOfJixCSsOugzBymX5stbUVG5vTRh27tSrl9pJ-EkHUL7VHftLcYkuBRHBT0lT3MH80zogs7GIshtDe1h1wiT7XvOsG3xi2EMdFsYcl0cVybsrspyTuwrNuuw-6D72LHlp30Z4j8y1Nxs3V95iCq5LEwpmh-PEUTcZ-eoYVJzFQwr8S9mDt1vfq-592pOLc3R2vPMsBVDTZxESdGTeha8wEBWSEbBV8ELTb_r3AhHPYmBeJWgu4-qkHAsrbEfAzcI_K6C8ONq3-ExKc_1ChVaxjHeYh2ZYf1WCf5LXCRxPd6ePFgY6e06GJGbBuxfWKNO5WyS6vcf4-Ys1-CXYhp9HqmVu-aa9_hhikfuFg9nJb6Fi16.lfGRAfU7Srakmuiwqaotig';
const BASE_URL = 'https://quickbooks.api.intuit.com/v2/company';

// =====================================================
// TYPES
// =====================================================

interface QBAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  FullyQualifiedName?: string;
  Active?: boolean;
}

interface GroupedAccounts {
  [accountType: string]: QBAccount[];
}

// MANU Categories (from types.ts)
const MANU_CATEGORIES = [
  'mercaderia',
  'servicios',
  'marketing',
  'transporte',
  'operacion',
  'personal',
  'instalaciones',
  'impuestos',
  'equipamiento',
  'alimentacion',
  'otros',
] as const;

// Mapping keywords for each MANU category
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  mercaderia: ['Cost of Goods Sold', 'COGS', 'Cost of Sales', 'Merchandise', 'Inventory'],
  servicios: ['Office Expenses', 'Contract Labor', 'Professional Services', 'Services', 'Consulting'],
  marketing: ['Advertising & Marketing', 'Marketing', 'Promotional', 'Advertising', 'Promotion'],
  transporte: ['Vehicle Expenses', 'Auto', 'Car and Truck', 'Transportation', 'Fuel', 'Gas'],
  operacion: ['Operating Expenses', 'General & Administrative', 'Operating', 'Utilities', 'Utilities: Electric', 'Utilities: Water'],
  personal: ['Payroll Expenses', 'Wages', 'Salaries', 'Payroll', 'Employee Benefits'],
  instalaciones: ['Rent or Lease', 'Rent Expense', 'Rent', 'Lease'],
  impuestos: ['Taxes & Licenses', 'Tax', 'Taxes', 'License'],
  equipamiento: ['Equipment Rental', 'Equipment', 'Equipment Expense', 'Machinery'],
  alimentacion: ['Meals & Entertainment', 'Meals', 'Entertainment', 'Food'],
  otros: ['Other Expenses', 'Miscellaneous', 'Other', 'Uncategorized'],
};

// =====================================================
// COLORS (ANSI codes)
// =====================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// =====================================================
// FUNCTIONS
// =====================================================

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message: string) {
  log(`\n${'='.repeat(70)}`, colors.cyan);
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`, colors.cyan);
  log('='.repeat(70), colors.cyan);
}

function logSection(message: string) {
  log(`\n${colors.bright}${colors.yellow}▶ ${message}${colors.reset}`);
}

async function fetchQBAccounts(): Promise<QBAccount[]> {
  try {
    logSection('🔍 Fetching accounts from QuickBooks API v2...');
    
    const query = "SELECT * FROM Account WHERE Active = true";
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/${REALM_ID}/query?query=${encodedQuery}`;
    
    log(`📡 URL: ${url}`, colors.dim);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    // Check for QuickBooks API errors
    if (data.fault) {
      throw new Error(`QuickBooks API Error: ${JSON.stringify(data.fault, null, 2)}`);
    }
    
    const accounts = data.QueryResponse?.Account || [];
    
    if (!Array.isArray(accounts)) {
      throw new Error('Unexpected response format: accounts is not an array');
    }
    
    log(`✅ Found ${accounts.length} active accounts`, colors.green);
    
    return accounts.map((acc: any) => ({
      Id: acc.Id || '',
      Name: acc.Name || '',
      AccountType: acc.AccountType || '',
      AccountSubType: acc.AccountSubType || '',
      FullyQualifiedName: acc.FullyQualifiedName || acc.Name || '',
      Active: acc.Active !== false,
    }));
  } catch (error) {
    log(`❌ Error fetching accounts: ${error}`, colors.red);
    throw error;
  }
}

function groupAccountsByType(accounts: QBAccount[]): GroupedAccounts {
  const grouped: GroupedAccounts = {};
  
  accounts.forEach(account => {
    const type = account.AccountType || 'Unknown';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(account);
  });
  
  // Sort types alphabetically
  const sorted: GroupedAccounts = {};
  Object.keys(grouped).sort().forEach(key => {
    sorted[key] = grouped[key];
  });
  
  return sorted;
}

function findBestMatch(accountName: string, keywords: string[]): number {
  const lowerName = accountName.toLowerCase();
  let score = 0;
  
  keywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerName.includes(lowerKeyword)) {
      score += 10;
      // Exact match gets bonus
      if (lowerName === lowerKeyword) {
        score += 50;
      }
      // Starts with gets bonus
      if (lowerName.startsWith(lowerKeyword)) {
        score += 20;
      }
    }
  });
  
  return score;
}

function findAccountForCategory(
  category: string,
  accounts: QBAccount[],
  preferredTypes: string[] = ['Expense', 'Cost of Goods Sold']
): QBAccount | null {
  const keywords = CATEGORY_KEYWORDS[category] || [];
  if (keywords.length === 0) return null;
  
  // Filter by preferred types first
  const filteredAccounts = accounts.filter(acc => 
    preferredTypes.includes(acc.AccountType)
  );
  
  if (filteredAccounts.length === 0) {
    // Fallback to all accounts
    return findBestMatchAccount(accounts, keywords);
  }
  
  return findBestMatchAccount(filteredAccounts, keywords);
}

function findBestMatchAccount(accounts: QBAccount[], keywords: string[]): QBAccount | null {
  let bestMatch: QBAccount | null = null;
  let bestScore = 0;
  
  accounts.forEach(account => {
    const score = findBestMatch(account.Name, keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = account;
    }
  });
  
  return bestMatch;
}

function generateSQLInserts(mappings: Map<string, QBAccount>): string {
  let sql = '\n-- =====================================================\n';
  sql += '-- SQL INSERT statements for category_qb_mapping\n';
  sql += '-- =====================================================\n';
  sql += '-- Copy and paste this into Supabase SQL Editor\n';
  sql += '-- Note: Replace auth.uid() with actual user_id if needed\n';
  sql += '-- =====================================================\n\n';
  
  mappings.forEach((account, category) => {
    sql += `INSERT INTO public.category_qb_mapping (\n`;
    sql += `  usuario_id,\n`;
    sql += `  manu_category,\n`;
    sql += `  qb_account_id,\n`;
    sql += `  qb_account_name\n`;
    sql += `) VALUES (\n`;
    sql += `  auth.uid(),\n`;
    sql += `  '${category}',\n`;
    sql += `  '${account.Id}',\n`;
    sql += `  '${account.Name.replace(/'/g, "''")}'\n`;
    sql += `)\n`;
    sql += `ON CONFLICT (usuario_id, manu_category)\n`;
    sql += `DO UPDATE SET\n`;
    sql += `  qb_account_id = EXCLUDED.qb_account_id,\n`;
    sql += `  qb_account_name = EXCLUDED.qb_account_name,\n`;
    sql += `  updated_at = NOW();\n\n`;
  });
  
  sql += '-- =====================================================\n';
  
  return sql;
}

function displayAccountsTable(grouped: GroupedAccounts): void {
  logHeader('📊 ALL ACCOUNTS BY TYPE');
  
  Object.entries(grouped).forEach(([type, accounts]) => {
    log(`\n${colors.bright}${colors.cyan}${type}${colors.reset} (${accounts.length} accounts)`, colors.cyan);
    log('-'.repeat(70), colors.dim);
    
    // Table header
    log(
      `${'ID'.padEnd(15)} | ${'Name'.padEnd(35)} | ${'SubType'.padEnd(20)}`,
      colors.bright
    );
    log('-'.repeat(70), colors.dim);
    
    // Table rows
    accounts.forEach(account => {
      const id = account.Id.padEnd(15);
      const name = (account.Name || '').padEnd(35).substring(0, 35);
      const subType = (account.AccountSubType || 'N/A').padEnd(20).substring(0, 20);
      log(`${id} | ${name} | ${subType}`);
    });
  });
}

function displayMappings(mappings: Map<string, QBAccount>, allAccounts: QBAccount[]): void {
  logHeader('🗺️  CATEGORY MAPPINGS');
  
  MANU_CATEGORIES.forEach(category => {
    const account = mappings.get(category);
    if (account) {
      log(`\n${colors.green}✓${colors.reset} ${colors.bright}${category}${colors.reset}`, colors.green);
      log(`  → ${account.Name} (ID: ${account.Id})`, colors.dim);
      log(`  → Type: ${account.AccountType}${account.AccountSubType ? ` / ${account.AccountSubType}` : ''}`, colors.dim);
    } else {
      log(`\n${colors.red}✗${colors.reset} ${colors.bright}${category}${colors.reset}`, colors.red);
      log(`  → ${colors.yellow}No matching account found${colors.reset}`, colors.yellow);
    }
  });
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  try {
    logHeader('🚀 QuickBooks Account Fetcher');
    log(`\n${colors.dim}Realm ID: ${REALM_ID}${colors.reset}`);
    log(`${colors.dim}Base URL: ${BASE_URL}${colors.reset}\n`);
    
    // Fetch accounts
    const accounts = await fetchQBAccounts();
    
    if (accounts.length === 0) {
      log('⚠️  No accounts found.', colors.yellow);
      return;
    }
    
    // Group by type
    const grouped = groupAccountsByType(accounts);
    
    // Display all accounts
    displayAccountsTable(grouped);
    
    // Find mappings
    logSection('🔍 Finding best account matches for MANU categories...');
    
    const mappings = new Map<string, QBAccount>();
    
    MANU_CATEGORIES.forEach(category => {
      const account = findAccountForCategory(category, accounts);
      if (account) {
        mappings.set(category, account);
        log(`  ${colors.green}✓${colors.reset} ${category} → ${account.Name}`, colors.green);
      } else {
        log(`  ${colors.yellow}⚠${colors.reset} ${category} → No match found`, colors.yellow);
      }
    });
    
    // Display mappings
    displayMappings(mappings, accounts);
    
    // Generate SQL
    logHeader('💾 GENERATED SQL');
    const sql = generateSQLInserts(mappings);
    log(sql, colors.bright);
    
    // Summary
    logHeader('📋 SUMMARY');
    log(`Total accounts found: ${colors.bright}${accounts.length}${colors.reset}`);
    log(`Account types: ${colors.bright}${Object.keys(grouped).length}${colors.reset}`);
    log(`Categories mapped: ${colors.bright}${mappings.size}${colors.reset} / ${MANU_CATEGORIES.length}`);
    
    if (mappings.size < MANU_CATEGORIES.length) {
      log(`\n${colors.yellow}⚠️  Warning: Some categories could not be mapped automatically.${colors.reset}`);
      log(`${colors.yellow}   You may need to manually update the SQL.${colors.reset}`);
    }
    
    log(`\n${colors.green}✅ Done! Copy the SQL above and paste it into Supabase SQL Editor.${colors.reset}\n`);
    
  } catch (error) {
    log(`\n${colors.red}❌ Script failed:${colors.reset}`, colors.red);
    log(`${colors.red}${error instanceof Error ? error.message : String(error)}${colors.reset}`, colors.red);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { fetchQBAccounts, findAccountForCategory, generateSQLInserts };

