/**
 * Verification Script for CreditCoin Game Logger
 *
 * Verifies the Game Logger service is configured and can interact with the deployed contract on CreditCoin Testnet.
 */

const { ethers } = require('ethers');
require('dotenv').config();

const CREDITCOIN_RPC = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
const GAME_LOGGER_ADDRESS = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS || '0x4f52F99D2581884fe4F81943fed2042b61bBd4c0';

const GAME_LOGGER_ABI = [
  'function getTotalLogs() external view returns (uint256)',
  'function getStats() external view returns (uint256 totalGames, uint256 totalBets, uint256 totalPayouts, uint256 rouletteCount, uint256 minesCount, uint256 wheelCount, uint256 plinkoCount)',
  'function isAuthorizedLogger(address logger) external view returns (bool)'
];

async function verifyGameLogger() {
  console.log('🔍 Verifying CreditCoin Game Logger Service...\n');

  try {
    const contractAddress = GAME_LOGGER_ADDRESS;
    console.log('📝 Contract Address:', contractAddress);
    console.log('🌐 RPC URL:', CREDITCOIN_RPC);

    const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);
    console.log('✅ Provider connected\n');

    const contract = new ethers.Contract(contractAddress, GAME_LOGGER_ABI, provider);
    console.log('📄 Contract instance created\n');

    console.log('🔍 Checking contract deployment...');
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error('Contract not deployed at this address');
    }
    console.log('✅ Contract is deployed\n');

    console.log('📊 Fetching contract statistics...');
    const totalLogs = await contract.getTotalLogs();
    console.log('   Total Logs:', totalLogs.toString());

    const stats = await contract.getStats();
    console.log('   Total Games:', stats.totalGames.toString());
    console.log('   Total Bets:', ethers.formatEther(stats.totalBets), 'CTC');
    console.log('   Total Payouts:', ethers.formatEther(stats.totalPayouts), 'CTC');
    console.log('   Game Type Counts:');
    console.log('     - Roulette:', stats.rouletteCount.toString());
    console.log('     - Mines:', stats.minesCount.toString());
    console.log('     - Wheel:', stats.wheelCount.toString());
    console.log('     - Plinko:', stats.plinkoCount.toString());
    console.log('');

    const ownerAddress = process.env.DEPLOYER_ADDRESS || '0x0000000000000000000000000000000000000000';
    if (ownerAddress !== '0x0000000000000000000000000000000000000000') {
      console.log('🔐 Checking authorization...');
      const isAuthorized = await contract.isAuthorizedLogger(ownerAddress);
      console.log('   Owner authorized:', isAuthorized);
      console.log('');
    }

    console.log('✅ Game Logger Service Verification Complete!\n');
    console.log('📋 Summary:');
    console.log('   - Contract deployed and accessible');
    console.log('   - All read functions working');
    console.log('   - Ready for game integration');
    const explorer = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_EXPLORER || 'https://creditcoin-testnet.blockscout.com';
    console.log('🔗 Explorer:', `${explorer}/address/${contractAddress}`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check contract is deployed to CreditCoin Testnet');
    console.error('2. Verify RPC URL is accessible');
    console.error('3. Ensure contract address is correct in src/config/contracts.js');
    process.exit(1);
  }
}

// Run verification
verifyGameLogger();
