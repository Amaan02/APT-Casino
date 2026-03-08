import { ethers } from 'ethers';

/**
 * NFT Minting Service
 * 
 * Orchestrates NFT minting after game completion on Creditcoin testnet.
 * Operates independently from game logging to ensure game functionality is never disrupted.
 * 
 * Architecture:
 * - Event-driven: Listens to GameResultLogged events from CreditCoinGameLogger
 * - Queue-based: Maintains pending mints for reliability
 * - Retry logic: Handles transient failures with exponential backoff (max 3 retries)
 * - On-chain storage: Stores NFT transaction hashes in CreditCoinGameLogger contract
 */

// NFT Contract ABI (minimal interface)
const NFT_CONTRACT_ABI = [
  'event NFTMinted(uint256 indexed tokenId, address indexed recipient, bytes32 indexed logId, string gameType)',
  'function mintGameNFT(address recipient, string memory gameType, uint256 betAmount, string memory result, uint256 payout, uint256 timestamp, bytes32 logId) external returns (uint256)',
  'function getTokenMetadata(uint256 tokenId) external view returns (tuple(string gameType, uint256 betAmount, string result, uint256 payout, uint256 timestamp, bytes32 logId))',
  'function getTokensByOwner(address owner) external view returns (uint256[] memory)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)'
];

// Game type enum mapping
const GAME_TYPES = {
  0: 'ROULETTE',
  1: 'MINES',
  2: 'WHEEL',
  3: 'PLINKO'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000
};

/**
 * NFT Minting Service
 * Handles minting NFTs for completed games
 */
export class NFTMintingService {
  constructor(provider, nftContractAddress, treasuryWallet) {
    this.provider = provider;
    this.nftContractAddress = nftContractAddress;
    this.treasuryWallet = treasuryWallet;
    this.mintQueue = [];
    this.isProcessing = false;
    this.maxRetries = RETRY_CONFIG.maxRetries;
    this.eventListener = null;
    this.gameLoggerContract = null;

    // Initialize NFT contract
    if (!nftContractAddress || nftContractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ NFT contract address not configured - NFT minting disabled');
      this.nftContract = null;
    } else {
      try {
        this.nftContract = new ethers.Contract(
          nftContractAddress,
          NFT_CONTRACT_ABI,
          treasuryWallet
        );
        console.log('✅ NFT Minting Service initialized:', nftContractAddress);
      } catch (error) {
        console.error('❌ Failed to initialize NFT contract:', error);
        this.nftContract = null;
      }
    }
  }

  /**
   * Start listening for GameResultLogged events from game logger contract
   */
  async startListening(gameLoggerContract) {
    if (!this.nftContract) {
      console.warn('⚠️ NFT contract not available - event listening disabled');
      return;
    }

    // Clean up previous listener if it exists
    if (this.gameLoggerContract && this.eventListener) {
      this.gameLoggerContract.off('GameResultLogged', this.eventListener);
      console.log('🧹 Cleaned up previous event listener');
    }

    this.gameLoggerContract = gameLoggerContract;

    try {
      // Create event listener callback
      this.eventListener = async (...args) => {
        try {
          const event = args[args.length - 1];
          const [logId, player, gameType, betAmount, payout, entropyRequestId, entropyTxHash, timestamp] = args.slice(0, -1);

          console.log('🎮 Game result logged, queuing NFT mint:', {
            logId,
            player,
            gameType: this.getGameTypeString(gameType)
          });

          await this.queueMint({
            logId,
            player,
            gameType,
            betAmount,
            payout,
            timestamp,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            retries: 0
          });
        } catch (error) {
          console.error('❌ Error in event listener callback:', error);
        }
      };

      // Listen for GameResultLogged events
      gameLoggerContract.on('GameResultLogged', this.eventListener);
      console.log('✅ NFT Minting Service listening for game events');

      return () => {
        gameLoggerContract.off('GameResultLogged', this.eventListener);
      };
    } catch (error) {
      console.error('❌ Failed to start event listener:', error);
      throw error;
    }
  }

