import { ethers } from 'ethers';
import creditcoinTestnetConfig, { getCreditcoinExplorerTxUrl } from '../config/creditcoinTestnetConfig';

/**
 * CreditCoin Game Logger Service
 *
 * Handles game logging on CreditCoin Testnet. Pyth Entropy (backend) provides
 * provably fair randomness.
 *
 * Flow:
 * 1. Game requests randomness from Pyth Entropy (backend)
 * 2. Entropy service returns requestId + entropy transaction hash
 * 3. Game logging service receives entropy proof
 * 4. Game result logged to CreditCoin Testnet with entropy reference
 * 5. Transaction hashes returned to frontend for verification
 */

// Game Logger Contract ABI (minimal interface)
const GAME_LOGGER_ABI = [
  // Events
  'event GameResultLogged(bytes32 indexed logId, address indexed player, uint8 gameType, uint256 betAmount, uint256 payout, bytes32 entropyRequestId, string entropyTxHash, uint256 timestamp)',
  'event NFTMinted(bytes32 indexed logId, address indexed player, uint256 indexed tokenId, string nftTxHash, string imagePath)',

  // Functions
  'function logGameResult(uint8 gameType, uint256 betAmount, bytes memory resultData, uint256 payout, bytes32 entropyRequestId, string memory entropyTxHash) external returns (bytes32 logId)',
  'function getGameLog(bytes32 logId) external view returns (tuple(bytes32 logId, address player, uint8 gameType, uint256 betAmount, bytes resultData, uint256 payout, bytes32 entropyRequestId, string entropyTxHash, uint256 timestamp, uint256 blockNumber, string nftTxHash, uint256 nftTokenId, string nftImagePath))',
  'function getPlayerHistory(address player, uint256 limit) external view returns (bytes32[] memory)',
  'function getLogsByGameType(uint8 gameType, uint256 limit) external view returns (bytes32[] memory)',
  'function getPlayerGameCount(address player) external view returns (uint256)',
  'function getTotalLogs() external view returns (uint256)',
  'function getStats() external view returns (uint256 totalGames, uint256 totalBets, uint256 totalPayouts, uint256 rouletteCount, uint256 minesCount, uint256 wheelCount, uint256 plinkoCount)',
  'function updateNFTInfo(bytes32 logId, string memory nftTxHash, uint256 tokenId, string memory imagePath) external',
  'function isAuthorizedLogger(address logger) external view returns (bool)'
];

// Game type enum mapping
const GAME_TYPES = {
  ROULETTE: 0,
  MINES: 1,
  WHEEL: 2,
  PLINKO: 3
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 4000   // 4 seconds
};

/**
 * CreditCoin Game Logger Service
 * Handles logging game results to CreditCoin Testnet blockchain
 */
export class CreditCoinGameLogger {
  constructor(provider = null, signer = null) {
    this.provider = provider;
    this.signer = signer;
    this.contract = null;
    this.contractAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
    this.explorerUrl = creditcoinTestnetConfig.blockExplorers.default.url;

    if (this.provider && this.contractAddress) {
      this.initializeContract();
    }
  }

