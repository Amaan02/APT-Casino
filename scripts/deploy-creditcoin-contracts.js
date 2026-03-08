const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying CreditCoin Testnet Contracts...");
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

  const deploymentResults = {
    network: "creditcoin-testnet",
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {}
  };

  // Deploy CreditCoinGameLogger
  console.log("\n📦 Deploying CreditCoinGameLogger...");
  const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
  const gameLogger = await CreditCoinGameLogger.deploy();
  await gameLogger.waitForDeployment();
  const gameLoggerAddress = await gameLogger.getAddress();
  console.log("✅ CreditCoinGameLogger deployed to:", gameLoggerAddress);

  // Get deployment transaction receipt for block number
  const deploymentTx = gameLogger.deploymentTransaction();
  const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;
  
  deploymentResults.contracts.gameLogger = {
    address: gameLoggerAddress,
    transactionHash: deploymentTx?.hash,
    blockNumber: deploymentReceipt?.blockNumber
  };

  // Test Game Logger
  console.log("\n🧪 Testing CreditCoinGameLogger...");
  try {
    const stats = await gameLogger.getStats();
    console.log("Game Logger Stats:", {
      totalGames: stats.totalGames.toString(),
      totalBets: ethers.formatEther(stats.totalBets),
      totalPayouts: ethers.formatEther(stats.totalPayouts),
      rouletteCount: stats.rouletteCount.toString(),
      minesCount: stats.minesCount.toString(),
      wheelCount: stats.wheelCount.toString(),
      plinkoCount: stats.plinkoCount.toString()
    });

    const isAuthorized = await gameLogger.isAuthorizedLogger(deployer.address);
    console.log("Deployer is authorized logger:", isAuthorized);

    console.log("✅ Game Logger test passed");
  } catch (error) {
    console.log("❌ Game Logger test failed:", error.message);
  }

  // Test logging a game result
  console.log("\n🎲 Testing game result logging...");
  try {
    const testEntropyRequestId = ethers.keccak256(ethers.toUtf8Bytes("test_entropy_" + Date.now()));
    const testEntropyTxHash = "0x" + "1".repeat(64); // Mock Arbitrum tx hash
    const testResultData = ethers.toUtf8Bytes("test_result");
    const testBetAmount = ethers.parseEther("0.1"); // 0.1 CTC bet
    const testPayoutAmount = ethers.parseEther("0.2"); // 0.2 CTC payout
    
    const logTx = await gameLogger.logGameResult(
      0, // GameType.ROULETTE
      testBetAmount,
      testResultData,
      testPayoutAmount,
      testEntropyRequestId,
      testEntropyTxHash
    );
    
    const receipt = await logTx.wait();
    console.log("Game logged in transaction:", receipt.hash);
    console.log("Block number:", receipt.blockNumber);

    // Get the log ID from events
    const event = receipt.logs.find(log => {
      try {
        const parsed = gameLogger.interface.parseLog(log);
        return parsed.name === 'GameResultLogged';
      } catch (e) {
        return false;
      }
    });

    if (event) {
      const parsedEvent = gameLogger.interface.parseLog(event);
      const logId = parsedEvent.args.logId;
      console.log("Log ID:", logId);
      
      // Retrieve the log
      const gameLog = await gameLogger.getGameLog(logId);
      console.log("Game Log Retrieved:", {
        player: gameLog.player,
        gameType: gameLog.gameType.toString(),
        betAmount: ethers.formatEther(gameLog.betAmount),
        payout: ethers.formatEther(gameLog.payout),
        timestamp: new Date(Number(gameLog.timestamp) * 1000).toISOString()
      });
      
      // Verify the retrieved data matches what was logged
      if (gameLog.player !== deployer.address) {
        throw new Error("Player address mismatch");
      }
      if (gameLog.betAmount !== testBetAmount) {
        throw new Error("Bet amount mismatch");
      }
      if (gameLog.payout !== testPayoutAmount) {
        throw new Error("Payout amount mismatch");
      }
      console.log("✅ Game log retrieval verified");
    }

    // Verify statistics were updated correctly
    console.log("\n📊 Verifying statistics update...");
    const statsAfter = await gameLogger.getStats();
    console.log("Updated Stats:", {
      totalGames: statsAfter.totalGames.toString(),
      totalBets: ethers.formatEther(statsAfter.totalBets) + " CTC",
      totalPayouts: ethers.formatEther(statsAfter.totalPayouts) + " CTC",
      rouletteCount: statsAfter.rouletteCount.toString(),
      minesCount: statsAfter.minesCount.toString(),
      wheelCount: statsAfter.wheelCount.toString(),
      plinkoCount: statsAfter.plinkoCount.toString()
    });
    
    // Verify the stats match expected values
    if (statsAfter.totalGames !== 1n) {
      throw new Error(`Expected 1 total game, got ${statsAfter.totalGames}`);
    }
    if (statsAfter.totalBets !== testBetAmount) {
      throw new Error(`Expected ${ethers.formatEther(testBetAmount)} CTC total bets, got ${ethers.formatEther(statsAfter.totalBets)} CTC`);
    }
    if (statsAfter.totalPayouts !== testPayoutAmount) {
      throw new Error(`Expected ${ethers.formatEther(testPayoutAmount)} CTC total payouts, got ${ethers.formatEther(statsAfter.totalPayouts)} CTC`);
    }
    if (statsAfter.rouletteCount !== 1n) {
      throw new Error(`Expected 1 roulette game, got ${statsAfter.rouletteCount}`);
    }
    console.log("✅ Statistics verification passed");

    console.log("\n✅ All deployment tests passed successfully!");
  } catch (error) {
    console.log("❌ Game logging test failed:", error.message);
    throw error;
  }

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nNetwork Information:");
  console.log("  Network: CreditCoin Testnet");
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Deployer:", deployer.address);
  console.log("  Explorer: https://creditcoin-testnet.blockscout.com");
  console.log("\nDeployed Contracts:");
  console.log("  CreditCoinGameLogger:", gameLoggerAddress);
  console.log("\nNext Steps:");
  console.log("  1. Update .env file with contract address:");
  console.log(`     NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}`);
  console.log("  2. Verify contract on CreditCoin Testnet explorer:");
  console.log(`     https://creditcoin-testnet.blockscout.com/address/${gameLoggerAddress}`);
  console.log("  3. Authorize treasury address to log games");
  console.log("  4. Test game logging from frontend");
  console.log("=".repeat(60));

  // Save deployment info to file
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filename = `${deploymentsDir}/creditcoin-contracts-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentResults, null, 2));
  console.log("\n💾 Deployment info saved to:", filename);

  // Generate .env update script
  const envUpdate = `
# CreditCoin Testnet Contract Addresses (deployed ${new Date().toISOString()})
NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}
`;

  const envUpdateFile = `${deploymentsDir}/creditcoin-env-update.txt`;
  fs.writeFileSync(envUpdateFile, envUpdate.trim());
  console.log("📝 Environment variable updates saved to:", envUpdateFile);

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
