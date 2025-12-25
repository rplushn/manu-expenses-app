import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || 'sandbox';
const REALM_ID = process.env.QB_REALM_ID || '';
const ACCESS_TOKEN = process.env.QB_ACCESS_TOKEN || '';
const USER_ID = process.env.QB_USER_ID || '';

const QBO_API_BASE = QB_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com/v3/company'
  : 'https://sandbox-quickbooks.api.intuit.com/v3/company';

interface QBAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  Active: boolean;
}

async function fetchAllAccounts(): Promise<QBAccount[]> {
  try {
    console.log(`🔄 Fetching QuickBooks accounts from ${QB_ENVIRONMENT.toUpperCase()}...\n`);
    
    if (!ACCESS_TOKEN) {
      throw new Error('QB_ACCESS_TOKEN not found in .env file');
    }
    
    if (!REALM_ID) {
      throw new Error('QB_REALM_ID not found in .env file');
    }
    
    const respons= await axios.get(
      `${QBO_API_BASE}/${REALM_ID}/query`,
      {
        params: {
          query: 'SELECT * FROM Account WHERE Active = true',
          minorversion: '73'
        },
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
      }
    );

    const accounts: QBAccount[] = response.data.QueryResponse.Account || [];
    return accounts;
  } catch (error: any) {
    console.error('❌ Error fetching accounts:', error.response?.data || error.message);
    throw error;
  }
}

function generateUpdateSQL(accounts: QBAccount[]): string {
  const categoryMappings: { [key: string]: string[] } = {
    mercaderia: ['Cost of Goods Sold', 'COGS', 'Inventory'],
    servicios: ['Service', 'Income', 'Revenue'],
    salarios: ['Payroll', 'Salary', 'Salaries', 'Wages'],
    utilidades: ['Utilities', 'Utility'],
    transporte: ['Transportation', 'Transport', 'Vehicle', 'Automobile', 'Fuel'],
    mantenimiento: ['Maintenance', 'Repairs', 'Repr'],
    otros: ['Other', 'Miscellaneous', 'General']
  };

  let sql = `-- UPDATE category_qb_mapping with QuickBooks Account IDs\n`;
  sql += `-- Environment: ${QB_ENVIRONMENT.toUpperCase()}\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    const matchedAccount = accounts.find(acc => 
      keywords.some(keyword => acc.Name.toLowerCase().includes(keyword.toLowerCase()))
    ) || accounts.find(acc => acc.AccountType === 'Expense');

    if (matchedAccount) {
      sql += `UPDATE public.category_qb_mapping\n`;
      sql += `SET qb_account_id = '${matchedAccount.Id}',\n`;
      sql += `    qb_account_name = '${matchedAccount.Name}',\n`;
      sql += `    updated_at = NOW()\n`;
      sql += `WHERE manu_category = '${category}'\n`;
      sql += `  AND usuario_id = '${USER_ID}';\n\n`;
    }
  }

  return sql;
}

async function main() {
  try {
    console.log('╔════════════════════);
    console.log('║       QuickBooks Account Fetcher & SQL Generator         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📍 Environment: ${QB_ENVIRONMENT.toUpperCase()}`);
    console.log(`📍 API Base: ${QBO_API_BASE}`);
    console.log(`📍 Realm ID: ${REALM_ID}\n`);
    
    const accounts = await fetchAllAccounts();
    
    console.log(`✅ Found ${accounts.length} active accounts\n`);
    
    console.log('═'.repeat(80));
    console.log('QUICKBOOKS ACCOUNTS LIST');
    console.log('═'.repeat(80) + '\n');
    
    accounts.forEach(acc => {
      console.log(`📌 ${acc.Name}`);
      console.log(`   ID: ${acc.Id} | Type: ${acc.AccountType}`);
      if (acc.AccountSubType) console.log(`   SubType: ${acc.AccountSubType}`);
      console.log('');
    });
    
    console.log('═'.repeat(80));
    
   le.log(sql);
    console.log('═'.repeat(80));
    
    console.log('\n✅ Copy the SQL above and run it in Supabase SQL Editor\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
