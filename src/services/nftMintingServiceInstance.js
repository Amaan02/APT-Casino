import { ethers } from 'ethers';
import { NFTMintingService } from './NFTMintingService';
import CreditCoinGameLogger from './CreditCoinGameLogger';
import creditcoinTestnetConfig from '../config/creditcoinTestnetConfig';
import { TREASURY_CONFIG } from '../config/treasury';

// The ABI should come from the service to ensure consistency
const SHARED_ABI = [
  'event GameResultLogged(bytes32 indexed logId, address indexed player, uint8 gameType, uint256 betAmount, uint256 payout, bytes32 entropyRequestId, string entropyTxHash, uint256 timestamp)',
  'function updateNFTInfo(bytes32 logId, string memory nftTxHash, uint256 tokenId, string memory imagePath) external'
];

/**
 * NFT Minting Service Singleton Instance
 * 
 * This module provides a singleton instance of the NFT minting service
 * that can be shared across API routes and initialized once.
 * 
 * The service is initialized lazily on first access to ensure:
 * - Environment variables are loaded
 * - Provider and wallet are properly configured
 * - Event listener is started after game logger is ready
 * 
 * Validates: Requirements 2.1, 6.1, 6.3, 6.4
 */

let mintingServiceInstance = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * Get or create the NFT minting service instance
 * @returns {Promise<NFTMintingService|null>} The minting service instance or null if disabled
 */
export async function getMintingService() {
  // Return existing instance if already initialized
  if (isInitialized) {
    return mintingServiceInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = initializeMintingService();
  const service = await initializationPromise;
  isInitialized = true;

  return service;
}

/**
 * Initialize the NFT minting service
 * @returns {Promise<NFTMintingService|null>}
 */
async function initializeMintingService() {
  try {
    // Check if NFT minting is enabled
    const enableMinting = process.env.ENABLE_NFT_MINTING === 'true';
    if (!enableMinting) {
      console.log('ℹ️ NFT minting is disabled via ENABLE_NFT_MINTING flag');
      return null;
    }

    // Get NFT contract address
    const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
    if (!nftContractAddress || nftContractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ NFT contract address not configured - NFT minting disabled');
      return null;
    }

    // Get CreditCoin RPC URL
    const creditcoinRpcUrl = creditcoinTestnetConfig.rpcUrls.default.http[0];
    if (!creditcoinRpcUrl) {
      console.error('❌ CreditCoin RPC URL not configured');
      return null;
    }

    // Get treasury private key
    const treasuryPrivateKey = TREASURY_CONFIG.PRIVATE_KEY;
    if (!treasuryPrivateKey) {
      console.error('❌ Treasury private key not configured');
      return null;
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(creditcoinRpcUrl);
    const treasuryWallet = new ethers.Wallet(treasuryPrivateKey, provider);

    // Create minting service instance
    mintingServiceInstance = new NFTMintingService(
      provider,
      nftContractAddress,
      treasuryWallet
    );

    console.log('✅ NFT Minting Service singleton initialized');
    console.log('   Contract:', nftContractAddress);
    console.log('   Treasury:', treasuryWallet.address);

    // Start listening to game logger events
    await startEventListener(provider, treasuryWallet);

    return mintingServiceInstance;
  } catch (error) {
    console.error('❌ Failed to initialize NFT minting service:', error);
    return null;
  }
}

/**
 * Start the event listener for game logger events
 * Validates: Requirements 6.1
 */
async function startEventListener(provider, treasuryWallet) {
  try {
    const gameLoggerAddress = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
    if (!gameLoggerAddress || gameLoggerAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Game logger address not configured - event listener not started');
      return;
    }

    // Create game logger contract instance (connected to signer for updates)
    const gameLoggerContract = new ethers.Contract(
      gameLoggerAddress,
      SHARED_ABI,
      treasuryWallet
    );

    // Start listening for events - this will close any previous listener first
    if (mintingServiceInstance) {
      await mintingServiceInstance.startListening(gameLoggerContract);
      console.log('✅ NFT Minting Service event listener started');
    }
  } catch (error) {
    console.error('❌ Failed to start event listener:', error);
    // Don't throw - service can still work via manual retry
  }
}

/**
 * Reset the service instance (useful for testing)
 */
export function resetMintingService() {
  if (mintingServiceInstance) {
    mintingServiceInstance.close().catch(err => {
      console.error('Error closing minting service:', err);
    });
  }
  mintingServiceInstance = null;
  isInitialized = false;
  initializationPromise = null;
}

export default getMintingService;
