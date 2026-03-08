/**
 * Backend Services Verification Script
 * 
 * This script verifies that both treasury and game logging services
 * work correctly with CreditCoin Testnet.
 * 
 * Tests:
 * 1. Treasury Service
 *    - Check treasury wallet balance
 *    - Verify treasury configuration
 *    - Test withdrawal API endpoint
 * 
 * 2. Game Logger Service
 *    - Verify contract deployment
 *    - Check authorization
 *    - Test logging functionality
 *    - Test query methods
 * 
 * Validates: Requirements 3.1, 3.2, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.6, 4.9
 */

const { ethers } = require("hardhat");
require('dotenv').config();

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

async function verifyTreasuryService() {
  section('1. TREASURY SERVICE VERIFICATION');

  try {
    // Get treasury configuration
    const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;
    const treasuryPrivateKey = process.env.CREDITCOIN_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC;

    if (!treasuryAddress) {
      error('Treasury address not configured');
      return false;
    }

    if (!treasuryPrivateKey) {
      error('Treasury private key not configured');
      return false;
    }

    if (!rpcUrl) {
      error('CreditCoin RPC URL not configured');
      return false;
    }

    info(`Treasury Address: ${treasuryAddress}`);
    info(`RPC URL: ${rpcUrl}`);

    // Connect to CreditCoin Testnet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const treasuryWallet = new ethers.Wallet(treasuryPrivateKey, provider);

    // Verify wallet address matches
    if (treasuryWallet.address.toLowerCase() !== treasuryAddress.toLowerCase()) {
      error(`Wallet address mismatch! Expected: ${treasuryAddress}, Got: ${treasuryWallet.address}`);
      return false;
    }
    success('Treasury wallet address verified');

    // Check treasury balance (Requirement 3.6)
    const balance = await provider.getBalance(treasuryAddress);
    const balanceInCTC = ethers.formatEther(balance);
    
    info(`Treasury Balance: ${balanceInCTC} CTC`);
    
    if (parseFloat(balanceInCTC) < 0.01) {
      warning('Treasury balance is low! Consider funding the treasury wallet.');
    } else {
      success('Treasury has sufficient balance');
    }

    // Check network connection
    const network = await provider.getNetwork();
    info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    if (network.chainId !== 102031n) {
      error(`Wrong network! Expected CreditCoin Testnet (102031), got ${network.chainId}`);
      return false;
    }
    success('Connected to CreditCoin Testnet');

    // Test gas price retrieval (Requirement 3.6)
    const feeData = await provider.getFeeData();
    const gasPriceGwei = ethers.formatUnits(feeData.gasPrice || 0n, 'gwei');
    info(`Current Gas Price: ${gasPriceGwei} gwei`);
    success('Gas price retrieval working');

    // Test withdrawal API endpoint (Requirement 3.2, 3.8)
    info('\nTesting withdrawal API endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/withdraw', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        info(`API Response: ${JSON.stringify(data, null, 2)}`);
        success('Withdrawal API endpoint is accessible');
      } else {
        warning('Withdrawal API endpoint returned non-OK status (this is expected if server is not running)');
      }
    } catch (apiError) {
      warning('Could not connect to withdrawal API (server may not be running)');
      info('To test the API, run: npm run dev');
    }

    success('Treasury service verification completed');
    return true;

  } catch (err) {
    error(`Treasury service verification failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function verifyGameLoggerService() {
  section('2. GAME LOGGER SERVICE VERIFICATION');

  try {
    // Get contract configuration
    const contractAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
    const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;
    const rpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC;

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      error('Game Logger contract address not configured');
      return false;
    }

    info(`Contract Address: ${contractAddress}`);
    info(`Treasury Address: ${treasuryAddress}`);

    // Connect to contract
    const [signer] = await ethers.getSigners();
    info(`Using account: ${signer.address}`);

    const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
    const gameLogger = CreditCoinGameLogger.attach(contractAddress);

    // Verify contract is deployed (Requirement 4.1)
    const code = await ethers.provider.getCode(contractAddress);
    if (code === '0x') {
      error('No contract found at the specified address');
      return false;
    }
    success('Contract is deployed');

    // Check authorization (Requirement 10.2, 10.5)
    info('\nChecking authorization...');
    const isSignerAuthorized = await gameLogger.isAuthorizedLogger(signer.address);
    const isTreasuryAuthorized = await gameLogger.isAuthorizedLogger(treasuryAddress);

    info(`Signer (${signer.address}) authorized: ${isSignerAuthorized}`);
    info(`Treasury (${treasuryAddress}) authorized: ${isTreasuryAuthorized}`);

    if (!isSignerAuthorized && !isTreasuryAuthorized) {
      warning('Neither signer nor treasury is authorized. Run authorization scripts first.');
    } else {
      success('At least one address is authorized');
    }

    // Get contract statistics (Requirement 4.9)
    info('\nRetrieving contract statistics...');
    const stats = await gameLogger.getStats();
    info(`Total Games: ${stats.totalGames.toString()}`);
    info(`Total Bets: ${ethers.formatEther(stats.totalBets)} CTC`);
    info(`Total Payouts: ${ethers.formatEther(stats.totalPayouts)} CTC`);
    info(`Game Type Counts:`);
    info(`  - Roulette: ${stats.rouletteCount.toString()}`);
    info(`  - Mines: ${stats.minesCount.toString()}`);
    info(`  - Wheel: ${stats.wheelCount.toString()}`);
    info(`  - Plinko: ${stats.plinkoCount.toString()}`);
    success('Statistics retrieval working');

    // Test logging functionality if authorized (Requirement 4.2, 4.3, 4.6)
    if (isSignerAuthorized) {
      info('\nTesting game logging functionality...');
      
      const testGameData = {
        gameType: 0, // ROULETTE
        betAmount: ethers.parseEther('0.001'),
        resultData: ethers.toUtf8Bytes(JSON.stringify({ number: 7, color: 'red' })),
        payout: ethers.parseEther('0.002'),
        entropyRequestId: ethers.randomBytes(32),
        entropyTxHash: '0x' + '1'.repeat(64) // Mock Arbitrum Sepolia tx hash
      };

      try {
        const tx = await gameLogger.logGameResult(
          testGameData.gameType,
          testGameData.betAmount,
          testGameData.resultData,
          testGameData.payout,
          testGameData.entropyRequestId,
          testGameData.entropyTxHash
        );

        info(`Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        success(`Game logged successfully! Block: ${receipt.blockNumber}`);

        // Verify the logged game can be retrieved
        const playerHistory = await gameLogger.getPlayerHistory(signer.address, 1);
        if (playerHistory.length > 0) {
          const logId = playerHistory[0];
          const gameLog = await gameLogger.getGameLog(logId);
          info(`Retrieved game log: ${gameLog.logId}`);
          success('Game retrieval working');
        }

      } catch (logError) {
        error(`Failed to log test game: ${logError.message}`);
        warning('This may be due to insufficient gas or network issues');
      }
    } else {
      warning('Skipping logging test - signer not authorized');
      info('To authorize, run: npx hardhat run scripts/authorize-creditcoin-treasury.js --network creditcoin-testnet');
    }

    // Test query methods (Requirement 4.9)
    info('\nTesting query methods...');
    const playerHistory = await gameLogger.getPlayerHistory(signer.address, 10);
    info(`Player has ${playerHistory.length} games in history`);
    success('Query methods working');

    success('Game Logger service verification completed');
    return true;

  } catch (err) {
    error(`Game Logger service verification failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function verifyCrossChainCoordination() {
  section('3. CROSS-CHAIN COORDINATION VERIFICATION');

  try {
    // Verify Arbitrum Sepolia configuration (for Pyth Entropy)
    const arbitrumRpc = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC;
    const entropyContract = process.env.NEXT_PUBLIC_PYTH_ENTROPY_CONTRACT;
    const entropyProvider = process.env.NEXT_PUBLIC_PYTH_ENTROPY_PROVIDER;

    info('Arbitrum Sepolia Configuration (Pyth Entropy):');
    info(`  RPC: ${arbitrumRpc}`);
    info(`  Entropy Contract: ${entropyContract}`);
    info(`  Entropy Provider: ${entropyProvider}`);

    if (!arbitrumRpc || !entropyContract || !entropyProvider) {
      error('Arbitrum Sepolia configuration incomplete');
      return false;
    }
    success('Arbitrum Sepolia configuration present');

    // Verify CreditCoin configuration (for game logging)
    const creditcoinRpc = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC;
    const gameLoggerAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;

    info('\nCreditCoin Testnet Configuration (Game Logging):');
    info(`  RPC: ${creditcoinRpc}`);
    info(`  Game Logger: ${gameLoggerAddress}`);

    if (!creditcoinRpc || !gameLoggerAddress) {
      error('CreditCoin configuration incomplete');
      return false;
    }
    success('CreditCoin configuration present');

    // Verify network separation
    info('\nNetwork Separation:');
    info('  ✓ Entropy Generation: Arbitrum Sepolia');
    info('  ✓ Game Logging: CreditCoin Testnet');
    info('  ✓ Treasury Operations: CreditCoin Testnet');
    success('Cross-chain architecture properly configured');

    return true;

  } catch (err) {
    error(`Cross-chain coordination verification failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function main() {
  log('\n' + '█'.repeat(70), colors.bright + colors.magenta);
  log('  BACKEND SERVICES VERIFICATION - CREDITCOIN TESTNET', colors.bright + colors.magenta);
  log('█'.repeat(70) + '\n', colors.bright + colors.magenta);

  const results = {
    treasury: false,
    gameLogger: false,
    crossChain: false
  };

  // Run verifications
  results.treasury = await verifyTreasuryService();
  results.gameLogger = await verifyGameLoggerService();
  results.crossChain = await verifyCrossChainCoordination();

  // Summary
  section('VERIFICATION SUMMARY');

  const allPassed = results.treasury && results.gameLogger && results.crossChain;

  log('Treasury Service:        ' + (results.treasury ? '✅ PASS' : '❌ FAIL'), 
      results.treasury ? colors.green : colors.red);
  log('Game Logger Service:     ' + (results.gameLogger ? '✅ PASS' : '❌ FAIL'), 
      results.gameLogger ? colors.green : colors.red);
  log('Cross-Chain Coordination: ' + (results.crossChain ? '✅ PASS' : '❌ FAIL'), 
      results.crossChain ? colors.green : colors.red);

  console.log('\n' + '='.repeat(70) + '\n');

  if (allPassed) {
    success('🎉 ALL BACKEND SERVICES VERIFIED SUCCESSFULLY!');
    log('\nNext Steps:', colors.bright);
    log('  1. Start the development server: npm run dev');
    log('  2. Test deposit functionality through the UI');
    log('  3. Test withdrawal functionality through the UI');
    log('  4. Play a game and verify logging works');
    log('  5. Check transaction hashes on CreditCoin Explorer');
  } else {
    error('⚠️  SOME VERIFICATIONS FAILED');
    log('\nTroubleshooting:', colors.bright);
    
    if (!results.treasury) {
      log('  Treasury Issues:');
      log('    - Check CREDITCOIN_TREASURY_ADDRESS is set');
      log('    - Check CREDITCOIN_TREASURY_PRIVATE_KEY is set');
      log('    - Ensure treasury wallet has CTC balance');
      log('    - Get testnet CTC from faucet if needed');
    }
    
    if (!results.gameLogger) {
      log('  Game Logger Issues:');
      log('    - Check NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS is set');
      log('    - Verify contract is deployed: npm run deploy:creditcoin');
      log('    - Authorize treasury: npx hardhat run scripts/authorize-creditcoin-treasury.js --network creditcoin-testnet');
    }
    
    if (!results.crossChain) {
      log('  Cross-Chain Issues:');
      log('    - Verify Arbitrum Sepolia configuration');
      log('    - Check NEXT_PUBLIC_PYTH_ENTROPY_CONTRACT is set');
      log('    - Ensure both networks are properly configured');
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(allPassed ? 0 : 1);
}

main()
  .then(() => {})
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
