#!/usr/bin/env node

/**
 * Upgrade CreditCoin Game Logger Contract
 * 
 * Deploys updated contract with NFT tracking fields
 * Preserves existing game logs by deploying new contract
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Upgrading CreditCoin Game Logger Contract...\n');

  // Get network info
  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} CTC\n`);

  // Deploy new CreditCoinGameLogger contract
  console.log('📝 Deploying CreditCoinGameLogger with NFT tracking...');
  const CreditCoinGameLogger = await hre.ethers.getContractFactory('CreditCoinGameLogger');
  const gameLogger = await CreditCoinGameLogger.deploy();
  await gameLogger.waitForDeployment();
  
  const gameLoggerAddress = await gameLogger.getAddress();
  console.log(`✅ CreditCoinGameLogger deployed: ${gameLoggerAddress}\n`);

  // Authorize treasury wallet
  const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS;
  if (treasuryAddress) {
    console.log(`🔐 Authorizing treasury: ${treasuryAddress}`);
    const tx = await gameLogger.addAuthorizedLogger(treasuryAddress);
    await tx.wait();
    console.log('✅ Treasury authorized\n');
  }

  // Save deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      creditcoinGameLogger: gameLoggerAddress
    },
    treasuryAddress: treasuryAddress || 'Not configured'
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `creditcoin-logger-upgrade-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved: ${filename}\n`);

  // Generate .env update instructions
  console.log('📋 Update your .env file with:');
  console.log(`CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}`);
  console.log('\n⚠️  IMPORTANT: Update your frontend and backend to use the new contract address');
  console.log('⚠️  Old game logs remain on the previous contract - consider data migration if needed\n');

  console.log('✅ Upgrade complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
