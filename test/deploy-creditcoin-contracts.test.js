const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreditCoinGameLogger Deployment and Testing", function () {
  let gameLogger;
  let deployer;
  let testBetAmount;
  let testPayoutAmount;

  before(async function () {
    // Get signers
    [deployer] = await ethers.getSigners();
    
    // Deploy the contract
    const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
    gameLogger = await CreditCoinGameLogger.deploy();
    await gameLogger.waitForDeployment();
    
    // Set test amounts
    testBetAmount = ethers.parseEther("0.1");
    testPayoutAmount = ethers.parseEther("0.2");
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await gameLogger.getAddress();
      expect(address).to.be.properAddress;
    });

    it("Should verify deployer is authorized logger", async function () {
      const isAuthorized = await gameLogger.isAuthorizedLogger(deployer.address);
      expect(isAuthorized).to.be.true;
    });

    it("Should have initial stats of zero", async function () {
      const stats = await gameLogger.getStats();
      expect(stats.totalGames).to.equal(0);
      expect(stats.totalBets).to.equal(0);
      expect(stats.totalPayouts).to.equal(0);
      expect(stats.rouletteCount).to.equal(0);
      expect(stats.minesCount).to.equal(0);
      expect(stats.wheelCount).to.equal(0);
      expect(stats.plinkoCount).to.equal(0);
    });
  });

  describe("Game Logging", function () {
    let logId;
    let testEntropyRequestId;
    let testEntropyTxHash;
    let testResultData;

    before(async function () {
      // Prepare test data
      testEntropyRequestId = ethers.keccak256(ethers.toUtf8Bytes("test_entropy_" + Date.now()));
      testEntropyTxHash = "0x" + "1".repeat(64);
      testResultData = ethers.toUtf8Bytes("test_result");
    });

    it("Should log a game result successfully", async function () {
      const tx = await gameLogger.logGameResult(
        0, // GameType.ROULETTE
        testBetAmount,
        testResultData,
        testPayoutAmount,
        testEntropyRequestId,
        testEntropyTxHash
      );
      
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      
      // Extract log ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = gameLogger.interface.parseLog(log);
          return parsed.name === 'GameResultLogged';
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = gameLogger.interface.parseLog(event);
      logId = parsedEvent.args.logId;
      expect(logId).to.not.be.null;
    });

    it("Should retrieve the logged game correctly", async function () {
      const gameLog = await gameLogger.getGameLog(logId);
      
      expect(gameLog.player).to.equal(deployer.address);
      expect(gameLog.gameType).to.equal(0); // ROULETTE
      expect(gameLog.betAmount).to.equal(testBetAmount);
      expect(gameLog.payout).to.equal(testPayoutAmount);
      expect(gameLog.entropyRequestId).to.equal(testEntropyRequestId);
      expect(gameLog.entropyTxHash).to.equal(testEntropyTxHash);
    });

    it("Should update statistics correctly", async function () {
      const stats = await gameLogger.getStats();
      
      expect(stats.totalGames).to.equal(1);
      expect(stats.totalBets).to.equal(testBetAmount);
      expect(stats.totalPayouts).to.equal(testPayoutAmount);
      expect(stats.rouletteCount).to.equal(1);
      expect(stats.minesCount).to.equal(0);
      expect(stats.wheelCount).to.equal(0);
      expect(stats.plinkoCount).to.equal(0);
    });
  });

  describe("Authorization", function () {
    it("Should verify deployer is authorized", async function () {
      const isAuthorized = await gameLogger.isAuthorizedLogger(deployer.address);
      expect(isAuthorized).to.be.true;
    });

    it("Should verify owner is always authorized", async function () {
      const owner = await gameLogger.owner();
      const isAuthorized = await gameLogger.isAuthorizedLogger(owner);
      expect(isAuthorized).to.be.true;
    });
  });
});
