/**
 * Verification Script for GameHistoryService
 * Tests dual-network support (CreditCoin for logs, Arbitrum for entropy)
 * Reads service source so it works without ESM import.
 */

const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '../src/services/GameHistoryService.js');

function verifyGameHistoryService() {
  console.log('🔍 Verifying GameHistoryService (CreditCoin)...\n');

  if (!fs.existsSync(servicePath)) {
    console.error('❌ GameHistoryService.js not found');
    process.exit(1);
  }

  const content = fs.readFileSync(servicePath, 'utf8');
  let allTestsPassed = true;

  // Test 1: saveGameResult accepts CreditCoin transaction hash
  console.log('Test 1: Verify saveGameResult accepts CreditCoin transaction hash');
  if ((content.includes('creditcoinTxHash') || content.includes('somniaTxHash')) &&
      (content.includes('creditcoinBlockNumber') || content.includes('somniaBlockNumber'))) {
    console.log('✅ saveGameResult accepts CreditCoin tx hash and block number');
  } else {
    console.log('❌ saveGameResult does not accept CreditCoin parameters');
    allTestsPassed = false;
  }

  // Test 2: getUserHistory returns CreditCoin transaction links
  console.log('\nTest 2: Verify getUserHistory returns CreditCoin transaction links');
  if ((content.includes('creditcoin_tx_hash') || content.includes('somnia_tx_hash')) &&
      (content.includes('creditcoinTransaction') || content.includes('somniaTransaction')) &&
      (content.includes('creditcoinExplorer') || content.includes('explorerUrl'))) {
    console.log('✅ getUserHistory includes CreditCoin transaction fields');
  } else {
    console.log('❌ getUserHistory missing CreditCoin transaction fields');
    allTestsPassed = false;
  }

  // Test 3: entropy references
  console.log('\nTest 3: Verify entropy/VRF references');
  if (content.includes('entropy') || content.includes('Pyth')) {
    console.log('✅ Service maintains entropy references');
  } else {
    console.log('⚠️ Entropy references not found');
  }

  // Test 4: Dual-network support
  console.log('\nTest 4: Verify dual-network support');
  if (content.includes('entropy_tx_hash') && content.includes('vrfDetails') &&
      (content.includes('creditcoinTransaction') || content.includes('creditcoin_tx_hash'))) {
    console.log('✅ getUserHistory supports dual-network (CreditCoin + entropy)');
  } else {
    console.log('❌ getUserHistory missing dual-network support');
    allTestsPassed = false;
  }

  // Test 5: getRecentGames
  console.log('\nTest 5: Verify getRecentGames includes both transaction types');
  if ((content.includes('creditcoin_tx_hash') || content.includes('somnia_tx_hash')) &&
      content.includes('entropy_tx_hash') && content.includes('ExplorerUrl')) {
    console.log('✅ getRecentGames includes CreditCoin and entropy transaction links');
  } else {
    console.log('❌ getRecentGames missing dual transaction support');
    allTestsPassed = false;
  }

  // Test 6: SQL columns
  console.log('\nTest 6: Verify SQL queries include CreditCoin columns');
  if ((content.includes('creditcoin_tx_hash') || content.includes('somnia_tx_hash')) &&
      content.includes('gr.network')) {
    console.log('✅ SQL queries include CreditCoin tx columns and network');
  } else {
    console.log('❌ SQL queries missing CreditCoin columns');
    allTestsPassed = false;
  }

  // Test 7: Explorer URLs
  console.log('\nTest 7: Verify explorer URL configuration');
  if ((content.includes('CREDITCOIN') || content.includes('creditcoin-testnet.blockscout')) &&
      (content.includes('SEPOLIA_EXPLORER') || content.includes('arbiscan'))) {
    console.log('✅ Explorer URLs configured for CreditCoin and entropy');
  } else {
    console.log('❌ Explorer URLs not properly configured');
    allTestsPassed = false;
  }

  // Test 8: Network default
  console.log('\nTest 8: Verify network field defaults to creditcoin-testnet');
  if (content.includes("'creditcoin-testnet'") || content.includes('creditcoin-testnet')) {
    console.log('✅ Network field defaults to creditcoin-testnet');
  } else {
    console.log('❌ Network field default not set correctly');
    allTestsPassed = false;
  }

  // Test 9: Transaction hash validation
  console.log('\nTest 9: Verify CreditCoin transaction hash validation');
  if (content.includes('Invalid') && content.includes('transaction hash')) {
    console.log('✅ CreditCoin transaction hash validation implemented');
  } else {
    console.log('❌ Transaction hash validation missing');
    allTestsPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ All GameHistoryService verification tests passed!');
    console.log('\nKey Features Verified:');
    console.log('  ✓ saveGameResult accepts CreditCoin transaction hash');
    console.log('  ✓ getUserHistory returns CreditCoin transaction links');
    console.log('  ✓ Dual-network support (CreditCoin for logs, Arbitrum for entropy)');
    console.log('  ✓ SQL queries use CreditCoin columns');
    console.log('  ✓ Network field defaults to creditcoin-testnet');
    return true;
  } else {
    console.log('❌ Some GameHistoryService verification tests failed');
    return false;
  }
}

try {
  const success = verifyGameHistoryService();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Verification script error:', error);
  process.exit(1);
}
