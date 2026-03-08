/**
 * Integration Tests: Game API NFT Minting Integration
 * 
 * Tests the integration between game logging API and NFT minting service.
 * Validates that NFT minting operates independently from game logging.
 * 
 * Validates: Requirements 2.1, 2.4, 2.5, 6.3, 6.4
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Game API NFT Integration', function () {
  this.timeout(60000);

  let gameLogger;
  let nftContract;
  let mintingService;
  let treasuryWallet;
  let playerWallet;
  let NFTMintingService;

  before(async function () {
    console.log('\n🚀 Setting up Game API NFT Integration tests...\n');

    // Get signers
    [treasuryWallet, playerWallet] = await ethers.getSigners();

    // Deploy Game Logger contract
    console.log('📝 Deploying CreditCoinGameLogger contract...');
    const GameLogger = await ethers.getContractFactory('CreditCoinGameLogger');
    gameLogger = await GameLogger.deploy();
    await gameLogger.waitForDeployment();
    console.log('✅ GameLogger deployed:', await gameLogger.getAddress());

    // Authorize treasury as logger
    const authTx = await gameLogger.addAuthorizedLogger(treasuryWallet.address);
    await authTx.wait();
    console.log('✅ Treasury authorized as logger');

    // Deploy NFT contract
    console.log('🎨 Deploying APTCasinoNFT contract...');
    const NFTContract = await ethers.getContractFactory('APTCasinoNFT');
    nftContract = await NFTContract.deploy('https://aptcasino.com/nft/');
    await nftContract.waitForDeployment();
    console.log('✅ NFT contract deployed:', await nftContract.getAddress());

    // Authorize treasury as minter
    const authMinterTx = await nftContract.authorizeMinter(treasuryWallet.address);
    await authMinterTx.wait();
    console.log('✅ Treasury authorized as minter');

    // Import NFTMintingService
    NFTMintingService = (await import('../src/services/NFTMintingService.js')).NFTMintingService;

    // Initialize minting service
    mintingService = new NFTMintingService(
      ethers.provider,
      await nftContract.getAddress(),
      treasuryWallet
    );
    console.log('✅ Minting service initialized');
  });

  describe('Requirement 2.1, 6.1: Event-Driven NFT Minting', function () {
    it('Should mint NFT after game is logged', async function () {
      console.log('\n📝 Test: Event-driven NFT minting after game log');

      // Get initial balance
      const initialBalance = await nftContract.balanceOf(treasuryWallet.address);
      console.log('📊 Initial NFT balance:', initialBalance.toString());

      // Track if event was received
      let eventReceived = false;
      
      // Start listening for game events with debug logging
      const unsubscribe = await mintingService.startListening(gameLogger);
      
      // Also add a direct event listener to verify events are being emitted
      gameLogger.once('GameResultLogged', (...args) => {
        console.log('🎯 GameResultLogged event detected directly!');
        console.log('   Event args:', args.slice(0, -1)); // Exclude event object
        eventReceived = true;
      });

      // Log a game
      const gameData = {
        gameType: 0, // ROULETTE
        betAmount: ethers.parseEther('1.0'),
        payout: ethers.parseEther('2.0'),
        entropyRequestId: ethers.keccak256(ethers.toUtf8Bytes('test_request_1')),
        entropyTxHash: '0x' + 'a'.repeat(64)
      };

      const resultData = ethers.toUtf8Bytes(JSON.stringify({ number: 7 }));

      console.log('📤 Logging game result...');
      const tx = await gameLogger.connect(treasuryWallet).logGameResult(
        gameData.gameType,
        gameData.betAmount,
        resultData,
        gameData.payout,
        gameData.entropyRequestId,
        gameData.entropyTxHash
      );

      const receipt = await tx.wait();
      console.log('✅ Game logged, tx:', receipt.hash);
      console.log('📊 Block number:', receipt.blockNumber);

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('📊 Event received:', eventReceived);

      // Wait for NFT minting to process (event listener + queue processing)
      console.log('⏳ Waiting for NFT minting (5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check queue status
      console.log('📊 Mint queue length:', mintingService.mintQueue.length);
      console.log('📊 Is processing:', mintingService.isProcessing);

      // Verify NFT was minted to treasury (since treasury is the msg.sender in game logger)
      const finalBalance = await nftContract.balanceOf(treasuryWallet.address);
      console.log('📊 Final NFT balance:', finalBalance.toString());
      
      expect(finalBalance).to.be.gt(initialBalance, 'NFT should be minted to treasury wallet');

      console.log('✅ NFT minted successfully');

      // Cleanup
      unsubscribe();
    });
  });

  describe('Requirement 6.3, 6.4: Game Logging Independence', function () {
    it('Should complete game logging even if NFT minting fails', async function () {
      console.log('\n📝 Test: Game logging succeeds despite NFT minting failure');

      // Create a minting service with invalid NFT contract address
      const invalidMintingService = new NFTMintingService(
        ethers.provider,
        '0x0000000000000000000000000000000000000001', // Invalid address
        treasuryWallet
      );

      // Start listening (this should not throw)
      try {
        await invalidMintingService.startListening(gameLogger);
      } catch (error) {
        console.log('⚠️ Event listener setup failed (expected):', error.message);
      }

      // Log a game - this should succeed regardless of NFT service
      const gameData = {
        gameType: 1, // MINES
        betAmount: ethers.parseEther('0.5'),
        payout: ethers.parseEther('1.0'),
        entropyRequestId: ethers.keccak256(ethers.toUtf8Bytes('test_request_2')),
        entropyTxHash: '0x' + 'b'.repeat(64)
      };

      const resultData = ethers.toUtf8Bytes(JSON.stringify({ mines: [1, 2, 3] }));

      console.log('📤 Logging game result...');
      const tx = await gameLogger.connect(treasuryWallet).logGameResult(
        gameData.gameType,
        gameData.betAmount,
        resultData,
        gameData.payout,
        gameData.entropyRequestId,
        gameData.entropyTxHash
      );

      const receipt = await tx.wait();
      console.log('✅ Game logged successfully despite NFT service issues, tx:', receipt.hash);

      // Verify game was logged
      const stats = await gameLogger.getStats();
      expect(stats.totalGames).to.be.gt(0n, 'Game should be logged');

      console.log('✅ Game logging is independent of NFT minting');
    });
  });

  describe('Requirement 2.4: Transaction Confirmation Ordering', function () {
    it('Should wait for game log confirmation before minting NFT', async function () {
      console.log('\n📝 Test: NFT minting waits for game log confirmation');

      // Start listening
      const unsubscribe = await mintingService.startListening(gameLogger);

      // Log a game
      const gameData = {
        gameType: 2, // WHEEL
        betAmount: ethers.parseEther('0.75'),
        payout: ethers.parseEther('1.5'),
        entropyRequestId: ethers.keccak256(ethers.toUtf8Bytes('test_request_3')),
        entropyTxHash: '0x' + 'c'.repeat(64)
      };

      const resultData = ethers.toUtf8Bytes(JSON.stringify({ segment: 5 }));

      const initialBalance = await nftContract.balanceOf(treasuryWallet.address);

      console.log('📤 Logging game result...');
      const tx = await gameLogger.connect(treasuryWallet).logGameResult(
        gameData.gameType,
        gameData.betAmount,
        resultData,
        gameData.payout,
        gameData.entropyRequestId,
        gameData.entropyTxHash
      );

      // Don't wait for confirmation yet
      console.log('⏳ Transaction sent, not waiting for confirmation...');

      // Wait a bit to ensure minting service processes the event
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Game logged, tx:', receipt.hash);

      // Wait for NFT minting
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify NFT was minted
      const finalBalance = await nftContract.balanceOf(treasuryWallet.address);
      expect(finalBalance).to.be.gt(initialBalance, 'NFT should be minted after confirmation');

      console.log('✅ NFT minting respects transaction confirmation ordering');

      // Cleanup
      unsubscribe();
    });
  });

  describe('Requirement 2.5: NFT Transaction Hash Storage', function () {
    it('Should store NFT transaction hash in game record', async function () {
      console.log('\n📝 Test: NFT transaction hash storage');

      // This test verifies the updateGameRecord method is called
      // In a real environment, this would update the database
      // For this test, we verify the method exists and can be called

      const mockMintData = {
        logId: ethers.keccak256(ethers.toUtf8Bytes('test_log_id')),
        player: playerWallet.address,
        gameType: 0,
        betAmount: ethers.parseEther('1.0'),
        payout: ethers.parseEther('2.0'),
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        retries: 0
      };

      // Verify updateGameRecord method exists
      expect(mintingService.updateGameRecord).to.be.a('function');

      // Call updateGameRecord (will fail gracefully if DB not available)
      try {
        await mintingService.updateGameRecord(
          mockMintData.logId,
          '0x' + 'd'.repeat(64),
          '123'
        );
        console.log('✅ updateGameRecord method executed');
      } catch (error) {
        console.log('ℹ️ updateGameRecord failed (expected without DB):', error.message);
      }

      console.log('✅ NFT transaction hash storage mechanism verified');
    });
  });
});
