const { expect } = require("chai");
const { ethers } = require("hardhat");
const { NFTMintingService } = require("../src/services/NFTMintingService");

/**
 * NFT Minting Service Tests
 * 
 * Tests the NFTMintingService functionality including:
 * - Service initialization
 * - Event listening for game logger events
 * - Queue processing with retry logic
 * - Database integration
 * - Error handling and recovery
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe("NFT Minting Service", function () {
  let nftContract;
  let gameLogger;
  let mintingService;
  let deployer;
  let treasuryWallet;
  let player;
  let provider;

  before(async function () {
    console.log("\n🚀 Setting up NFT Minting Service Test Environment...\n");

    // Get signers
    [deployer, treasuryWallet, player] = await ethers.getSigners();
    provider = ethers.provider;

    console.log("👤 Deployer:", deployer.address);
    console.log("👤 Treasury:", treasuryWallet.address);
    console.log("👤 Player:", player.address);

    // Deploy NFT Contract
    console.log("\n📦 Deploying APTCasinoNFT...");
    const APTCasinoNFT = await ethers.getContractFactory("APTCasinoNFT");
    nftContract = await APTCasinoNFT.deploy("https://aptcasino.com/nft/");
    await nftContract.waitForDeployment();
    const nftAddress = await nftContract.getAddress();
    console.log("✅ NFT Contract deployed:", nftAddress);

    // Authorize treasury as minter
    await nftContract.authorizeMinter(treasuryWallet.address);
    console.log("✅ Treasury authorized as minter");

    // Deploy Game Logger
    console.log("\n📦 Deploying CreditCoinGameLogger...");
    const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
    gameLogger = await CreditCoinGameLogger.deploy();
    await gameLogger.waitForDeployment();
    const loggerAddress = await gameLogger.getAddress();
    console.log("✅ Game Logger deployed:", loggerAddress);

    // Authorize treasury to log games
    await gameLogger.addAuthorizedLogger(treasuryWallet.address);
    console.log("✅ Treasury authorized as logger");

    // Initialize Minting Service
    console.log("\n🔧 Initializing NFT Minting Service...");
    mintingService = new NFTMintingService(
      provider,
      nftAddress,
      treasuryWallet
    );
    console.log("✅ Minting Service initialized\n");
  });

  after(async function () {
    // Clean up
    if (mintingService) {
      await mintingService.close();
    }
  });

  describe("Service Initialization", function () {
    it("Should initialize with valid contract address", function () {
      expect(mintingService.nftContract).to.not.be.null;
      expect(mintingService.provider).to.equal(provider);
      expect(mintingService.maxRetries).to.equal(3);
      expect(mintingService.mintQueue).to.be.an('array');
      expect(mintingService.isProcessing).to.be.false;
    });

    it("Should handle missing NFT contract address", function () {
      const serviceWithoutContract = new NFTMintingService(
        provider,
        null,
        treasuryWallet
      );
      
      expect(serviceWithoutContract.nftContract).to.be.null;
    });

    it("Should handle invalid NFT contract address", function () {
      const serviceWithInvalidContract = new NFTMintingService(
        provider,
        ethers.ZeroAddress,
        treasuryWallet
      );
      
      expect(serviceWithInvalidContract.nftContract).to.be.null;
    });
  });

  describe("Event Listening (Requirement 6.1)", function () {
    it("Should start listening to GameResultLogged events", async function () {
      const unsubscribe = await mintingService.startListening(gameLogger);
      
      expect(mintingService.eventListener).to.not.be.null;
      expect(unsubscribe).to.be.a('function');
      
      // Clean up
      unsubscribe();
    });

    it("Should handle event listening when contract not available", async function () {
      const serviceWithoutContract = new NFTMintingService(
        provider,
        null,
        treasuryWallet
      );
      
      // Should not throw
      await serviceWithoutContract.startListening(gameLogger);
    });
  });

  describe("Queue Management (Requirement 6.5)", function () {
    it("Should add mint task to queue", async function () {
      const initialQueueSize = mintingService.mintQueue.length;
      
      await mintingService.queueMint({
        logId: ethers.keccak256(ethers.toUtf8Bytes("test_queue_1")),
        player: player.address,
        gameType: 0,
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2"),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      });
      
      // Queue should be processed automatically
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Queue should be empty after processing
      expect(mintingService.isProcessing).to.be.false;
    });

    it("Should process queue sequentially", async function () {
      // Add multiple mints to queue
      const mints = [];
      for (let i = 0; i < 3; i++) {
        mints.push({
          logId: ethers.keccak256(ethers.toUtf8Bytes(`test_queue_${i}`)),
          player: player.address,
          gameType: i % 4,
          betAmount: ethers.parseEther("0.1"),
          payout: ethers.parseEther("0.2"),
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          retries: 0
        });
      }
      
      // Queue all mints
      for (const mint of mints) {
        await mintingService.queueMint(mint);
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // All should be processed
      expect(mintingService.mintQueue.length).to.equal(0);
      expect(mintingService.isProcessing).to.be.false;
    });
  });

  describe("NFT Minting (Requirements 2.1, 2.2, 6.2)", function () {
    it("Should mint NFT with correct metadata", async function () {
      const mintData = {
        logId: ethers.keccak256(ethers.toUtf8Bytes("test_mint_1")),
        player: player.address,
        gameType: 0, // ROULETTE
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2"),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      };
      
      const { txHash, tokenId } = await mintingService.mintNFT(mintData);
      
      expect(txHash).to.be.a('string');
      expect(txHash).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(tokenId).to.not.be.null;
      
      console.log("✅ NFT minted - Token ID:", tokenId, "TX:", txHash);
      
      // Verify metadata
      const metadata = await nftContract.getTokenMetadata(tokenId);
      expect(metadata.gameType).to.equal("ROULETTE");
      expect(metadata.betAmount).to.equal(mintData.betAmount);
      expect(metadata.payout).to.equal(mintData.payout);
      expect(metadata.logId).to.equal(mintData.logId);
    });

    it("Should handle different game types", async function () {
      const gameTypes = [
        { enum: 0, string: "ROULETTE" },
        { enum: 1, string: "MINES" },
        { enum: 2, string: "WHEEL" },
        { enum: 3, string: "PLINKO" }
      ];
      
      for (const gameType of gameTypes) {
        const mintData = {
          logId: ethers.keccak256(ethers.toUtf8Bytes(`test_${gameType.string}`)),
          player: player.address,
          gameType: gameType.enum,
          betAmount: ethers.parseEther("0.1"),
          payout: ethers.parseEther("0.2"),
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          retries: 0
        };
        
        const { tokenId } = await mintingService.mintNFT(mintData);
        const metadata = await nftContract.getTokenMetadata(tokenId);
        
        expect(metadata.gameType).to.equal(gameType.string);
        console.log(`✅ ${gameType.string} NFT minted - Token ID: ${tokenId}`);
      }
    });

    it("Should reject minting with invalid player address (Requirement 7.5)", async function () {
      const mintData = {
        logId: ethers.keccak256(ethers.toUtf8Bytes("test_invalid_address")),
        player: "invalid_address",
        gameType: 0,
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2"),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      };
      
      await expect(mintingService.mintNFT(mintData))
        .to.be.rejectedWith("Invalid player address");
    });

    it("Should reject minting with null player address", async function () {
      const mintData = {
        logId: ethers.keccak256(ethers.toUtf8Bytes("test_null_address")),
        player: null,
        gameType: 0,
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2"),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      };
      
      await expect(mintingService.mintNFT(mintData))
        .to.be.rejectedWith("Invalid player address");
    });
  });

  describe("Game Type Conversion (Requirement 6.2)", function () {
    it("Should convert numeric game types to strings", function () {
      expect(mintingService.getGameTypeString(0)).to.equal("ROULETTE");
      expect(mintingService.getGameTypeString(1)).to.equal("MINES");
      expect(mintingService.getGameTypeString(2)).to.equal("WHEEL");
      expect(mintingService.getGameTypeString(3)).to.equal("PLINKO");
    });

    it("Should handle string game types", function () {
      expect(mintingService.getGameTypeString("roulette")).to.equal("ROULETTE");
      expect(mintingService.getGameTypeString("MINES")).to.equal("MINES");
    });

    it("Should handle unknown game types", function () {
      expect(mintingService.getGameTypeString(999)).to.equal("UNKNOWN");
    });
  });

  describe("Result Encoding (Requirement 2.2)", function () {
    it("Should encode result data as JSON", function () {
      const mintData = {
        gameType: 0,
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2")
      };
      
      const encoded = mintingService.encodeResult(mintData);
      const decoded = JSON.parse(encoded);
      
      expect(decoded.gameType).to.equal("ROULETTE");
      expect(decoded.betAmount).to.equal(mintData.betAmount.toString());
      expect(decoded.payout).to.equal(mintData.payout.toString());
    });

    it("Should handle encoding errors gracefully", function () {
      const invalidData = {
        gameType: 0,
        betAmount: { circular: null }
      };
      invalidData.betAmount.circular = invalidData;
      
      const encoded = mintingService.encodeResult(invalidData);
      expect(encoded).to.equal("{}");
    });
  });

  describe("End-to-End: Event Detection to NFT Mint", function () {
    it("Should detect game log event and mint NFT automatically", async function () {
      console.log("\n🎮 Testing end-to-end flow: Game Log → Event → NFT Mint\n");

      // Start listening
      const unsubscribe = await mintingService.startListening(gameLogger);

      // Log a game
      const gameData = {
        gameType: 0, // ROULETTE
        betAmount: ethers.parseEther("0.1"),
        resultData: ethers.toUtf8Bytes(JSON.stringify({ number: 13, color: "black" })),
        payout: ethers.parseEther("0.2"),
        entropyRequestId: ethers.randomBytes(32),
        entropyTxHash: "0x" + "f".repeat(64)
      };

      console.log("📝 Logging game result...");
      const tx = await gameLogger.connect(treasuryWallet).logGameResult(
        gameData.gameType,
        gameData.betAmount,
        gameData.resultData,
        gameData.payout,
        gameData.entropyRequestId,
        gameData.entropyTxHash
      );

      const receipt = await tx.wait();
      console.log("✅ Game logged:", receipt.hash);

      // Wait for event processing and minting
      console.log("⏳ Waiting for NFT minting...");
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify NFT was minted
      const playerBalance = await nftContract.balanceOf(player.address);
      console.log("✅ Player NFT balance:", playerBalance.toString());
      
      expect(playerBalance).to.be.gt(0);

      // Clean up
      unsubscribe();
    });
  });

  describe("Error Handling", function () {
    it("Should handle minting when contract not initialized (Requirement 7.1)", async function () {
      const serviceWithoutContract = new NFTMintingService(
        provider,
        null,
        treasuryWallet
      );

      const mintData = {
        logId: ethers.keccak256(ethers.toUtf8Bytes("test_no_contract")),
        player: player.address,
        gameType: 0,
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2"),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      };

      await expect(serviceWithoutContract.mintNFT(mintData))
        .to.be.rejectedWith("NFT contract not initialized");
    });

    it("Should skip queue processing when contract not available", async function () {
      const serviceWithoutContract = new NFTMintingService(
        provider,
        null,
        treasuryWallet
      );

      await serviceWithoutContract.queueMint({
        logId: ethers.keccak256(ethers.toUtf8Bytes("test_skip")),
        player: player.address,
        gameType: 0,
        betAmount: ethers.parseEther("0.1"),
        payout: ethers.parseEther("0.2"),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      });

      // Should not throw
      expect(serviceWithoutContract.mintQueue.length).to.equal(1);
    });
  });

  describe("Helper Functions", function () {
    it("Should delay for specified milliseconds", async function () {
      const start = Date.now();
      await mintingService.delay(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).to.be.gte(100);
      expect(elapsed).to.be.lt(200);
    });
  });

  describe("Service Lifecycle", function () {
    it("Should close database connection cleanly", async function () {
      const tempService = new NFTMintingService(
        provider,
        await nftContract.getAddress(),
        treasuryWallet
      );

      // Should not throw
      await tempService.close();
    });
  });
});
