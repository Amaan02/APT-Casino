const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });

/**
 * Check CreditCoin treasury balance on CreditCoin Testnet.
 * Run: npx hardhat run scripts/check-treasury-balance-final.js --network creditcoin-testnet
 */
async function main() {
  console.log("💰 Checking CreditCoin Treasury Balance...");

  const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;
  if (!treasuryAddress) {
    console.error("❌ Set CREDITCOIN_TREASURY_ADDRESS or TREASURY_ADDRESS in .env");
    process.exitCode = 1;
    return;
  }

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "CTC");

  try {
    const treasuryBalance = await deployer.provider.getBalance(treasuryAddress);
    console.log("\n📋 Treasury Address:", treasuryAddress);
    console.log("💰 Treasury Balance:", ethers.formatEther(treasuryBalance), "CTC");

    if (treasuryBalance < ethers.parseEther("0.1")) {
      console.log("\n❌ Treasury needs more CTC!");
      console.log("🔗 Fund the treasury on CreditCoin Testnet (e.g. from faucet).");
    } else {
      console.log("✅ Treasury has sufficient funds!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

