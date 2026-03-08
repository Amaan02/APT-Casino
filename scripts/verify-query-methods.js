/**
 * Verification script for CreditCoinGameLogger query methods
 * Tests all query methods to ensure they work correctly
 */

const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔍 Verifying CreditCoinGameLogger Query Methods\n");

  // Get contract address from environment
  const contractAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
  
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    console.error("❌ NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS not set in .env");
    process.exit(1);
  }

  console.log("📍 Contract Address:", contractAddress);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Using account:", signer.address);

  // Connect to contract
  const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
  const gameLogger = CreditCoinGameLogger.attach(contractAddress);

  console.log("\n" + "=".repeat(60));
  console.log("Testing Query Methods");
  console.log("=".repeat(60) + "\n");

  try {
    // Test 1: getStats
    console.log("1️⃣ Testing getStats()...");
    const stats = await gameLogger.getStats();
    console.log("   ✅ Stats retrieved:");
    console.log("      Total Games:", stats.totalGames.toString());
    console.log("      Total Bets:", ethers.formatEther(stats.totalBets), "CTC");
    console.log("      Total Payouts:", ethers.formatEther(stats.totalPayouts), "CTC");
    console.log("      Roulette:", stats.rouletteCount.toString());
    console.log("      Mines:", stats.minesCount.toString());
    console.log("      Wheel:", stats.wheelCount.toString());
    console.log("      Plinko:", stats.plinkoCount.toString());

    // Test 2: getPlayerHistory
    console.log("\n2️⃣ Testing getPlayerHistory()...");
    const playerHistory = await gameLogger.getPlayerHistory(signer.address, 10);
    console.log("   ✅ Player history retrieved:");
    console.log("      Number of games:", playerHistory.length);
    if (playerHistory.length > 0) {
      console.log("      First log ID:", playerHistory[0]);
    }

    // Test 3: getPlayerGameCount
    console.log("\n3️⃣ Testing getPlayerGameCount()...");
    const gameCount = await gameLogger.getPlayerGameCount(signer.address);
    console.log("   ✅ Player game count:", gameCount.toString());

    // Test 4: getLogsByGameType (for each game type)
    console.log("\n4️⃣ Testing getLogsByGameType()...");
    const gameTypes = ["ROULETTE", "MINES", "WHEEL", "PLINKO"];
    for (let i = 0; i < gameTypes.length; i++) {
      const logs = await gameLogger.getLogsByGameType(i, 5);
      console.log(`   ✅ ${gameTypes[i]} logs:`, logs.length);
    }

    // Test 5: getGameLog (if there are any logs)
    if (playerHistory.length > 0) {
      console.log("\n5️⃣ Testing getGameLog()...");
      const logId = playerHistory[0];
      const gameLog = await gameLogger.getGameLog(logId);
      console.log("   ✅ Game log retrieved:");
      console.log("      Log ID:", gameLog.logId);
      console.log("      Player:", gameLog.player);
      console.log("      Game Type:", gameLog.gameType);
      console.log("      Bet Amount:", ethers.formatEther(gameLog.betAmount), "CTC");
      console.log("      Payout:", ethers.formatEther(gameLog.payout), "CTC");
      console.log("      Timestamp:", new Date(Number(gameLog.timestamp) * 1000).toISOString());
    } else {
      console.log("\n5️⃣ Skipping getGameLog() - no logs available");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All Query Methods Verified Successfully!");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error during verification:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
