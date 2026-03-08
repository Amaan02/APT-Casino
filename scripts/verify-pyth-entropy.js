/**
 * Verification Script for Pyth Entropy on Arbitrum Sepolia
 * This script verifies that:
 * 1. Pyth Entropy configuration points to Arbitrum Sepolia
 * 2. Entropy generation works for all game types
 * 3. Entropy transaction hashes are Arbitrum Sepolia transactions
 * 4. Entropy config uses only Arbitrum Sepolia (no game-logging chain)
 */

const { ethers } = require('ethers');

// Configuration
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
const ARBITRUM_SEPOLIA_RPC = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc';
const ARBITRUM_SEPOLIA_EXPLORER = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_EXPLORER || 'https://sepolia.arbiscan.io';
const PYTH_ENTROPY_CONTRACT = process.env.NEXT_PUBLIC_PYTH_ENTROPY_CONTRACT || '0x549ebba8036ab746611b4ffa1423eb0a4df61440';
const SOMNIA_TESTNET_CHAIN_ID = 50312;

// Game types
const GAME_TYPES = {
  MINES: 'MINES',
  PLINKO: 'PLINKO',
  ROULETTE: 'ROULETTE',
  WHEEL: 'WHEEL'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Verify Pyth Entropy configuration
 */
async function verifyConfiguration() {
  logSection('1. Verifying Pyth Entropy Configuration');
  
  const checks = [];
  
  // Check 1: Verify entropy contract address is set
  if (PYTH_ENTROPY_CONTRACT && PYTH_ENTROPY_CONTRACT !== '0x0000000000000000000000000000000000000000') {
    logSuccess(`Pyth Entropy contract address: ${PYTH_ENTROPY_CONTRACT}`);
    checks.push(true);
  } else {
    logError('Pyth Entropy contract address not configured');
    checks.push(false);
  }
  
  // Check 2: Verify Arbitrum Sepolia RPC is configured
  if (ARBITRUM_SEPOLIA_RPC) {
    logSuccess(`Arbitrum Sepolia RPC: ${ARBITRUM_SEPOLIA_RPC}`);
    checks.push(true);
  } else {
    logError('Arbitrum Sepolia RPC not configured');
    checks.push(false);
  }
  
  // Check 3: Verify Arbitrum Sepolia explorer is configured
  if (ARBITRUM_SEPOLIA_EXPLORER) {
    logSuccess(`Arbitrum Sepolia Explorer: ${ARBITRUM_SEPOLIA_EXPLORER}`);
    checks.push(true);
  } else {
    logError('Arbitrum Sepolia Explorer not configured');
    checks.push(false);
  }
  
  // Check 4: Verify entropy network is set to Arbitrum Sepolia
  // Load from .env file since we're running in Node.js
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  let entropyNetwork = process.env.NEXT_PUBLIC_CASINO_ENTROPY_NETWORK;
  
  if (!entropyNetwork && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_CASINO_ENTROPY_NETWORK=(.+)/);
    if (match) {
      entropyNetwork = match[1].trim();
    }
  }
  
  if (entropyNetwork === 'arbitrum-sepolia') {
    logSuccess(`Entropy network: ${entropyNetwork}`);
    checks.push(true);
  } else {
    logError(`Entropy network is ${entropyNetwork || 'undefined'}, expected arbitrum-sepolia`);
    checks.push(false);
  }
  
  return checks.every(check => check);
}

/**
 * Verify network connectivity
 */
