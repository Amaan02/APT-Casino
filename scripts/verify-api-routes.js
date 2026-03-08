/**
 * API Routes Verification Script
 *
 * Verifies that all API routes are correctly configured for CreditCoin Testnet:
 * - Deposit/Withdraw/Treasury: CreditCoin Testnet
 * - Entropy APIs: Arbitrum Sepolia (Pyth Entropy)
 * - Game Result APIs: Support CreditCoin transaction hashes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying API Routes Configuration (CreditCoin)...\n');

const checks = { passed: 0, failed: 0, warnings: 0 };

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('  ❌ File not found');
    checks.failed++;
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function verifyCreditCoin(content) {
  const has = (s) => content.includes(s);
  return [
    has('creditcoinTestnetConfig') || has('CREDITCOIN_') ? { pass: true, msg: '  ✅ Uses CreditCoin configuration' } : { pass: false, msg: '  ❌ Missing CreditCoin configuration' },
    has('CTC') || has('CreditCoin') ? { pass: true, msg: '  ✅ Uses CreditCoin/CTC' } : { pass: false, msg: '  ⚠️  No CreditCoin reference' }
  ];
}

function verifyArbitrum(content) {
  const has = (s) => content.includes(s);
  return has('ARBITRUM_SEPOLIA') || has('arbitrum-sepolia')
    ? [{ pass: true, msg: '  ✅ Uses Arbitrum Sepolia configuration' }]
    : [{ pass: false, msg: '  ❌ Missing Arbitrum Sepolia configuration' }];
}

// Test 1: Deposit API (CreditCoin Testnet)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 1: Deposit API - CreditCoin Testnet');
console.log('═══════════════════════════════════════════════════════');
const depositContent = checkFile(path.join(__dirname, '../src/app/api/deposit/route.js'));
if (depositContent) {
  verifyCreditCoin(depositContent).forEach(r => { console.log(r.msg); r.pass ? checks.passed++ : checks.failed++; });
}

// Test 2: Withdraw API (CreditCoin Testnet)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 2: Withdraw API - CreditCoin Testnet');
console.log('═══════════════════════════════════════════════════════');
const withdrawContent = checkFile(path.join(__dirname, '../src/app/api/withdraw/route.js'));
if (withdrawContent) {
  verifyCreditCoin(withdrawContent).forEach(r => { console.log(r.msg); r.pass ? checks.passed++ : checks.failed++; });
}

// Test 3: Treasury Balance API (CreditCoin for treasury, Arbitrum for entropy)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 3: Treasury Balance API - Dual Network');
console.log('═══════════════════════════════════════════════════════');
const treasuryContent = checkFile(path.join(__dirname, '../src/app/api/treasury-balance/route.js'));
if (treasuryContent) {
  if (treasuryContent.includes('creditcoinTestnetConfig') || treasuryContent.includes('CREDITCOIN_')) {
    console.log('  ✅ Uses CreditCoin for treasury');
    checks.passed++;
  } else {
    console.log('  ❌ Missing CreditCoin treasury configuration');
    checks.failed++;
  }
  if (treasuryContent.includes('PYTH_ENTROPY_CONFIG') || treasuryContent.includes('arbitrum-sepolia')) {
    console.log('  ✅ References Arbitrum Sepolia for entropy');
    checks.passed++;
  } else {
    console.log('  ⚠️  No Arbitrum Sepolia entropy reference');
    checks.warnings++;
  }
}

// Test 4: Generate Entropy API (MUST use Arbitrum Sepolia)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 4: Generate Entropy API - Arbitrum Sepolia (CRITICAL)');
console.log('═══════════════════════════════════════════════════════');
const entropyContent = checkFile(path.join(__dirname, '../src/app/api/generate-entropy/route.js'));
if (entropyContent) {
  verifyArbitrum(entropyContent).forEach(r => { console.log(r.msg); r.pass ? checks.passed++ : checks.failed++; });
  const hasCreditCoinInEntropy = entropyContent.includes('creditcoinTestnetConfig') || entropyContent.includes('CREDITCOIN_RPC');
  if (hasCreditCoinInEntropy) {
    console.log('  ❌ CRITICAL: Entropy API should not use CreditCoin for entropy');
    checks.failed++;
  } else {
    console.log('  ✅ Correctly isolated (uses Arbitrum only for entropy)');
    checks.passed++;
  }
}

// Test 5: Pyth Entropy Test API (Arbitrum Sepolia)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 5: Pyth Entropy Test API - Arbitrum Sepolia');
console.log('═══════════════════════════════════════════════════════');
const pythContent = checkFile(path.join(__dirname, '../src/app/api/pyth-entropy-test/route.js'));
if (pythContent) {
  if (pythContent.includes('PythEntropyService')) {
    console.log('  ✅ Uses PythEntropyService');
    checks.passed++;
  } else {
    console.log('  ❌ Missing PythEntropyService');
    checks.failed++;
  }
  if (pythContent.includes('DO NOT migrate') || pythContent.includes('Arbitrum Sepolia')) {
    console.log('  ✅ Has network architecture documentation');
    checks.passed++;
  } else {
    console.log('  ⚠️  Missing network architecture documentation');
    checks.warnings++;
  }
}

// Test 6: Save Game Result API (CreditCoin tx hash)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 6: Save Game Result API - CreditCoin Integration');
console.log('═══════════════════════════════════════════════════════');
const saveResultContent = checkFile(path.join(__dirname, '../src/pages/api/games/save-result.js'));
if (saveResultContent) {
  if (saveResultContent.includes('creditcoinTxHash') || saveResultContent.includes('somniaTxHash')) {
    console.log('  ✅ Accepts CreditCoin transaction hash');
    checks.passed++;
  } else {
    console.log('  ❌ Missing CreditCoin transaction hash support');
    checks.failed++;
  }
  if (saveResultContent.includes('creditcoinBlockNumber') || saveResultContent.includes('somniaBlockNumber')) {
    console.log('  ✅ Accepts CreditCoin block number');
    checks.passed++;
  } else {
    console.log('  ⚠️  Missing CreditCoin block number support');
    checks.warnings++;
  }
  if (saveResultContent.includes('vrfRequestId')) {
    console.log('  ✅ Maintains VRF request ID (entropy)');
    checks.passed++;
  } else {
    console.log('  ❌ Missing VRF request ID');
    checks.failed++;
  }
}

// Test 7: Game History API (CreditCoin tx hashes)
console.log('\n═══════════════════════════════════════════════════════');
console.log('TEST 7: Game History API - Dual Network Support');
console.log('═══════════════════════════════════════════════════════');
const historyContent = checkFile(path.join(__dirname, '../src/pages/api/games/history.js'));
if (historyContent) {
  if (historyContent.includes('GameHistoryService')) {
    console.log('  ✅ Uses GameHistoryService');
    checks.passed++;
  } else {
    console.log('  ❌ Missing GameHistoryService');
    checks.failed++;
  }
  if (historyContent.includes('CreditCoin') || historyContent.includes('creditcoin')) {
    console.log('  ✅ Has CreditCoin / network documentation');
    checks.passed++;
  } else {
    console.log('  ⚠️  Missing network architecture documentation');
    checks.warnings++;
  }
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('VERIFICATION SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 All API routes are correctly configured!');
  console.log('\nNetwork Architecture:');
  console.log('  • Deposits/Withdrawals: CreditCoin Testnet (CTC)');
  console.log('  • Treasury Balance: CreditCoin Testnet (CTC)');
  console.log('  • Game Logging: CreditCoin Testnet (on-chain verification)');
  console.log('  • Entropy/VRF: Arbitrum Sepolia (provably fair randomness)');
  process.exit(0);
} else {
  console.log('\n❌ Some API routes need attention. Please review the failures above.');
  process.exit(1);
}
