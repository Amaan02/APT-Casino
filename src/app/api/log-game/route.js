import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { TREASURY_CONFIG } from '@/config/treasury';
import creditcoinTestnetConfig from '@/config/creditcoinTestnetConfig';
import { getMintingService } from '@/services/nftMintingServiceInstance';

/**
 * Game Logging API - CreditCoin Testnet
 * 
 * CROSS-CHAIN ARCHITECTURE:
 * ========================
 * This API coordinates between two networks:
 * 1. Arbitrum Sepolia: Pyth Entropy for randomness (entropy transaction hash captured)
 * 2. CreditCoin Testnet: Game result logging (game log transaction hash returned)
 * 
 * The API receives entropy proof from Arbitrum Sepolia (including transaction hash)
 * and logs the game result to CreditCoin Testnet, returning both transaction hashes
 * to the frontend for complete transparency.
 * 
 * NFT MINTING INTEGRATION:
 * =======================
 * After successful game logging, the NFT minting service is initialized (if not already)
 * to start listening for GameResultLogged events. The minting happens asynchronously
 * and independently from game logging to ensure game functionality is never disrupted.
 * 
 * Validates: Requirements 2.1, 2.4, 2.5, 4.4, 4.5, 5.5, 5.7, 5.8, 6.3, 6.4
 */

const CREDITCOIN_TREASURY_PRIVATE_KEY = TREASURY_CONFIG.PRIVATE_KEY;
const GAME_LOGGER_ADDRESS = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS;
const CREDITCOIN_RPC_URL = creditcoinTestnetConfig.rpcUrls.default.http[0];

// Game Logger Contract ABI
const GAME_LOGGER_ABI = [
  'function logGameResult(uint8 gameType, uint256 betAmount, bytes memory resultData, uint256 payout, bytes32 entropyRequestId, string memory entropyTxHash) external returns (bytes32 logId)',
  'function isAuthorizedLogger(address logger) external view returns (bool)',
  'event GameResultLogged(bytes32 indexed logId, address indexed player, uint8 gameType, uint256 betAmount, uint256 payout, bytes32 entropyRequestId, string entropyTxHash, uint256 timestamp)'
];

// Game type enum
const GAME_TYPES = {
  ROULETTE: 0,
  MINES: 1,
  WHEEL: 2,
  PLINKO: 3
};

// Create provider and wallet for CreditCoin Testnet
const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC_URL);
const treasuryWallet = CREDITCOIN_TREASURY_PRIVATE_KEY 
  ? new ethers.Wallet(CREDITCOIN_TREASURY_PRIVATE_KEY, provider) 
  : null;

export async function POST(request) {
  try {
    const { gameType, playerAddress, betAmount, result, payout, entropyProof } = await request.json();

    console.log('📝 Game log request:', { gameType, playerAddress, betAmount, payout });
    console.log('🔗 Entropy proof from Arbitrum Sepolia:', {
      requestId: entropyProof?.requestId,
      transactionHash: entropyProof?.transactionHash,
      network: entropyProof?.network
    });

    // Validate input
    if (!gameType || !playerAddress || betAmount === undefined || payout === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!treasuryWallet) {
      return NextResponse.json({ error: 'Treasury not configured' }, { status: 500 });
    }

    if (!GAME_LOGGER_ADDRESS || GAME_LOGGER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'CreditCoin Game Logger contract not configured' }, { status: 500 });
    }

    // Convert game type
    const gameTypeEnum = GAME_TYPES[gameType.toUpperCase()];
    if (gameTypeEnum === undefined) {
      return NextResponse.json({ error: `Invalid game type: ${gameType}` }, { status: 400 });
    }

    // Create contract instance for CreditCoin Testnet
    const gameLogger = new ethers.Contract(GAME_LOGGER_ADDRESS, GAME_LOGGER_ABI, treasuryWallet);

    // Check if treasury is authorized
    const isAuthorized = await gameLogger.isAuthorizedLogger(treasuryWallet.address);
    if (!isAuthorized) {
      console.error('❌ Treasury wallet is not authorized to log games on CreditCoin');
      return NextResponse.json({ error: 'Treasury not authorized' }, { status: 403 });
    }

    // Prepare data for CreditCoin logging
    const betAmountWei = ethers.parseEther(betAmount.toString());
    const payoutWei = ethers.parseEther(payout.toString());
    const resultData = ethers.toUtf8Bytes(JSON.stringify(result || {}));
    
    // Extract Arbitrum Sepolia entropy data (Requirement 4.4, 4.5)
    const entropyRequestId = entropyProof?.requestId || entropyProof?.sequenceNumber || ethers.ZeroHash;
    const entropyTxHash = entropyProof?.transactionHash || '';

    console.log('📤 Logging game to CreditCoin with Arbitrum Sepolia entropy reference...');
    console.log('  - Entropy Request ID:', entropyRequestId);
    console.log('  - Arbitrum Sepolia TX:', entropyTxHash);

    // Estimate gas first
    let gasEstimate;
    try {
      gasEstimate = await gameLogger.logGameResult.estimateGas(
        gameTypeEnum, betAmountWei, resultData, payoutWei, entropyRequestId, entropyTxHash
      );
    } catch (estimateError) {
      console.error('❌ Gas estimation failed:', estimateError.message);
      return NextResponse.json({ error: 'Contract call would fail: ' + estimateError.message }, { status: 400 });
    }

    // Send transaction to CreditCoin Testnet (Requirement 5.5)
    const tx = await gameLogger.logGameResult(
      gameTypeEnum,
      betAmountWei,
      resultData,
      payoutWei,
      entropyRequestId,
      entropyTxHash,
      { gasLimit: gasEstimate * BigInt(120) / BigInt(100) }
    );

    console.log('⏳ CreditCoin transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('✅ Game logged on CreditCoin:', { 
      creditcoinTxHash: receipt.hash, 
      blockNumber: receipt.blockNumber,
      arbitrumSepoliaTxHash: entropyTxHash
    });

    // Initialize NFT minting service (if not already initialized)
    // This ensures the event listener is started after game logger is ready
    // Validates: Requirements 2.1, 6.1, 6.3, 6.4
    try {
      await getMintingService();
      console.log('✅ NFT minting service initialized and listening for events');
    } catch (mintingError) {
      // Log error but don't fail the game transaction (Requirement 6.3, 6.4)
      console.error('⚠️ NFT minting service initialization failed:', mintingError.message);
      console.error('   Game logging succeeded, but NFT minting may not work');
    }

    // Return both transaction hashes to frontend (Requirement 5.8)
    return NextResponse.json({
      success: true,
      // CreditCoin game log transaction hash
      transactionHash: receipt.hash,
      creditcoinTxHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      // Arbitrum Sepolia entropy transaction hash
      entropyTxHash: entropyTxHash,
      arbitrumSepoliaTxHash: entropyTxHash,
      // Game data
      gameType,
      playerAddress,
      betAmount,
      payout,
      // Network information
      gameLogNetwork: 'creditcoin-testnet',
      entropyNetwork: 'arbitrum-sepolia'
    });

  } catch (error) {
    console.error('❌ Game logging error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