  /**
   * Initialize the contract instance
   */
  initializeContract() {
    try {
      if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('⚠️ CreditCoin Game Logger contract address not configured');
        return;
      }

      const signerOrProvider = this.signer || this.provider;
      this.contract = new ethers.Contract(
        this.contractAddress,
        GAME_LOGGER_ABI,
        signerOrProvider
      );

      console.log('✅ CreditCoin Game Logger initialized:', this.contractAddress);
    } catch (error) {
      console.error('❌ Failed to initialize CreditCoin Game Logger contract:', error);
      throw error;
    }
  }

  /**
   * Set provider and signer
   */
  setProviderAndSigner(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    this.initializeContract();
  }

  /**
   * Sleep helper for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log a game result to CreditCoin Testnet with retry logic
   * @param {Object} gameData - Game result data
   * @returns {Promise<string>} Transaction hash
   */
  async logGameResult(gameData) {
    let lastError;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await this._logGameResultAttempt(gameData);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Game logging attempt ${attempt} failed:`, error.message);

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
            RETRY_CONFIG.maxDelay
          );
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Game logging failed after ${RETRY_CONFIG.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Single attempt to log game result
   * Returns CreditCoin game log hash and entropy transaction hash
   */
  async _logGameResultAttempt(gameData) {
    if (!this.contract) {
      throw new Error('CreditCoin Game Logger contract not initialized');
    }

    if (!this.signer) {
      throw new Error('Signer required to log game results');
    }

    const {
      gameType,
      playerAddress,
      betAmount,
      result,
      payout,
      entropyProof
    } = gameData;

    // Validate required fields
    this.validateGameData(gameData);

    // Convert game type to enum value
    const gameTypeEnum = GAME_TYPES[gameType.toUpperCase()];
    if (gameTypeEnum === undefined) {
      throw new Error(`Invalid game type: ${gameType}`);
    }

    // Encode result data
    const resultData = this.encodeResultData(result);

    // Convert amounts to CTC wei units
    const betAmountWei = ethers.parseEther(betAmount.toString());
    const payoutWei = ethers.parseEther(payout.toString());

    // Prepare entropy proof for logging
    const entropyRequestId = entropyProof?.requestId || entropyProof?.sequenceNumber || ethers.ZeroHash;
    const entropyTxHash = entropyProof?.transactionHash || '';

    console.log('📝 Logging game result to CreditCoin with entropy reference:', {
      gameType,
      betAmount: betAmountWei.toString(),
      payout: payoutWei.toString(),
      entropyRequestId,
      entropyTxHash
    });

    // Call contract function on CreditCoin Testnet (Requirement 5.5)
    const tx = await this.contract.logGameResult(
      gameTypeEnum,
      betAmountWei,
      resultData,
      payoutWei,
      entropyRequestId,
      entropyTxHash
    );

    console.log('⏳ CreditCoin transaction submitted:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('✅ Game result logged on CreditCoin:', {
      creditcoinTxHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      entropyTxHash
    });

    // Return both transaction hashes (Requirement 5.8)
    return {
      transactionHash: receipt.hash,
      creditcoinTxHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      entropyTxHash: entropyTxHash,
      entropyTxHash,
      gameLogNetwork: 'creditcoin-testnet',
      entropyNetwork: 'entropy'
    };
  }


  /**
   * Get game log by ID
   */
  async getGameLog(logId) {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      const log = await this.contract.getGameLog(logId);
      const decodedResult = this.decodeResultData(log.resultData);
      const gameType = this.getGameTypeName(log.gameType);

      // Extract additional details from result for better UI display
      let details = null;
      let betType = gameType;
      let multiplier = "0.00x";
      let title = gameType;

      if (decodedResult) {
        if (gameType === 'ROULETTE' && decodedResult.bets) {
          betType = `Multiple Bets (${decodedResult.bets.length})`;
          title = betType;
          details = {
            winningBets: decodedResult.winningBets?.map(b => `${b.name || 'Bet'}: ${b.amount} × ${b.multiplier}x`) || [],
            losingBets: decodedResult.losingBets?.map(b => `${b.name || 'Bet'}: -${b.amount}`) || []
          };
          multiplier = decodedResult.netResult > 0 ? (decodedResult.netResult / parseFloat(ethers.formatEther(log.betAmount))).toFixed(2) + "x" : "0.00x";
        } else if (gameType === 'MINES') {
          betType = `Mines: ${decodedResult.minePositions?.length || 0}`;
          title = betType;
          details = {
            revealed: decodedResult.revealedPositions?.length || 0,
            hitMine: decodedResult.hitMine || false
          };
          multiplier = (decodedResult.currentMultiplier || 0).toFixed(2) + "x";
        } else if (gameType === 'WHEEL' || gameType === 'PLINKO') {
          multiplier = (decodedResult.multiplier || 0).toFixed(2) + "x";
          title = `${gameType} Game`;
        }
      }

      const payout = ethers.formatEther(log.payout);
      const betAmount = ethers.formatEther(log.betAmount);

      return {
        id: log.logId, // Set id to logId for component key usage
        logId: log.logId,
        player: log.player,
        gameType: gameType,
        game: gameType.toLowerCase(),
        betType: betType,
        title: title,
        betAmount: betAmount,
        bet: `${betAmount} CTC`, // String for Mines/Wheel
        amount: parseFloat(betAmount),
        resultData: log.resultData,
        result: decodedResult,
        details: details,
        // Add winningNumber for Roulette compatibility
        winningNumber: decodedResult?.winningNumber !== undefined ? decodedResult.winningNumber :
          decodedResult?.result !== undefined ? decodedResult.result : null,
        payout: payout,
        payoutAmount: parseFloat(payout),
        multiplier: multiplier,
        win: parseFloat(payout) > 0,
        outcome: parseFloat(payout) > 0 ? 'win' : 'loss',
        entropyRequestId: log.entropyRequestId,
        entropyTxHash: log.entropyTxHash,
        timestamp: Number(log.timestamp) * 1000,
        time: new Date(Number(log.timestamp) * 1000).toLocaleString(), // String for display
        blockNumber: Number(log.blockNumber),
        nftTxHash: log.nftTxHash && log.nftTxHash !== ethers.ZeroHash ? log.nftTxHash : null,
        nftTokenId: log.nftTokenId && log.nftTokenId !== 0n ? log.nftTokenId.toString() : null,
        nftImagePath: log.nftImagePath,
        creditcoinTxHash: log.logId,
        explorerUrl: this.getTransactionUrl(log.logId)
      };
    } catch (error) {
      console.error('❌ Failed to get game log:', error);
      throw error;
    }
  }

  /**
   * Get player's game history from blockchain
   */
  async getGameHistory(playerAddress, limit = 50) {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      const logIds = await this.contract.getPlayerHistory(playerAddress, limit);

      if (logIds.length === 0) {
        return [];
      }

      const logs = await Promise.all(
        logIds.map(async (logId) => {
          try {
            return await this.getGameLog(logId);
          } catch (error) {
            console.error(`Failed to fetch log ${logId}:`, error);
            return null;
          }
        })
      );

      return logs.filter(log => log !== null);
    } catch (error) {
      console.error('❌ Failed to get game history:', error);
      throw error;
    }
  }

  /**
   * Get player's total game count
   */
  async getPlayerGameCount(playerAddress) {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      const count = await this.contract.getPlayerGameCount(playerAddress);
      return Number(count);
    } catch (error) {
      console.error('❌ Failed to get player game count:', error);
      throw error;
    }
  }

  /**
   * Get logs by game type
   * @param {string} gameType - Game type (ROULETTE, MINES, WHEEL, PLINKO)
   * @param {number} limit - Maximum number of logs to return (0 for all)
   * @returns {Promise<Array>} Array of game logs
   */
  async getLogsByGameType(gameType, limit = 50) {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      // Convert game type to enum value
      const gameTypeEnum = GAME_TYPES[gameType.toUpperCase()];
      if (gameTypeEnum === undefined) {
        throw new Error(`Invalid game type: ${gameType}`);
      }

      const logIds = await this.contract.getLogsByGameType(gameTypeEnum, limit);

      if (logIds.length === 0) {
        return [];
      }

      const logs = await Promise.all(
        logIds.map(async (logId) => {
          try {
            return await this.getGameLog(logId);
          } catch (error) {
            console.error(`Failed to fetch log ${logId}:`, error);
            return null;
          }
        })
      );

      return logs.filter(log => log !== null);
    } catch (error) {
      console.error('❌ Failed to get logs by game type:', error);
      throw error;
    }
  }

  /**
   * Get contract statistics
   */
  async getStats() {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      const stats = await this.contract.getStats();

      return {
        totalGames: Number(stats.totalGames),
        totalBets: ethers.formatEther(stats.totalBets),
        totalPayouts: ethers.formatEther(stats.totalPayouts),
        gameTypeCounts: {
          roulette: Number(stats.rouletteCount),
          mines: Number(stats.minesCount),
          wheel: Number(stats.wheelCount),
          plinko: Number(stats.plinkoCount)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Get transaction explorer URL
   */
  getTransactionUrl(txHash) {
    return getCreditcoinExplorerTxUrl(txHash);
  }

  /**
   * Validate game data
   */
  validateGameData(gameData) {
    const { gameType, playerAddress, betAmount, result, payout } = gameData;

    if (!gameType) {
      throw new Error('Game type is required');
    }

    if (!playerAddress || !ethers.isAddress(playerAddress)) {
      throw new Error('Valid player address is required');
    }

    if (betAmount === undefined || betAmount === null || betAmount < 0) {
      throw new Error('Valid bet amount is required');
    }

    if (payout === undefined || payout === null || payout < 0) {
      throw new Error('Valid payout amount is required');
    }

    if (!result) {
      throw new Error('Game result is required');
    }
  }

  /**
   * Encode result data for storage
   */
  encodeResultData(result) {
    try {
      const jsonString = JSON.stringify(result);
      return ethers.toUtf8Bytes(jsonString);
    } catch (error) {
      console.error('Failed to encode result data:', error);
      return '0x';
    }
  }

  /**
   * Decode result data from storage
   */
  decodeResultData(resultData) {
    try {
      if (!resultData || resultData === '0x') {
        return null;
      }
      const jsonString = ethers.toUtf8String(resultData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decode result data:', error);
      return null;
    }
  }

  /**
   * Get game type name from enum value
   */
  getGameTypeName(gameTypeEnum) {
    const names = ['ROULETTE', 'MINES', 'WHEEL', 'PLINKO'];
    return names[gameTypeEnum] || 'UNKNOWN';
  }

  /**
   * Check if address is authorized logger
   */
  async isAuthorizedLogger(address) {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      return await this.contract.isAuthorizedLogger(address);
    } catch (error) {
      console.error('❌ Failed to check authorization:', error);
      return false;
    }
  }

  /**
   * Listen for GameResultLogged events
   */
  onGameResultLogged(callback) {
    try {
      if (!this.contract) {
        throw new Error('CreditCoin Game Logger contract not initialized');
      }

      const filter = this.contract.filters.GameResultLogged();

      const listener = (logId, player, gameType, betAmount, payout, entropyRequestId, entropyTxHash, timestamp, event) => {
        callback({
          logId,
          player,
          gameType: this.getGameTypeName(gameType),
          betAmount: ethers.formatEther(betAmount),
          payout: ethers.formatEther(payout),
          entropyRequestId,
          entropyTxHash,
          timestamp: Number(timestamp),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      };

      this.contract.on(filter, listener);

      return () => {
        this.contract.off(filter, listener);
      };
    } catch (error) {
      console.error('❌ Failed to set up event listener:', error);
      throw error;
    }
  }

  /**
   * Get NFT info for a game log
   * @param {string} logId - Log identifier (bytes32)
   * @returns {Promise<Object>} NFT information
   */
  async getNFTInfo(logId) {
    if (!this.contract) {
      throw new Error('CreditCoin Game Logger contract not initialized');
    }

    try {
      const gameLog = await this.contract.getGameLog(logId);
      return {
        nftTxHash: gameLog.nftTxHash,
        nftTokenId: gameLog.nftTokenId.toString(),
        nftImagePath: gameLog.nftImagePath
      };
    } catch (error) {
      console.error('❌ Error fetching NFT info:', error);
      throw error;
    }
  }

  /**
   * Update NFT information on-chain
   * @param {string} logId - Game log ID (bytes32)
   * @param {string} nftTxHash - NFT transaction hash
   * @param {number|string|BigInt} tokenId - NFT token ID
   * @param {string} imagePath - NFT image path
   * @returns {Promise<string>} Transaction hash
   */
  async updateNFTInfo(logId, nftTxHash, tokenId, imagePath) {
    if (!this.contract) {
      throw new Error('CreditCoin Game Logger contract not initialized');
    }

    if (!this.signer) {
      throw new Error('Signer required to update NFT info');
    }

    try {
      const tx = await this.contract.updateNFTInfo(
        logId,
        nftTxHash,
        BigInt(tokenId),
        imagePath
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('❌ Failed to update NFT info on-chain:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const creditcoinGameLogger = new CreditCoinGameLogger();
export default CreditCoinGameLogger;
