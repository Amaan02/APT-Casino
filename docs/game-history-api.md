# Game History API Documentation

## Overview

The Game History API provides access to player game history with integrated NFT data. It combines blockchain game log data from the **CreditCoinGameLogger** contract on CreditCoin Testnet with NFT minting information (from the contract or API).

**Validates: Requirements 2.5, 3.1, 3.3, 3.4, 3.5**

## Endpoint

### GET `/api/game-history`

Retrieves NFT data for a player's game history. This endpoint is designed to be called alongside blockchain game history queries to provide complete game information including NFT minting status.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `player` | string | Yes | Player's Ethereum address (case-insensitive) |
| `limit` | number | No | Maximum number of games to fetch (default: 50) |

#### Response Format

```json
{
  "nftData": {
    "0x1234...": {
      "nftTxHash": "0xabcd...",
      "nftTokenId": "42",
      "nftMinting": false,
      "nftError": null
    },
    "0x5678...": {
      "nftTxHash": null,
      "nftTokenId": null,
      "nftMinting": true,
      "nftError": null
    }
  }
}
```

#### Response Fields

The response contains an `nftData` object where keys are game log IDs and values contain NFT information:

| Field | Type | Description |
|-------|------|-------------|
| `nftTxHash` | string \| null | Transaction hash of the NFT minting transaction on CreditCoin Testnet. Null if not yet minted. |
| `nftTokenId` | string \| null | Token ID of the minted NFT. Null if not yet minted. Returned as string to handle large numbers. |
| `nftMinting` | boolean | True if NFT minting is currently in progress (status: 'pending' or 'processing'). False otherwise. |
| `nftError` | string \| null | Error message if NFT minting failed. Null if no error or not yet attempted. |

#### Status Combinations

| nftTxHash | nftTokenId | nftMinting | nftError | Meaning |
|-----------|------------|------------|----------|---------|
| null | null | false | null | NFT not yet queued for minting |
| null | null | true | null | NFT minting in progress |
| "0x..." | "123" | false | null | NFT successfully minted |
| null | null | false | "error msg" | NFT minting failed after retries |

## Integration with Game History

The frontend should:

1. Fetch game history from the blockchain (via `CreditCoinGameLogger.getGameHistory()`)
2. Fetch NFT data from this API endpoint
3. Merge NFT data into game objects using `logId` as the key

### Example Integration (React Hook)

```javascript
const getHistory = useCallback(async (limit = 50) => {
  if (!address) return [];

  try {
    // Fetch game history from blockchain
    const provider = await getEthersProvider();
    const logger = new CreditCoinGameLogger(provider, null);
    const games = await logger.getGameHistory(address, limit);

    // Fetch NFT data from API
    const response = await fetch(`/api/game-history?player=${address}&limit=${limit}`);
    if (response.ok) {
      const { nftData } = await response.json();
      
      // Merge NFT data into game objects
      return games.map(game => ({
        ...game,
        nftTxHash: nftData[game.logId]?.nftTxHash || null,
        nftTokenId: nftData[game.logId]?.nftTokenId || null,
        nftMinting: nftData[game.logId]?.nftMinting || false,
        nftError: nftData[game.logId]?.nftError || null
      }));
    }

    // Return games without NFT data if API call fails
    return games;
  } catch (err) {
    console.error('Failed to get history:', err);
    return [];
  }
}, [address]);
```

## Complete Game History Response Format

After merging blockchain and NFT data, each game object has the following structure:

```typescript
interface GameHistoryResponse {
  // Blockchain data (from CreditCoinGameLogger)
  logId: string;                    // Game log ID (bytes32 as hex)
  player: string;                   // Player's Ethereum address
  gameType: string;                 // "ROULETTE" | "MINES" | "WHEEL" | "PLINKO"
  betAmount: string;                // Bet amount in CTC (formatted from wei)
  payout: string;                   // Payout amount in CTC (formatted from wei)
  timestamp: number;                // Unix timestamp
  blockNumber: number;              // Block number where game was logged
  explorerUrl: string;              // CreditCoin Testnet explorer URL for game log transaction
  entropyTxHash: string;            // Entropy (Pyth) transaction hash
  entropyRequestId: string;         // Pyth entropy request ID
  resultData: any;                  // Game-specific result data

  // NFT data (from contract or /api/game-history)
  nftTxHash?: string | null;        // NFT minting transaction hash
  nftTokenId?: string | null;       // NFT token ID
  nftMinting?: boolean;             // True if minting in progress
  nftError?: string | null;         // Error message if minting failed
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Player address is required"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to fetch game history",
  "details": "Connection timeout"
}
```

## Data Sources

Game history is read from the **CreditCoinGameLogger** contract on CreditCoin Testnet. NFT data may be returned from the contract (on-chain) or from the API when backed by a database. When using the on-chain flow, NFT info is read via `getNFTInfo(logId)` on the contract.

## Notes

- The API returns NFT data as a map (keyed by logId) for efficient lookup.
- NFT fields are optional and may be null/undefined when not applicable.
- The API gracefully handles missing NFT data (returns empty map if no games found).
- Frontend should handle cases where NFT data is unavailable (API error, contract not deployed, etc.).
- All game logs and NFT data are on CreditCoin Testnet; entropy is provided by Pyth in the backend.
