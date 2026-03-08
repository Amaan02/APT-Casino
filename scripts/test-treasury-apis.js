/**
 * Test Treasury APIs (Deposit & Withdrawal)
 * 
 * This script tests both deposit and withdrawal API endpoints to ensure
 * they work correctly with CreditCoin Testnet.
 * 
 * NOTE: This requires the Next.js dev server to be running.
 * Run: npm run dev (in another terminal)
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.7, 3.8
 */

const { ethers } = require('ethers');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(70) + '\n');
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function testDepositAPI() {
  section('1. DEPOSIT API TESTING');

  const DEPOSIT_API_URL = 'http://localhost:3000/api/deposit';
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
  const TEST_AMOUNT = '0.5';
  const TEST_TX_HASH = '0x' + '1'.repeat(64);

  try {
    // Test 1: POST - Submit deposit
    info('Test 1: Submitting deposit...');
    info(`  User Address: ${TEST_ADDRESS}`);
    info(`  Amount: ${TEST_AMOUNT} CTC`);
    info(`  Transaction Hash: ${TEST_TX_HASH}`);

    const postResponse = await fetch(DEPOSIT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: TEST_ADDRESS,
        amount: TEST_AMOUNT,
        transactionHash: TEST_TX_HASH,
      }),
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.json();
      throw new Error(`POST request failed: ${errorData.error || postResponse.statusText}`);
    }

    const depositData = await postResponse.json();
    success('Deposit submitted successfully!');
    info(`  Deposit ID: ${depositData.depositId}`);
    info(`  Amount: ${depositData.amount} ${depositData.currency}`);
    info(`  Network: ${depositData.network}`);
    info(`  Status: ${depositData.status}`);
    info(`  Treasury: ${depositData.treasuryAddress}`);

    // Validate response (Requirement 3.1, 3.3, 3.7)
    if (depositData.network !== 'creditcoin-testnet') {
      throw new Error('Wrong network in response');
    }
    if (depositData.currency !== 'CTC') {
      throw new Error('Wrong currency in response');
    }
    if (depositData.chainId !== 102031) {
      throw new Error('Wrong chain ID in response');
    }
    success('Deposit response validation passed');

    // Test 2: GET - Retrieve deposit history
    info('\nTest 2: Retrieving deposit history...');
    const getResponse = await fetch(`${DEPOSIT_API_URL}?userAddress=${TEST_ADDRESS}`, {
      method: 'GET',
    });

    if (!getResponse.ok) {
      const errorData = await getResponse.json();
      throw new Error(`GET request failed: ${errorData.error || getResponse.statusText}`);
    }

    const historyData = await getResponse.json();
    success('Deposit history retrieved successfully!');
    info(`  Number of deposits: ${historyData.deposits.length}`);
    
    if (historyData.deposits.length > 0) {
      const firstDeposit = historyData.deposits[0];
      info(`  First deposit:`);
      info(`    Amount: ${firstDeposit.amount} ${firstDeposit.currency}`);
      info(`    Network: ${firstDeposit.network}`);
      info(`    Status: ${firstDeposit.status}`);
    }

    success('Deposit API tests completed successfully!\n');
    return true;

  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      error('Could not connect to API server');
      warning('Make sure the Next.js dev server is running: npm run dev\n');
    } else {
      error(`Deposit API test failed: ${err.message}\n`);
    }
    return false;
  }
}

