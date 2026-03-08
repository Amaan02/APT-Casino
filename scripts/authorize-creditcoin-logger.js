/**
 * Authorize CreditCoin Logger Script
 * 
 * This script authorizes one or more addresses to log game results 
 * on the CreditCoinGameLogger contract deployed on CreditCoin Testnet.
 * 
 * Usage:
 *   node scripts/authorize-creditcoin-logger.js <address1> [address2] [address3] ...
 * 
 * Examples:
 *   node scripts/authorize-creditcoin-logger.js 0x1234567890123456789012345678901234567890
 *   node scripts/authorize-creditcoin-logger.js 0xAddr1 0xAddr2 0xAddr3
 * 
 * Required environment variables:
 *   - CREDITCOIN_TREASURY_PRIVATE_KEY: Owner wallet private key (or TREASURY_PRIVATE_KEY as fallback)
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
  console.log('🔧 Authorize CreditCoin Logger Script\n');

  // Get logger addresses from command line arguments
  const loggerAddresses = process.argv.slice(2);

  if (loggerAddresses.length === 0) {
    console.error('❌ No logger addresses provided');
    console.log('\nUsage:');
    console.log('  node scripts/authorize-creditcoin-logger.js <address1> [address2] [address3] ...');
    console.log('\nExamples:');
    console.log('  node scripts/authorize-creditcoin-logger.js 0x1234567890123456789012345678901234567890');
    console.log('  node scripts/authorize-creditcoin-logger.js 0xAddr1 0xAddr2 0xAddr3');
    process.exit(1);
  }

  // Validate addresses
  const validAddresses = [];
  for (const addr of loggerAddresses) {
    if (!ethers.isAddress(addr)) {
      console.error(`❌ Invalid address: ${addr}`);
      console.log('   Addresses must be valid Ethereum addresses (0x...)\n');
      process.exit(1);
    }
    validAddresses.push(ethers.getAddress(addr)); // Normalize to checksum format
  }

  console.log(`📋 Addresses to authorize: ${validAddresses.length}`);
  validAddresses.forEach((addr, i) => {
    console.log(`   ${i + 1}. ${addr}`);
  });
  console.log('');

  // Get environment variables
  const rpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC;
  const gameLoggerAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
  const ownerPrivateKey = process.env.CREDITCOIN_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY;

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

  if (!ownerPrivateKey) {
    console.error('❌ CREDITCOIN_TREASURY_PRIVATE_KEY or TREASURY_PRIVATE_KEY not set');
    console.log('   This is required to sign transactions as the contract owner');
    process.exit(1);
  }

  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Create owner signer
  const ownerSigner = new ethers.Wallet(ownerPrivateKey, provider);
  const ownerAddress = await ownerSigner.getAddress();

  console.log('📍 Configuration:');
  console.log(`   Network: CreditCoin Testnet`);
  console.log(`   Chain ID: 102031`);
  console.log(`   RPC URL: ${rpcUrl}`);
  console.log(`   GameLogger Contract: ${gameLoggerAddress}`);
  console.log(`   Owner Address: ${ownerAddress}`);
  console.log('');

  // Create contract instance with owner signer
  const contract = new ethers.Contract(gameLoggerAddress, GAME_LOGGER_ABI, ownerSigner);

  // Check current owner
  try {
    const currentOwner = await contract.owner();
    console.log(`👤 Current contract owner: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
      console.error(`\n❌ Error: Your address (${ownerAddress}) is not the contract owner.`);
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

  // Process each address
  const results = {
    alreadyAuthorized: [],
    authorized: [],
    failed: []
  };

  for (let i = 0; i < validAddresses.length; i++) {
    const loggerAddress = validAddresses[i];
    console.log(`\n[${i + 1}/${validAddresses.length}] Processing: ${loggerAddress}`);
    console.log('─'.repeat(70));

    try {
      // Check if already authorized
      const isAuthorized = await contract.isAuthorizedLogger(loggerAddress);
      
      if (isAuthorized) {
        console.log('✅ Already authorized - skipping');
        results.alreadyAuthorized.push(loggerAddress);
        continue;
      }
      
      console.log('⚠️  Not authorized yet - authorizing...');

      // Authorize the logger
      const tx = await contract.addAuthorizedLogger(loggerAddress, {
        gasLimit: 100000
      });
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/tx/${tx.hash}`);
      
      // Wait for confirmation
      console.log('   Waiting for confirmation...');
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Authorized successfully!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        
        // Verify authorization
        const isNowAuthorized = await contract.isAuthorizedLogger(loggerAddress);
        
        if (isNowAuthorized) {
          console.log(`🔐 Verification: Confirmed authorized`);
          results.authorized.push({
            address: loggerAddress,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
          });
        } else {
          console.error('⚠️  Warning: Authorization verification failed');
          results.failed.push({
            address: loggerAddress,
            reason: 'Verification failed'
          });
        }
      } else {
        console.error('❌ Transaction reverted!');
        results.failed.push({
          address: loggerAddress,
          reason: 'Transaction reverted'
        });
      }
    } catch (error) {
      console.error(`❌ Failed to authorize: ${error.message}`);
      
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
      
      results.failed.push({
        address: loggerAddress,
        reason: error.message
      });
    }
  }

  // Display summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 AUTHORIZATION SUMMARY');
  console.log('='.repeat(70));
  
  if (results.alreadyAuthorized.length > 0) {
    console.log(`\n✅ Already Authorized (${results.alreadyAuthorized.length}):`);
    results.alreadyAuthorized.forEach(addr => {
      console.log(`   • ${addr}`);
    });
  }
  
  if (results.authorized.length > 0) {
    console.log(`\n🎉 Newly Authorized (${results.authorized.length}):`);
    results.authorized.forEach(result => {
      console.log(`   • ${result.address}`);
      console.log(`     Transaction: ${result.txHash}`);
      console.log(`     Block: ${result.blockNumber}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed (${results.failed.length}):`);
    results.failed.forEach(result => {
      console.log(`   • ${result.address}`);
      console.log(`     Reason: ${result.reason}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  
  const totalSuccess = results.alreadyAuthorized.length + results.authorized.length;
  const totalProcessed = validAddresses.length;
  
  if (totalSuccess === totalProcessed) {
    console.log(`\n🎉 Success! All ${totalProcessed} address(es) are now authorized`);
    console.log('   These addresses can now log games on CreditCoin Testnet');
    process.exit(0);
  } else if (results.failed.length === totalProcessed) {
    console.log(`\n❌ All authorizations failed`);
    process.exit(1);
  } else {
    console.log(`\n⚠️  Partial success: ${totalSuccess}/${totalProcessed} authorized`);
    process.exit(results.failed.length > 0 ? 1 : 0);
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
