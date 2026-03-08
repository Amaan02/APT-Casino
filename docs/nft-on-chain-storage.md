# NFT On-Chain Storage Implementation

## Problem

NFT minting was working, but the system was trying to store NFT transaction data in a PostgreSQL database that doesn't exist, causing `ECONNREFUSED` errors. The NFT was successfully minted but the metadata couldn't be stored.

## Solution

Store NFT transaction data directly on-chain in the **CreditCoinGameLogger** contract on CreditCoin Testnet, following the same pattern as entropy and game logging.

## Changes Made

### 1. Contract Updates (`contracts/CreditCoinGameLogger.sol`)

Added NFT tracking fields to the `GameLog` struct:
```solidity
struct GameLog {
    // ... existing fields ...
    string nftTxHash;
    uint256 nftTokenId;
    string nftImagePath;
}
```

Added new event:
```solidity
event NFTMinted(
    bytes32 indexed logId,
    address indexed player,
    uint256 indexed tokenId,
    string nftTxHash,
    string imagePath
);
```

Added new function to update NFT info:
```solidity
function updateNFTInfo(
    bytes32 logId,
    string memory nftTxHash,
    uint256 tokenId,
    string memory imagePath
) external onlyAuthorized
```

### 2. Service Updates

#### `src/services/NFTMintingService.js`
- Removed PostgreSQL database dependency
- Updated `updateGameRecord()` to call contract's `updateNFTInfo()` instead of database
- Removed database-dependent methods: `logFailedMint()`, `retryMint()`, `checkMissingNFTs()`
- Simplified error handling to log to console instead of database

#### `src/services/CreditCoinGameLogger.js`
- Added `getNFTInfo(logId)` method to read NFT data from contract

#### `src/app/api/game-history/route.js`
- Removed PostgreSQL dependency
- Updated to fetch NFT data from blockchain via `CreditCoinGameLogger.getNFTInfo()`
- Returns NFT data merged with game history

### 3. Frontend Components
No changes needed - components already support displaying NFT buttons and explorer links when `nftTxHash` is present.

## Deployment Steps

1. Deploy or upgrade the CreditCoin Game Logger on CreditCoin Testnet:
   ```bash
   npx hardhat run scripts/deploy-creditcoin-contracts.js --network creditcoin-testnet
   # or for upgrades:
   node scripts/upgrade-creditcoin-logger.js
   ```

2. Update `.env` with the new contract address:
   ```
   CREDITCOIN_GAME_LOGGER_ADDRESS=<new_address>
   NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=<new_address>
   ```

3. Restart the application to use the new contract.

## Benefits

1. **No Database Required**: Eliminates dependency on PostgreSQL
2. **Consistent Architecture**: NFT data stored on-chain like all other game data
3. **Transparent**: All NFT minting data is publicly verifiable on blockchain
4. **Reliable**: No database connection failures
5. **Simpler**: Fewer moving parts, easier to maintain

## Data Flow

1. Game completes → `GameResultLogged` event emitted
2. NFTMintingService listens → mints NFT
3. NFT minted → calls `updateNFTInfo()` on CreditCoinGameLogger contract
4. Frontend fetches game history → includes NFT data from contract
5. UI displays NFT button and explorer link

## Notes

- All contracts and game logs run on **CreditCoin Testnet** (Chain ID 102031).
- Old game logs on a previous contract deployment won't have NFT data.
- Consider migrating important historical data if needed.
- NFT minting continues to work independently of game logging.
- Failed mints are logged to console for monitoring.
