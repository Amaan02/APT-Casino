/**
 * Verify NFT Contract Deployment
 * 
 * This script checks if the NFT contract is deployed and properly configured
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying NFT Contract Deployment...");
  console.log("=" .repeat(60));

  const contractAddress = "0x0B61D7b981062b0dd5D95F8B6455Eca0a2C1d8C7";
  const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;

  console.log("Contract Address:", contractAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("");

  try {
    // Get contract instance
    const nftContract = await ethers.getContractAt("APTCasinoNFT", contractAddress);
    
    // Check if contract exists
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ No contract found at address");
      return;
    }
    console.log("✅ Contract exists at address");

    // Check contract name and symbol
    const name = await nftContract.name();
    const symbol = await nftContract.symbol();
    console.log("✅ Contract Name:", name);
    console.log("✅ Contract Symbol:", symbol);

    // Check owner
    const owner = await nftContract.owner();
    console.log("✅ Contract Owner:", owner);

    // Check if treasury is authorized minter
    const isAuthorized = await nftContract.authorizedMinters(treasuryAddress);
    console.log("✅ Treasury Authorized:", isAuthorized);

    // Check total supply
    const totalSupply = await nftContract.totalSupply();
    console.log("✅ Total Supply:", totalSupply.toString());

    console.log("\n" + "=".repeat(60));
    console.log("📋 VERIFICATION SUMMARY");
    console.log("=".repeat(60));
    console.log("Contract Status: DEPLOYED");
    console.log("Owner:", owner);
    console.log("Treasury Authorized:", isAuthorized ? "YES" : "NO");
    console.log("Total NFTs Minted:", totalSupply.toString());
    console.log("Explorer:", `https://creditcoin-testnet.blockscout.com/address/${contractAddress}`);
    console.log("=".repeat(60));

    if (!isAuthorized) {
      console.log("\n⚠️  WARNING: Treasury wallet is not authorized as minter!");
      console.log("Run the authorization script to fix this:");
      console.log("npx hardhat run scripts/authorize-nft-minter.js --network creditcoin-testnet");
    }

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
