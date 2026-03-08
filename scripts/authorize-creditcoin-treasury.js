/**
 * Authorize CreditCoin Treasury Wallet Script
 * 
 * This script authorizes the CreditCoin treasury wallet to log game results 
 * on the CreditCoinGameLogger contract deployed on CreditCoin Testnet.
 * 
 * Usage:
 *   node scripts/authorize-creditcoin-treasury.js
 * 
 * Required environment variables:
 *   - CREDITCOIN_TREASURY_PRIVATE_KEY: Treasury wallet private key (or TREASURY_PRIVATE_KEY as fallback)
 *   - NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS: CreditCoinGameLogger contract address
 *   - NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC: CreditCoin Testnet RPC URL
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Contract ABI for authorization functions
const GAME_LOGGER_ABI = [
  'function addAuthorizedLogger(address logger) external',
  'function removeAuthorizedLogger(address logger) external',
  'function isAuthorizedLogger(address logger) external view returns (bool)',
  'function owner() external view returns (address)'
];

async function main() {
  console.log('🔧 Authorize CreditCoin Treasury Wallet Script\n');

  // Get environment variables
  const rpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC;
  const gameLoggerAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
  const treasuryPrivateKey = process.env.CREDITCOIN_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY;
  const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;

  // Validate required env vars
  if (!rpcUrl) {
    console.error('❌ NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC not set');
    console.log('   Expected: https://rpc.cc3-testnet.creditcoin.network');
    process.exit(1);
  }

  if (!gameLoggerAddress) {
    console.error('❌ NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS not set');
    console.log('   This should be set to the deployed CreditCoinGameLogger contract address');
    process.exit(1);
  }

  if (!treasuryPrivateKey) {
    console.error('❌ CREDITCOIN_TREASURY_PRIVATE_KEY or TREASURY_PRIVATE_KEY not set');
    console.log('   This is required to derive the treasury wallet address');
    process.exit(1);
  }

  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Create treasury signer (used as both owner and treasury for authorization)
  const treasurySigner = new ethers.Wallet(treasuryPrivateKey, provider);
  const derivedTreasuryAddress = await treasurySigner.getAddress();

  console.log('📍 Configuration:');
  console.log(`   Network: CreditCoin Testnet`);
  console.log(`   Chain ID: 102031`);
  console.log(`   RPC URL: ${rpcUrl}`);
  console.log(`   GameLogger Contract: ${gameLoggerAddress}`);
  console.log(`   Treasury Address: ${derivedTreasuryAddress}`);
  if (treasuryAddress && treasuryAddress !== derivedTreasuryAddress) {
    console.log(`   ⚠️  Warning: CREDITCOIN_TREASURY_ADDRESS (${treasuryAddress}) doesn't match derived address`);
  }
  console.log('');

  // Create contract instance with treasury signer (who is also the owner)
  const contract = new ethers.Contract(gameLoggerAddress, GAME_LOGGER_ABI, treasurySigner);

  // Check current owner
  try {
    const currentOwner = await contract.owner();
    console.log(`👤 Current contract owner: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() !== derivedTreasuryAddress.toLowerCase()) {
      console.error(`\n❌ Error: Your address (${derivedTreasuryAddress}) is not the contract owner.`);
      console.error(`   Contract owner is: ${currentOwner}`);
      console.error(`   You need to use the owner's private key to authorize loggers.`);
      process.exit(1);
    }
    console.log('✅ You are the contract owner\n');
  } catch (error) {
    console.error('❌ Could not verify owner:', error.message);
    console.log('   Make sure the contract address is correct and the RPC is accessible');
    process.exit(1);
  }

  // Check if treasury is already authorized
  try {
    const isAuthorized = await contract.isAuthorizedLogger(derivedTreasuryAddress);
    
    if (isAuthorized) {
      console.log('✅ Treasury wallet is already authorized!');
      console.log(`   Address: ${derivedTreasuryAddress}`);
      console.log(`\n🎉 No action needed - treasury can log games on CreditCoin Testnet`);
      process.exit(0);
    }
    
    console.log('⚠️  Treasury wallet is NOT authorized yet');
  } catch (error) {
    console.error('❌ Could not check authorization status:', error.message);
    process.exit(1);
  }

  // Authorize treasury wallet
  console.log('\n📝 Authorizing treasury wallet...');
  
  try {
    const tx = await contract.addAuthorizedLogger(derivedTreasuryAddress, {
      gasLimit: 100000
    });
    
    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/tx/${tx.hash}`);
    
    // Wait for confirmation
    console.log('   Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('\n✅ Treasury wallet authorized successfully!');
      console.log(`   Transaction: ${receipt.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      
      // Verify authorization
      const isNowAuthorized = await contract.isAuthorizedLogger(derivedTreasuryAddress);
      console.log(`\n🔐 Verification: Treasury wallet authorized = ${isNowAuthorized}`);
      
      if (isNowAuthorized) {
        console.log('\n🎉 Success! Treasury wallet can now log games on CreditCoin Testnet');
        console.log(`   Authorized address: ${derivedTreasuryAddress}`);
      } else {
        console.error('\n⚠️  Warning: Authorization verification failed');
      }
    } else {
      console.error('\n❌ Transaction reverted!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Failed to authorize treasury wallet:', error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('   → Your wallet needs CTC tokens for gas');
      console.log('   → Get testnet CTC from the CreditCoin faucet');
    } else if (error.code === 'CALL_EXCEPTION') {
      console.log('   → The contract rejected the transaction');
      console.log('   → Make sure you are the contract owner');
    } else if (error.message.includes('network')) {
      console.log('   → Network connection issue');
      console.log('   → Verify RPC URL is correct and accessible');
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
