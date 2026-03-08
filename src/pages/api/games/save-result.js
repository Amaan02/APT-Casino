import { gameHistory } from '../../../services/GameHistoryService.js';

/**
 * Save Game Result API
 * POST /api/games/save-result - Save game result with VRF details
 *
 * NETWORK ARCHITECTURE:
 * - Game results are logged to CreditCoin Testnet (on-chain verification)
 * - Entropy/VRF is used for provably fair randomness
 * - This API accepts creditcoinTxHash and creditcoinBlockNumber from the frontend after logging to CreditCoin
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    if (!gameHistory.isInitialized) {
      await gameHistory.initialize();
    }

    const {
      vrfRequestId,
      userAddress,
      gameType,
      gameConfig,
      resultData,
      betAmount,
      payoutAmount,
      creditcoinTxHash,
      creditcoinBlockNumber,
      // Backward compat: accept legacy names
      somniaTxHash,
      somniaBlockNumber
    } = req.body;

    const ccTxHash = creditcoinTxHash ?? somniaTxHash;
    const ccBlockNumber = creditcoinBlockNumber ?? somniaBlockNumber;

    // Validate required fields
    if (!userAddress || !gameType || !gameConfig || !resultData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, gameType, gameConfig, resultData'
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Validate game type
    if (!['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'].includes(gameType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game type. Must be one of: MINES, PLINKO, ROULETTE, WHEEL'
      });
    }

    const savedGame = await gameHistory.saveGameResult({
      vrfRequestId,
      userAddress,
      gameType: gameType.toUpperCase(),
      gameConfig,
      resultData,
      betAmount: betAmount ? BigInt(betAmount) : null,
      payoutAmount: payoutAmount ? BigInt(payoutAmount) : null,
      creditcoinTxHash: ccTxHash,
      creditcoinBlockNumber: ccBlockNumber,
      network: 'creditcoin-testnet'
    });

    // Get VRF details if available
    let vrfDetails = null;
    if (vrfRequestId) {
      try {
        vrfDetails = await gameHistory.getVRFDetails(vrfRequestId);
      } catch (error) {
        console.warn('⚠️ Could not fetch VRF details:', error.message);
      }
    }

    // Response
    res.status(201).json({
      success: true,
      data: {
        gameResult: savedGame,
        vrfDetails,
        message: 'Game result saved successfully'
      }
    });

  } catch (error) {
    console.error('❌ Save game result API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to save game result',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Example request body:
 * {
 *   "vrfRequestId": "uuid-here",
 *   "userAddress": "0x1234567890123456789012345678901234567890",
 *   "gameType": "ROULETTE",
 *   "gameConfig": {
 *     "betType": "straight",
 *     "betValue": 7,
 *     "wheelType": "european"
 *   },
 *   "resultData": {
 *     "number": 7,
 *     "color": "red",
 *     "properties": {
 *       "isEven": false,
 *       "isOdd": true,
 *       "isLow": true,
 *       "dozen": 1,
 *       "column": 1
 *     }
 *   },
 *   "betAmount": "1000000000000000000",
 *   "payoutAmount": "36000000000000000000",
 *   "creditcoinTxHash": "0xabc123...",
 *   "creditcoinBlockNumber": 12345678
 * }
 *
 * NETWORK NOTES:
 * - creditcoinTxHash: Transaction hash from CreditCoin Testnet (game logging)
 * - vrfRequestId: Links to entropy (Pyth) transaction for verification
 */
