import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { CreditCoinGameLogger } from '../services/CreditCoinGameLogger';
import { getCreditcoinExplorerTxUrl } from '../config/creditcoinTestnetConfig';
import APTCasinoNFT_ABI from '@/abi/APTCasinoNFT.json';

/**
 * React hook for Creditcoin Game Logger
 * Provides easy access to game logging functionality on Creditcoin Testnet
 */
export function useCreditcoinGameLogger() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isLogging, setIsLogging] = useState(false);
  const [lastLogTxHash, setLastLogTxHash] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Convert wagmi clients to ethers provider and signer
   */
  const getEthersProviderAndSigner = useCallback(async () => {
    if (!publicClient) {
      return { provider: null, signer: null };
    }

    // Create ethers provider from public client
    const provider = new ethers.BrowserProvider(window.ethereum);

    // Create signer if wallet is connected
    let signer = null;
    if (walletClient && isConnected) {
      signer = await provider.getSigner();
    }

    return { provider, signer };
  }, [publicClient, walletClient, isConnected]);

  /**
   * Log a game result to Creditcoin Testnet via API
   * Uses treasury wallet (authorized logger) to write to contract
   */
  const logGame = useCallback(async ({
    gameType,
    betAmount,
    result,
    payout,
    entropyProof
  }) => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLogging(true);
    setError(null);

    try {
      // Use API route to log game (treasury is authorized)
      const response = await fetch('/api/log-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          playerAddress: address,
          betAmount,
          result,
          payout,
          entropyProof
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log game');
      }

      console.log('✅ Game logged via API:', data.transactionHash);
      setLastLogTxHash(data.transactionHash);
      return data.transactionHash;

    } catch (err) {
      console.error('Failed to log game to Creditcoin:', err);
      setError(err.message);
      // Don't throw - game logging failure shouldn't break the game
      return null;
    } finally {
      setIsLogging(false);
    }
  }, [address, isConnected]);

  /**
   * Get player's game history from Creditcoin with NFT data
   * Validates: Requirements 2.5, 3.1, 3.3, 3.4, 3.5
   */
  const getHistory = useCallback(async (limit = 50) => {
    if (!address) {
      return [];
    }

    try {
      // Fetch game history from blockchain
      const { provider } = await getEthersProviderAndSigner();
      const logger = new CreditCoinGameLogger(provider, null);
      const games = await logger.getGameHistory(address, limit);

      // Try to fetch supplemental NFT status from API (for minting/error states)
      try {
        const response = await fetch(`/api/game-history?player=${address}&limit=${limit}`);
        if (response.ok) {
          const { nftData } = await response.json();

          // Merge NFT data into game objects, prioritizing blockchain data for hashes
          return games.map(game => ({
            ...game,
            // Use blockchain data if available, otherwise fallback to API
            nftTxHash: game.nftTxHash || nftData[game.logId]?.nftTxHash || null,
            nftTokenId: game.nftTokenId || nftData[game.logId]?.nftTokenId || null,
            nftImagePath: game.nftImagePath || nftData[game.logId]?.nftImagePath || null,
            nftMinting: nftData[game.logId]?.nftMinting || false,
            nftError: nftData[game.logId]?.nftError || null
          }));
        }
      } catch (nftErr) {
        console.warn('Failed to fetch supplemental NFT data:', nftErr);
      }

      // Return games with blockchain data
      return games;
    } catch (err) {
      console.error('Failed to get history from Creditcoin:', err);
      return [];
    }
  }, [address, getEthersProviderAndSigner]);

  /**
   * Get logs by game type with NFT data
   * Validates: Requirements 2.5, 3.1, 3.3, 3.4, 3.5
   */
  const getLogsByGameType = useCallback(async (gameType, limit = 50) => {
    if (!address) {
      return [];
    }

    try {
      // Fetch game history from blockchain filtered by game type
      const { provider } = await getEthersProviderAndSigner();
      const logger = new CreditCoinGameLogger(provider, null);
      const games = await logger.getLogsByGameType(gameType, limit);

      // Try to fetch supplemental NFT status from API (for minting/error states)
      try {
        const response = await fetch(`/api/game-history?player=${address}&limit=${limit}`);
        if (response.ok) {
          const { nftData } = await response.json();

          // Merge NFT data into game objects, prioritizing blockchain data for hashes
          return games.map(game => ({
            ...game,
            // Use blockchain data if available, otherwise fallback to API
            nftTxHash: game.nftTxHash || nftData[game.logId]?.nftTxHash || null,
            nftTokenId: game.nftTokenId || nftData[game.logId]?.nftTokenId || null,
            nftImagePath: game.nftImagePath || nftData[game.logId]?.nftImagePath || null,
            nftMinting: nftData[game.logId]?.nftMinting || false,
            nftError: nftData[game.logId]?.nftError || null
          }));
        }
      } catch (nftErr) {
        console.warn('Failed to fetch supplemental NFT data:', nftErr);
      }

      // Return games with blockchain data
      return games;
    } catch (err) {
      console.error('Failed to get logs by game type:', err);
      return [];
    }
  }, [address, getEthersProviderAndSigner]);

  /**
   * Get player's total game count
   */
  const getGameCount = useCallback(async () => {
    if (!address) {
      return 0;
    }

    try {
      const { provider } = await getEthersProviderAndSigner();
      const logger = new CreditCoinGameLogger(provider, null);
      return await logger.getPlayerGameCount(address);
    } catch (err) {
      console.error('Failed to get game count:', err);
      return 0;
    }
  }, [address, getEthersProviderAndSigner]);

  /**
   * Get contract statistics
   */
  const getStats = useCallback(async () => {
    try {
      const { provider } = await getEthersProviderAndSigner();
      const logger = new CreditCoinGameLogger(provider, null);
      return await logger.getStats();
    } catch (err) {
      console.error('Failed to get stats:', err);
      return null;
    }
  }, [getEthersProviderAndSigner]);

  /**
   * Subscribe to game result events
   */
  const subscribeToEvents = useCallback((callback) => {
    const setupSubscription = async () => {
      try {
        const { provider } = await getEthersProviderAndSigner();
        const logger = new CreditCoinGameLogger(provider, null);
        return logger.onGameResultLogged(callback);
      } catch (err) {
        console.error('Failed to subscribe to events:', err);
        return () => { };
      }
    };

    let unsubscribe = () => { };
    setupSubscription().then(unsub => {
      unsubscribe = unsub;
    });

    return () => unsubscribe();
  }, [getEthersProviderAndSigner]);

  /**
   * Get transaction explorer URL
   */
  const getExplorerUrl = useCallback((txHash) => {
    return getCreditcoinExplorerTxUrl(txHash);
  }, []);

  /**
   * Get all NFTs owned by the connected address
   */
  const getNFTsByOwner = useCallback(async () => {
    if (!address) return [];

    try {
      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
      if (!nftContractAddress) {
        console.warn('NFT contract address not configured');
        return [];
      }

      const { provider } = await getEthersProviderAndSigner();
      if (!provider) {
        console.warn('Provider not available');
        return [];
      }

      const nftContract = new ethers.Contract(
        nftContractAddress,
        APTCasinoNFT_ABI.abi,
        provider
      );

      const tokenIds = await nftContract.getTokensByOwner(address);
      const nfts = [];

      for (const tokenId of tokenIds) {
        const metadata = await nftContract.getTokenMetadata(tokenId);
        nfts.push({
          tokenId: tokenId.toString(),
          gameType: metadata.gameType,
          betAmount: metadata.betAmount.toString(),
          result: metadata.result,
          payout: metadata.payout.toString(),
          timestamp: Number(metadata.timestamp),
          logId: metadata.logId
        });
      }

      return nfts;
    } catch (err) {
      console.error('Failed to get NFTs:', err);
      return [];
    }
  }, [address, getEthersProviderAndSigner]);

  /**
   * Get NFT balance of the connected address
   */
  const getNFTCount = useCallback(async () => {
    if (!address) return 0;

    try {
      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
      if (!nftContractAddress) {
        console.warn('NFT contract address not configured');
        return 0;
      }

      const { provider } = await getEthersProviderAndSigner();
      if (!provider) {
        console.warn('Provider not available');
        return 0;
      }

      const nftContract = new ethers.Contract(
        nftContractAddress,
        APTCasinoNFT_ABI.abi,
        provider
      );

      const balance = await nftContract.balanceOf(address);
      return Number(balance);
    } catch (err) {
      console.error('Failed to get NFT count:', err);
      return 0;
    }
  }, [address, getEthersProviderAndSigner]);

  return {
    // State
    isLogging,
    lastLogTxHash,
    error,
    isConnected,
    address,
    isInitialized: isConnected && !!publicClient,

    // Functions
    logGame,
    getHistory,
    getLogsByGameType,
    getGameCount,
    getStats,
    subscribeToEvents,
    getExplorerUrl,
    getNFTsByOwner,
    getNFTCount
  };
}

export const useCreditCoinGameLogger = useCreditcoinGameLogger;
export default useCreditcoinGameLogger;