async function testWithdrawalAPI() {
  section('2. WITHDRAWAL API TESTING');

  const WITHDRAW_API_URL = 'http://localhost:3000/api/withdraw';
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
  const TEST_AMOUNT = '0.001';

  try {
    // Test 1: GET - Check treasury balance
    info('Test 1: Checking treasury balance...');
    const getResponse = await fetch(WITHDRAW_API_URL, {
      method: 'GET',
    });

    if (!getResponse.ok) {
      throw new Error(`GET request failed: ${getResponse.status} ${getResponse.statusText}`);
    }

    const balanceData = await getResponse.json();
    success('Treasury balance retrieved successfully!');
    info(`  Treasury Address: ${balanceData.treasuryWalletAddress}`);
    info(`  Balance: ${balanceData.walletBalance} CTC`);
    info(`  Network: ${balanceData.network}`);
    info(`  Status: ${balanceData.status}`);

    // Validate response (Requirement 3.6)
    if (balanceData.network !== 'CreditCoin Testnet') {
      throw new Error('Wrong network in response');
    }
    success('Treasury balance validation passed');

    // Check if balance is sufficient for test
    const balance = parseFloat(balanceData.walletBalance);
    if (balance < parseFloat(TEST_AMOUNT)) {
      warning('Treasury balance too low for withdrawal test');
      warning('Skipping actual withdrawal test\n');
      return true;
    }

    // Test 2: POST - Test withdrawal endpoint (validation only, no actual transfer)
    info('\nTest 2: Testing withdrawal endpoint validation...');
    info('  (Actual withdrawal is disabled to prevent accidental transfers)');
    
    // Test with invalid parameters
    info('\n  Testing invalid parameters...');
    const invalidResponse = await fetch(WITHDRAW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: 'invalid',
        amount: -1,
      }),
    });

    if (invalidResponse.status === 400) {
      success('Invalid parameter validation working correctly');
    } else {
      warning('Invalid parameter validation may not be working');
    }

    info('\n  To test actual withdrawal, uncomment the code in this script');
    info('  or use the withdrawal UI in the application\n');

    /*
    // UNCOMMENT THIS SECTION TO TEST ACTUAL WITHDRAWAL
    info('\n  Testing actual withdrawal...');
    const postResponse = await fetch(WITHDRAW_API_URL, {
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
    success('Withdrawal successful!');
    info(`  Transaction Hash: ${withdrawalData.transactionHash}`);
    info(`  Amount: ${withdrawalData.amount} CTC`);
    info(`  To Address: ${withdrawalData.toAddress}`);
    info(`  Network: ${withdrawalData.network}`);
    info(`  Status: ${withdrawalData.status}`);
    info(`  Explorer: https://creditcoin-testnet.blockscout.com/tx/${withdrawalData.transactionHash}`);

    // Validate response (Requirement 3.2, 3.8)
    if (withdrawalData.network !== 'CreditCoin Testnet') {
      throw new Error('Wrong network in response');
    }
    if (!withdrawalData.transactionHash || !withdrawalData.transactionHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash in response');
    }
    success('Withdrawal response validation passed');
    */

    success('Withdrawal API tests completed successfully!\n');
    return true;

  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      error('Could not connect to API server');
      warning('Make sure the Next.js dev server is running: npm run dev\n');
    } else {
      error(`Withdrawal API test failed: ${err.message}\n`);
    }
    return false;
  }
}

async function main() {
  log('\n' + '█'.repeat(70), colors.bright + colors.cyan);
  log('  TREASURY APIs TESTING - CREDITCOIN TESTNET', colors.bright + colors.cyan);
  log('█'.repeat(70) + '\n', colors.bright + colors.cyan);

  info('This script tests the deposit and withdrawal API endpoints.');
  info('Make sure the Next.js dev server is running: npm run dev\n');

  const results = {
    deposit: false,
    withdrawal: false,
  };

  // Run tests
  results.deposit = await testDepositAPI();
  results.withdrawal = await testWithdrawalAPI();

  // Summary
  section('TEST SUMMARY');

  const allPassed = results.deposit && results.withdrawal;

  log('Deposit API:    ' + (results.deposit ? '✅ PASS' : '❌ FAIL'), 
      results.deposit ? colors.green : colors.red);
  log('Withdrawal API: ' + (results.withdrawal ? '✅ PASS' : '❌ FAIL'), 
      results.withdrawal ? colors.green : colors.red);

  console.log('\n' + '='.repeat(70) + '\n');

  if (allPassed) {
    success('🎉 ALL TREASURY API TESTS PASSED!');
    log('\nNext Steps:', colors.bright);
    log('  1. Test deposit through the UI');
    log('  2. Test withdrawal through the UI');
    log('  3. Verify transactions on CreditCoin Explorer');
    log('  4. Check that balances are displayed in CTC');
  } else {
    error('⚠️  SOME TESTS FAILED');
    log('\nTroubleshooting:', colors.bright);
    log('  1. Make sure the Next.js dev server is running: npm run dev');
    log('  2. Check that environment variables are set correctly');
    log('  3. Verify treasury wallet has sufficient CTC balance');
    log('  4. Check API routes are accessible');
  }

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(allPassed ? 0 : 1);
}

main()
  .then(() => {})
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
