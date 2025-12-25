import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.QB_CLIENT_ID;
const CLIENT_SECRET = process.env.QB_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.QB_REFRESH_TOKEN;

async function refreshAccessToken() {
  try {
    console.log('🔄 Refreshing QuickBooks access token...\n');
    
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Missing QB_CLIENT_ID, QB_CLIENT_SECRET, or QB_REFRESH_TOKEN in .env');
    }
    
    const response = await axios.post(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );

    console.log('✅ Token refreshed successfully!\n');
    console.log('📋 Update your .env file with these new values:\n');
    console.log('═'.repeat(80));
    console.log(`QB_ACCESS_TOKEN=${response.data.access_token}`);
    console.log(`QB_REFRESH_TOKEN=${response.data.refresh_token}`);
    console.log('═'.repeat(80));
    console.log(`\n⏰ Token expires in: ${response.data.expires_in} seconds (${Math.floor(response.data.expires_in / 60)} minutes)\n`);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
}

refreshAccessToken();