  /**
   * Add mint task to queue
   */
  async queueMint(mintData) {
    this.mintQueue.push(mintData);
    console.log(`📋 Mint queued for game ${mintData.logId} (Queue size: ${this.mintQueue.length})`);

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Process minting queue with retry logic
   */
  async processQueue() {
    if (!this.nftContract) {
      console.warn('⚠️ NFT contract not available - queue processing skipped');
      return;
    }

    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.mintQueue.length > 0) {
      const mintData = this.mintQueue.shift();

      try {
        // Wait for game logger transaction to be confirmed
        if (mintData.blockNumber) {
          try {
            const currentBlock = await this.provider.getBlockNumber();
            const confirmations = currentBlock - mintData.blockNumber;

            if (confirmations < 1) {
              console.log(`⏳ Waiting for game log confirmation (${confirmations} confirmations)...`);
              await this.delay(2000);
              this.mintQueue.unshift(mintData);
              continue;
            }
          } catch (rpcErr) {
            console.warn('⚠️ RPC error checking confirmations, proceeding anyway:', rpcErr.message);
          }
        }

        const { txHash, tokenId, imagePath } = await this.mintNFT(mintData);
        await this.updateGameRecord(mintData.logId, txHash, tokenId, imagePath);
        console.log(`✅ NFT minted for game ${mintData.logId}: Token #${tokenId}, Tx: ${txHash}, Image: ${imagePath}`);
      } catch (error) {
        console.error(`❌ Failed to mint NFT for game ${mintData.logId}:`, error.message);

        if (mintData.retries < this.maxRetries) {
          mintData.retries++;
          const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(2, mintData.retries),
            RETRY_CONFIG.maxDelay
          );
          console.log(`⏳ Retry ${mintData.retries}/${this.maxRetries} in ${delay}ms...`);
          await this.delay(delay);
          this.mintQueue.push(mintData);
        } else {
          console.error(`💾 Max retries reached for game ${mintData.logId}, giving up`);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Randomly select an NFT image from the available pool
   */
  selectRandomNFTImage() {
    const images = ['/nft.png', '/nft1.png', '/nft2.png', '/nft3.png'];
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  }

  /**
   * Mint NFT by calling contract's mintGameNFT function
   */
  async mintNFT(mintData) {
    if (!this.nftContract) {
      throw new Error('NFT contract not initialized');
    }

    if (!mintData.player || !ethers.isAddress(mintData.player)) {
      throw new Error(`Invalid player address: ${mintData.player}`);
    }

    const nftImagePath = this.selectRandomNFTImage();
    const gameTypeString = this.getGameTypeString(mintData.gameType);
    const resultString = this.encodeResult(mintData);

    console.log('🎨 Minting NFT:', {
      player: mintData.player,
      gameType: gameTypeString,
      betAmount: mintData.betAmount.toString(),
      payout: mintData.payout.toString(),
      logId: mintData.logId,
      imagePath: nftImagePath
    });

    const tx = await this.nftContract.mintGameNFT(
      mintData.player,
      gameTypeString,
      mintData.betAmount,
      resultString,
      mintData.payout,
      mintData.timestamp,
      mintData.logId
    );

    const receipt = await tx.wait();

    // Extract token ID from NFTMinted event
    const mintEvent = receipt.logs
      .map(log => {
        try {
          return this.nftContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event && event.name === 'NFTMinted');

    const tokenId = mintEvent ? mintEvent.args.tokenId.toString() : null;

    return {
      txHash: receipt.hash,
      tokenId,
      imagePath: nftImagePath
    };
  }

  /**
   * Convert game type enum to string
   */
  getGameTypeString(gameType) {
    if (typeof gameType === 'number' || typeof gameType === 'bigint') {
      return GAME_TYPES[Number(gameType)] || 'UNKNOWN';
    }
    if (typeof gameType === 'string') {
      return gameType.toUpperCase();
    }
    return 'UNKNOWN';
  }

  /**
   * Encode game result data as JSON string
   */
  encodeResult(mintData) {
    try {
      const result = {
        gameType: this.getGameTypeString(mintData.gameType),
        betAmount: mintData.betAmount.toString(),
        payout: mintData.payout.toString()
      };
      return JSON.stringify(result);
    } catch (error) {
      console.error('Failed to encode result:', error);
      return '{}';
    }
  }

  /**
   * Update game record with NFT transaction hash, token ID, and image path
   */
  async updateGameRecord(logId, nftTxHash, tokenId, imagePath) {
    try {
      if (!this.gameLoggerContract) {
        console.warn('⚠️ No game logger contract available for NFT update');
        return;
      }

      console.log(`🔗 Updating game log ${logId} with NFT info on-chain...`);

      // Ensure tokenId is a bigint for uint256
      const tokenIdBI = BigInt(tokenId || 0);

      // Use getFunction for more robust method calling in ethers v6
      let tx;
      if (typeof this.gameLoggerContract.updateNFTInfo === 'function') {
        tx = await this.gameLoggerContract.updateNFTInfo(
          logId,
          nftTxHash,
          tokenIdBI,
          imagePath
        );
      } else {
        // Fallback to getFunction if direct access fails
        const updateFn = this.gameLoggerContract.getFunction('updateNFTInfo');
        if (!updateFn) {
          throw new Error('updateNFTInfo function not found on contract');
        }
        tx = await updateFn(logId, nftTxHash, tokenIdBI, imagePath);
      }

      await tx.wait();
      console.log(`✅ Successfully updated game log ${logId} on-chain`);
    } catch (error) {
      console.error('❌ Failed to update game record on-chain:', error.message);
      // Detailed logging to help debug if it fails again
      if (this.gameLoggerContract) {
        console.log('🔍 Contract address:', this.gameLoggerContract.target);
        console.log('🔍 Available functions:', Object.keys(this.gameLoggerContract.functions || {}));
      }
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close service and cleanup
   */
  async close() {
    if (this.gameLoggerContract && this.eventListener) {
      this.gameLoggerContract.off('GameResultLogged', this.eventListener);
      this.eventListener = null;
    }
  }
}

export default NFTMintingService;
