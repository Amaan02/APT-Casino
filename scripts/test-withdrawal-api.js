/**
 * Test Withdrawal API
 * 
 * This script tests the withdrawal API endpoint to ensure it works correctly
 * with CreditCoin Testnet.
 * 
 * NOTE: This requires the Next.js dev server to be running.
 * Run: npm run dev (in another terminal)
 */

const { ethers } = require('ethers');

async function testWithdrawalAPI() {
  console.log('🧪 Testing Withdrawal API\n');

  // Test configuration
  const API_URL = 'http://localhost:3000/api/withdraw';
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'; // Random test address
  const TEST_AMOUNT = '0.001'; // Small test amount

  console.log('Configuration:');
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Test Address: ${TEST_ADDRESS}`);
  console.log(`  Test Amount: ${TEST_AMOUNT} CTC\n`);

  try {
    // Test 1: GET request to check treasury balance
    console.log('Test 1: Checking treasury balance...');
    const getResponse = await fetch(API_URL, {
      method: 'GET',
    });

    if (!getResponse.ok) {
      throw new Error(`GET request failed: ${getResponse.status} ${getResponse.statusText}`);
    }

    const balanceData = await getResponse.json();
    console.log('✅ Treasury balance retrieved:');
    console.log(`   Address: ${balanceData.treasuryWalletAddress}`);
    console.log(`   Balance: ${balanceData.walletBalance} CTC`);
    console.log(`   Network: ${balanceData.network}`);
    console.log(`   Status: ${balanceData.status}\n`);

    // Verify sufficient balance
    const balance = parseFloat(balanceData.walletBalance);
    if (balance < parseFloat(TEST_AMOUNT)) {
      console.log('⚠️  Treasury balance too low for withdrawal test');
      console.log('   Skipping withdrawal test\n');
      return;
    }

    // Test 2: POST request to test withdrawal (COMMENTED OUT - uncomment to test actual withdrawal)
    console.log('Test 2: Testing withdrawal endpoint...');
    console.log('⚠️  Actual withdrawal test is commented out to prevent accidental transfers');
    console.log('   To test actual withdrawal, uncomment the code in this script\n');

    /*
    // UNCOMMENT THIS SECTION TO TEST ACTUAL WITHDRAWAL
    const postResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: TEST_ADDRESS,
        amount: TEST_AMOUNT,
      }),
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.json();
      throw new Error(`POST request failed: ${errorData.error || postResponse.statusText}`);
    }

    const withdrawalData = await postResponse.json();
    console.log('✅ Withdrawal successful:');
    console.log(`   Transaction Hash: ${withdrawalData.transactionHash}`);
    console.log(`   Amount: ${withdrawalData.amount} CTC`);
    console.log(`   To Address: ${withdrawalData.toAddress}`);
    console.log(`   Network: ${withdrawalData.network}`);
    console.log(`   Status: ${withdrawalData.status}\n`);
    console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/tx/${withdrawalData.transactionHash}\n`);
    */

    console.log('✅ Withdrawal API tests completed successfully!\n');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Could not connect to API server');
      console.error('   Make sure the Next.js dev server is running:');
      console.error('   Run: npm run dev\n');
    } else {
      console.error('❌ Test failed:', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the test
testWithdrawalAPI()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
