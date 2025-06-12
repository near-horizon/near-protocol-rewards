import axios from 'axios';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { formatError } from '../src/utils/format-error';

async function verifyNEARBlocksAPI() {
  // Load environment with explicit path
  const envPath = resolve(process.cwd(), '.env.test');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('❌ Error loading .env.test file:', result.error);
    process.exit(1);
  }

  // Verify environment variables
  const apiKey = process.env.NEAR_API_KEY;
  const account = process.env.NEAR_ACCOUNT;
  const apiUrl = process.env.NEAR_API_URL || 'https://api.nearblocks.io/v1';

  if (!apiKey || !account) {
    console.error('❌ Missing required environment variables:');
    if (!apiKey) console.error('- NEAR_API_KEY');
    if (!account) console.error('- NEAR_ACCOUNT');
    process.exit(1);
  }

  const api = axios.create({
    baseURL: apiUrl,
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey
    },
    timeout: 10000
  });

  try {
    console.log('🔍 Verifying NEARBlocks API access...');
    
    // Test transactions endpoint
    console.log('\n📊 Testing transactions endpoint...');
    const txResponse = await api.get(`/account/${account}/txns`);
    if (txResponse.data && txResponse.data.txns) {
      console.log('✅ Transactions endpoint:', {
        count: txResponse.data.txns.length,
        totalAmount: txResponse.data.total_amount
      });
    }

    // Test contract endpoint
    console.log('\n📝 Testing contract endpoint...');
    const contractResponse = await api.get(`/account/${account}/contract`);
    if (contractResponse.data && contractResponse.data.contract) {
      console.log('✅ Contract endpoint:', {
        transactionsCount: contractResponse.data.contract.transactions_count,
        uniqueCallers: contractResponse.data.contract.unique_callers_count,
        blockHeight: contractResponse.data.contract.block_height
      });
    }

    // Test price endpoint
    console.log('\n💰 Testing price endpoint...');
    const priceResponse = await api.get('/stats/price');
    if (priceResponse.data && priceResponse.data.near) {
      console.log('✅ Price endpoint:', {
        usd: priceResponse.data.near.usd,
        timestamp: new Date(priceResponse.data.near.timestamp).toISOString()
      });
    }

    // Check rate limits if available in headers
    const rateLimit = txResponse.headers['x-ratelimit-remaining'];
    if (rateLimit) {
      console.log('\nℹ️  Rate Limit Information:');
      console.log(`- Remaining: ${rateLimit}`);
    }

    console.log('\n✨ All NEARBlocks API endpoints verified successfully!');

  } catch (error: any) {
    console.error('\n❌ Verification failed:');
    if (error.response) {
      if (error.response.status === 401) {
        console.error('Invalid API key');
        console.error('Please check your NEAR_API_KEY in .env.test');
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded');
        console.error('Please wait before trying again');
      } else {
        console.error(`HTTP ${error.response.status}:`, error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Could not connect to NEARBlocks API');
      console.error('Please check your internet connection and NEAR_API_URL');
    } else {
      console.error('Unexpected error:', formatError(error));
    }
    process.exit(1);
  }
}

// Run verification
console.log('🚀 Starting NEARBlocks API verification...');
verifyNEARBlocksAPI().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
