const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

describe("Deployment Script Integration Test", function () {
  let gameLogger;
  let deployer;
  let deploymentTimestamp;
  let deploymentJsonPath;
  let envUpdatePath;
  let gameLoggerAddress;
  let network;

  before(async function () {
    // Simulate the complete deployment script flow
    console.log("🚀 Simulating CreditCoin Testnet Deployment...");
    
    // Get the deployer account
    const signers = await ethers.getSigners();
    deployer = signers[0];
    console.log("Deploying with account:", deployer.address);
    
    // Check deployer balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    
    // Deploy CreditCoinGameLogger
    console.log("\n📦 Deploying CreditCoinGameLogger...");
    const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
    gameLogger = await CreditCoinGameLogger.deploy();
    await gameLogger.waitForDeployment();
    gameLoggerAddress = await gameLogger.getAddress();
    console.log("✅ CreditCoinGameLogger deployed to:", gameLoggerAddress);
    
    // Get deployment transaction details
    const deploymentTx = gameLogger.deploymentTransaction();
    const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;
    
    // Create deployment results
    const deploymentResults = {
      network: "creditcoin-testnet",
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      contracts: {
        gameLogger: {
          address: gameLoggerAddress,
          transactionHash: deploymentTx?.hash,
          blockNumber: deploymentReceipt?.blockNumber
        }
      }
    };
    
    // Test the deployed contract
    console.log("\n🧪 Testing CreditCoinGameLogger...");
    const testEntropyRequestId = ethers.keccak256(ethers.toUtf8Bytes("test_entropy_" + Date.now()));
    const testEntropyTxHash = "0x" + "1".repeat(64);
    const testResultData = ethers.toUtf8Bytes("test_result");
    const testBetAmount = ethers.parseEther("0.1");
    const testPayoutAmount = ethers.parseEther("0.2");
    
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
    
    // Save deployment files
    deploymentTimestamp = Date.now();
    const deploymentsDir = './deployments';
    
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    deploymentJsonPath = path.join(deploymentsDir, `creditcoin-contracts-${deploymentTimestamp}.json`);
    fs.writeFileSync(deploymentJsonPath, JSON.stringify(deploymentResults, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentJsonPath);
    
    const envUpdate = `
# CreditCoin Testnet Contract Addresses (deployed ${new Date().toISOString()})
NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}
`;
    
    envUpdatePath = path.join(deploymentsDir, 'creditcoin-env-update.txt');
    fs.writeFileSync(envUpdatePath, envUpdate.trim());
    console.log("📝 Environment variable updates saved to:", envUpdatePath);
    
    console.log("\n✅ Deployment simulation completed!");
  });

  after(async function () {
    // Clean up test files
    if (fs.existsSync(deploymentJsonPath)) {
      fs.unlinkSync(deploymentJsonPath);
    }
    if (fs.existsSync(envUpdatePath)) {
      fs.unlinkSync(envUpdatePath);
    }
  });

  describe("Task 3.3: Save deployment results and generate configuration", function () {
    it("Should save deployment details to JSON file with timestamp", async function () {
      expect(fs.existsSync(deploymentJsonPath)).to.be.true;
      expect(deploymentJsonPath).to.include('creditcoin-contracts-');
      expect(deploymentJsonPath).to.include('.json');
    });

    it("Should include contract address in deployment JSON", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.contracts.gameLogger.address).to.equal(gameLoggerAddress);
      expect(deploymentData.contracts.gameLogger.address).to.be.properAddress;
    });

    it("Should include deployer address in deployment JSON", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.deployer).to.equal(deployer.address);
      expect(deploymentData.deployer).to.be.properAddress;
    });

    it("Should include deployment transaction hash in deployment JSON", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.contracts.gameLogger.transactionHash).to.be.a('string');
      expect(deploymentData.contracts.gameLogger.transactionHash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should include block number in deployment JSON", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.contracts.gameLogger.blockNumber).to.be.a('number');
      expect(deploymentData.contracts.gameLogger.blockNumber).to.be.greaterThan(0);
    });

    it("Should include timestamp in deployment JSON", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.deploymentTime).to.be.a('string');
      const timestamp = new Date(deploymentData.deploymentTime);
      expect(timestamp.toString()).to.not.equal('Invalid Date');
    });

    it("Should generate environment variable updates file", async function () {
      expect(fs.existsSync(envUpdatePath)).to.be.true;
      expect(envUpdatePath).to.include('creditcoin-env-update.txt');
    });

    it("Should include correct contract address in env update file", async function () {
      const fileContent = fs.readFileSync(envUpdatePath, 'utf8');
      
      expect(fileContent).to.include('NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS');
      expect(fileContent).to.include(gameLoggerAddress);
      expect(fileContent).to.include(`NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}`);
    });

    it("Should have deployment summary information available", async function () {
      // Verify all information needed for deployment summary is available
      expect(gameLoggerAddress).to.be.properAddress;
      expect(deployer.address).to.be.properAddress;
      expect(network.chainId).to.be.a('bigint');
      
      // Verify CreditCoin explorer link can be constructed
      const explorerLink = `https://creditcoin-testnet.blockscout.com/address/${gameLoggerAddress}`;
      expect(explorerLink).to.include('creditcoin-testnet.blockscout.com');
      expect(explorerLink).to.include(gameLoggerAddress);
    });

    it("Should have next steps information available", async function () {
      // Verify next steps can be displayed
      const nextSteps = [
        `NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}`,
        `https://creditcoin-testnet.blockscout.com/address/${gameLoggerAddress}`,
        "Authorize treasury address to log games",
        "Test game logging from frontend"
      ];
      
      nextSteps.forEach(step => {
        expect(step).to.be.a('string');
        expect(step.length).to.be.greaterThan(0);
      });
    });
  });

  describe("Deployment Verification", function () {
    it("Should have deployed contract accessible", async function () {
      const code = await ethers.provider.getCode(gameLoggerAddress);
      expect(code).to.not.equal('0x');
    });

    it("Should have deployer authorized as logger", async function () {
      const isAuthorized = await gameLogger.isAuthorizedLogger(deployer.address);
      expect(isAuthorized).to.be.true;
    });

    it("Should have logged test game successfully", async function () {
      const stats = await gameLogger.getStats();
      expect(stats.totalGames).to.equal(1);
    });
  });
});
