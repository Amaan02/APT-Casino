import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import CreditCoinGameLogger from '@/services/CreditCoinGameLogger';

/**
 * Game History API
 * Returns game history with NFT data for a player from blockchain
 * 
 * Validates: Requirements 2.5, 3.1, 3.3, 3.4, 3.5
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('player');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!playerAddress) {
      return NextResponse.json(
        { error: 'Player address is required' },
        { status: 400 }
      );
    }

    // Initialize CreditCoin Game Logger
    const provider = new ethers.JsonRpcProvider(process.env.CREDITCOIN_RPC_URL);
    const gameLogger = new CreditCoinGameLogger(provider);
    gameLogger.initializeContract();

    // Get player's game history from blockchain
    const gameHistory = await gameLogger.getGameHistory(playerAddress, limit);

    // Create a map of logId to NFT data
    const nftDataMap = {};
    
    for (const game of gameHistory) {
      try {
        const nftInfo = await gameLogger.getNFTInfo(game.logId);
        
        // Only include if NFT has been minted
        if (nftInfo.nftTxHash && nftInfo.nftTxHash !== '') {
          nftDataMap[game.logId] = {
            nftTxHash: nftInfo.nftTxHash,
            nftTokenId: nftInfo.nftTokenId,
            nftImagePath: nftInfo.nftImagePath,
            nftMinting: false,
            nftError: null
          };
        }
      } catch (error) {
        console.error(`Failed to fetch NFT info for game ${game.logId}:`, error);
      }
    }

    return NextResponse.json({ nftData: nftDataMap });

  } catch (error) {
    console.error('Failed to fetch game history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game history', details: error.message },
      { status: 500 }
    );
  }
}
