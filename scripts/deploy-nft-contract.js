/**
 * Deploy APT Casino NFT Contract Script
 * 
 * This script deploys the APTCasinoNFT contract to CreditCoin Testnet,
 * authorizes the treasury wallet as a minter, verifies the contract on
 * the block explorer, and saves the contract address to the .env file.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-nft-contract.js --network creditcoin-testnet
 * 
 * Required environment variables:
 *   - CREDITCOIN_TREASURY_PRIVATE_KEY: Treasury wallet private key (or TREASURY_PRIVATE_KEY as fallback)
 *   - CREDITCOIN_TREASURY_ADDRESS: Treasury wallet address (or TREASURY_ADDRESS as fallback)
 *   - NFT_BASE_URI: Base URI for NFT metadata (optional, defaults to https://aptcasino.com/nft/)
 */

const { ethers, run } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying APT Casino NFT Contract to CreditCoin Testnet...");
  console.log("=" .repeat(60));

  // Get the deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please check your private key configuration.");
  }
  const deployer = signers[0];
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CTC");

  // Verify sufficient balance (warn if less than 0.1 CTC)
  const minBalance = ethers.parseEther("0.1");
  if (balance < minBalance) {
    console.log("⚠️  WARNING: Low CTC balance! You may not have enough for deployment.");
    console.log("   Recommended: At least 0.1 CTC");
    console.log("   Current:", ethers.formatEther(balance), "CTC");
  }

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("=" .repeat(60));

  // Verify we're on CreditCoin Testnet
  if (network.chainId !== 102031n) {
    console.log("⚠️  Warning: Not on CreditCoin Testnet (expected chain ID 102031)");
    console.log("Current chain ID:", network.chainId.toString());
    console.log("Proceeding anyway...");
  }

  // Get base URI from environment or use default
  const baseURI = process.env.NFT_BASE_URI || 'https://aptcasino.com/nft/';
  console.log("\n📍 Configuration:");
  console.log("   Base URI:", baseURI);

  // Get treasury wallet address for minter authorization
  const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;
  if (!treasuryAddress) {
    throw new Error("CREDITCOIN_TREASURY_ADDRESS or TREASURY_ADDRESS not set in environment");
  }
  console.log("   Treasury Address:", treasuryAddress);
  console.log("");

  // Deploy APTCasinoNFT contract
  console.log("\n📦 Deploying APTCasinoNFT...");
  const APTCasinoNFT = await ethers.getContractFactory("APTCasinoNFT");
  const nftContract = await APTCasinoNFT.deploy(baseURI);
  await nftContract.waitForDeployment();
  
  const contractAddress = await nftContract.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);

  // Get deployment transaction details
  const deploymentTx = nftContract.deploymentTransaction();
  const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;
  
  if (deploymentReceipt) {
    console.log("   Transaction:", deploymentReceipt.hash);
    console.log("   Block:", deploymentReceipt.blockNumber);
    console.log("   Gas used:", deploymentReceipt.gasUsed.toString());
  }

  // Authorize treasury wallet as minter
  console.log("\n🔐 Authorizing treasury wallet as minter...");
  try {
    const authTx = await nftContract.authorizeMinter(treasuryAddress, {
      gasLimit: 100000
    });
    console.log("   Transaction submitted:", authTx.hash);
    
    const authReceipt = await authTx.wait();
    console.log("✅ Authorized minting service:", treasuryAddress);
    console.log("   Gas used:", authReceipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Failed to authorize minter:", error.message);
    throw error;
  }

  // Verify contract on block explorer
  let verificationStatus = 'Skipped';
  console.log("\n📝 Verifying contract on CreditCoin Testnet explorer...");
  
  try {
    // Wait a bit for the contract to be indexed by the explorer
    console.log("   Waiting 10 seconds for contract to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [baseURI],
    });
    
    console.log("✅ Contract verified on explorer");
    verificationStatus = 'Verified';
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log("✅ Contract already verified");
      verificationStatus = 'Already Verified';
    } else {
      console.log("⚠️  Verification failed:", error.message);
      console.log("   You can verify manually later using:");
      console.log(`   npx hardhat verify --network creditcoin-testnet ${contractAddress} "${baseURI}"`);
      verificationStatus = 'Failed';
    }
  }

  // Save contract address to .env file
  console.log("\n💾 Saving contract address to .env file...");
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if NFT_CONTRACT_ADDRESS already exists
    const nftAddressRegex = /^NFT_CONTRACT_ADDRESS=.*$/m;
    const nftContractLine = `NFT_CONTRACT_ADDRESS=${contractAddress}`;
    
    if (nftAddressRegex.test(envContent)) {
      // Replace existing line
      envContent = envContent.replace(nftAddressRegex, nftContractLine);
      console.log("   Updated existing NFT_CONTRACT_ADDRESS");
    } else {
      // Add new line
      if (!envContent.endsWith('\n') && envContent.length > 0) {
        envContent += '\n';
      }
      envContent += `\n# APT Casino NFT Contract (deployed ${new Date().toISOString()})\n`;
      envContent += nftContractLine + '\n';
      console.log("   Added NFT_CONTRACT_ADDRESS");
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Contract address saved to .env");
  } catch (error) {
    console.error("❌ Failed to save to .env:", error.message);
    console.log("   Please manually add to .env:");
    console.log(`   NFT_CONTRACT_ADDRESS=${contractAddress}`);
  }

  // Update .env.example if it exists
  try {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      let envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
      
      const nftAddressRegex = /^NFT_CONTRACT_ADDRESS=.*$/m;
      const nftContractLine = 'NFT_CONTRACT_ADDRESS=your_nft_contract_address_here';
      
      if (!nftAddressRegex.test(envExampleContent)) {
        if (!envExampleContent.endsWith('\n') && envExampleContent.length > 0) {
          envExampleContent += '\n';
        }
        envExampleContent += '\n# APT Casino NFT Contract\n';
        envExampleContent += nftContractLine + '\n';
        
        fs.writeFileSync(envExamplePath, envExampleContent);
        console.log("✅ Updated .env.example");
      }
    }
  } catch (error) {
    console.log("⚠️  Could not update .env.example:", error.message);
  }

  // Save deployment info to file
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentResults = {
    network: "creditcoin-testnet",
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      nftContract: {
        address: contractAddress,
        transactionHash: deploymentTx?.hash,
        blockNumber: deploymentReceipt?.blockNumber,
        baseURI: baseURI,
        authorizedMinter: treasuryAddress,
        verificationStatus: verificationStatus
      }
    }
  };
  
  const filename = `${deploymentsDir}/nft-contract-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentResults, null, 2));
  console.log("💾 Deployment info saved to:", filename);

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nContract Information:");
  console.log("  Contract Address:", contractAddress);
  console.log("  Base URI:", baseURI);
  console.log("  Authorized Minter:", treasuryAddress);
  console.log("  Verification Status:", verificationStatus);
  console.log("\nNetwork Information:");
  console.log("  Network: CreditCoin Testnet");
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Deployer:", deployer.address);
  console.log("  Explorer:", `https://creditcoin-testnet.blockscout.com/address/${contractAddress}`);
  console.log("\nNext Steps:");
  console.log("  1. Verify NFT_CONTRACT_ADDRESS is in .env file");
  console.log("  2. View contract on explorer:");
  console.log(`     https://creditcoin-testnet.blockscout.com/address/${contractAddress}`);
  console.log("  3. Implement NFT minting service to mint NFTs after games");
  console.log("  4. Update frontend to display NFT information");
  console.log("=".repeat(60));

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