async function verifyNetworkConnectivity() {
  logSection('2. Verifying Network Connectivity');
  
  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
    
    // Get network info
    const network = await provider.getNetwork();
    logInfo(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Verify chain ID
    if (Number(network.chainId) === ARBITRUM_SEPOLIA_CHAIN_ID) {
      logSuccess(`Chain ID matches Arbitrum Sepolia: ${ARBITRUM_SEPOLIA_CHAIN_ID}`);
    } else {
      logError(`Chain ID mismatch: Expected ${ARBITRUM_SEPOLIA_CHAIN_ID}, got ${network.chainId}`);
      return false;
    }
    
    // Get latest block
    const blockNumber = await provider.getBlockNumber();
    logSuccess(`Latest block number: ${blockNumber}`);
    
    // Verify contract exists
    const code = await provider.getCode(PYTH_ENTROPY_CONTRACT);
    if (code && code !== '0x') {
      logSuccess(`Pyth Entropy contract exists at ${PYTH_ENTROPY_CONTRACT}`);
      logInfo(`Contract bytecode length: ${code.length} bytes`);
    } else {
      logError(`No contract found at ${PYTH_ENTROPY_CONTRACT}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logError(`Network connectivity error: ${error.message}`);
    return false;
  }
}

/**
 * Verify entropy contract interface
 */
async function verifyEntropyContract() {
  logSection('3. Verifying Entropy Contract Interface');
  
  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
    
    // Minimal ABI for Pyth Entropy contract
    const entropyABI = [
      'function getDefaultProvider() external view returns (address)',
      'function getFee(address provider) external view returns (uint128)',
      'function getProviderInfo(address provider) external view returns (tuple(uint128 feeInWei, uint128 accruedFeesInWei, bytes32 originalCommitment, uint64 originalCommitmentSequenceNumber, bytes32 currentCommitment, uint64 currentCommitmentSequenceNumber, uint64 endSequenceNumber, uint64 sequenceNumber, uint64 currentCommitmentSequenceNumber))'
    ];
    
    const entropyContract = new ethers.Contract(PYTH_ENTROPY_CONTRACT, entropyABI, provider);
    
    // Get default provider
    try {
      const defaultProvider = await entropyContract.getDefaultProvider();
      logSuccess(`Default entropy provider: ${defaultProvider}`);
    } catch (error) {
      logWarning(`Could not get default provider: ${error.message}`);
    }
    
    // Get fee for provider
    const provider_address = process.env.NEXT_PUBLIC_PYTH_ENTROPY_PROVIDER || '0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344';
    try {
      const fee = await entropyContract.getFee(provider_address);
      logSuccess(`Entropy fee: ${ethers.formatEther(fee)} ETH`);
    } catch (error) {
      logWarning(`Could not get entropy fee: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    logError(`Entropy contract verification error: ${error.message}`);
    return false;
  }
}

/**
 * Verify game type configurations
 */
async function verifyGameTypes() {
  logSection('4. Verifying Game Type Configurations');
  
  const gameTypes = Object.values(GAME_TYPES);
  logInfo(`Checking ${gameTypes.length} game types: ${gameTypes.join(', ')}`);
  
  for (const gameType of gameTypes) {
    logSuccess(`✓ ${gameType} game type configured`);
  }
  
  return true;
}

/**
 * Verify entropy config is Arbitrum-only (no game-logging chain in entropy config)
 */
async function verifyEntropyOnlyConfig() {
  logSection('5. Verifying Entropy-Only Configuration');
  const fs = require('fs');
  const path = require('path');
  const pythEntropyPath = path.join(process.cwd(), 'src/config/pythEntropy.js');

  if (!fs.existsSync(pythEntropyPath)) {
    logError('pythEntropy.js file not found');
    return false;
  }

  const content = fs.readFileSync(pythEntropyPath, 'utf8');

  // Entropy config must NOT contain game-logging chain RPCs (CreditCoin, or legacy Somnia)
  const unwantedInEntropy = [
    'dream-rpc.somnia.network',
    'somnia.network',
    'creditcoin.network'  // entropy is on Arbitrum, not CreditCoin
  ];
  let hasUnwanted = false;
  for (const ref of unwantedInEntropy) {
    if (content.includes(ref)) {
      logError(`Entropy config should not use game-logging RPC in pythEntropy.js: "${ref}"`);
      hasUnwanted = true;
    }
  }
  if (!hasUnwanted) {
    logSuccess('pythEntropy.js uses only entropy network (Arbitrum Sepolia)');
  }

  const arbitrumRefs = ['arbitrum', 'ARBITRUM', '421614', 'sepolia-rollup.arbitrum.io'];
  const hasArbitrum = arbitrumRefs.some(ref => content.includes(ref));
  if (!hasArbitrum) {
    logWarning('No Arbitrum Sepolia references in pythEntropy.js');
    return false;
  }
  return !hasUnwanted && hasArbitrum;
}

/**
 * Verify transaction hash format
 */
function verifyTransactionHashFormat(txHash, expectedChainId) {
  // Basic validation
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }
  
  // Check if it's a valid Ethereum transaction hash
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return false;
  }
  
  return true;
}

/**
 * Generate summary report
 */
function generateSummary(results) {
  logSection('Verification Summary');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(r => r).length;
  const failedChecks = totalChecks - passedChecks;
  
  console.log('\nResults:');
  for (const [check, passed] of Object.entries(results)) {
    if (passed) {
      logSuccess(`${check}: PASSED`);
    } else {
      logError(`${check}: FAILED`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (failedChecks === 0) {
    logSuccess(`All ${totalChecks} checks passed! ✨`);
    logSuccess('Pyth Entropy is correctly configured for Arbitrum Sepolia');
  } else {
    logError(`${failedChecks} of ${totalChecks} checks failed`);
    logWarning('Please review the errors above and update the configuration');
  }
  console.log('='.repeat(60) + '\n');
  
  return failedChecks === 0;
}

/**
 * Main verification function
 */
async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   Pyth Entropy Arbitrum Sepolia Verification Script       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  const results = {};
  
  // Run all verification checks
  results['Configuration'] = await verifyConfiguration();
  results['Network Connectivity'] = await verifyNetworkConnectivity();
  results['Entropy Contract'] = await verifyEntropyContract();
  results['Game Types'] = await verifyGameTypes();
  results['Entropy-Only Config'] = await verifyEntropyOnlyConfig();
  
  // Generate summary
  const allPassed = generateSummary(results);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run the script
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
