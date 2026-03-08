# Admin NFT Retry Endpoint

## Overview

The admin retry endpoint allows administrators to manually trigger NFT minting retry for games where the automatic minting process failed. All minting and game logging use **CreditCoin Testnet**.

## Endpoint

```
POST /api/admin/retry-mint/:logId
GET /api/admin/retry-mint/:logId
```

## Authentication

All admin endpoints require authentication via the `X-Admin-Key` header.

### Setup

1. Set the `ADMIN_API_KEY` environment variable in your `.env` file:
```bash
ADMIN_API_KEY=your_secure_admin_key_here
```

2. Include the admin key in your request headers:
```bash
X-Admin-Key: your_secure_admin_key_here
```

## POST - Retry NFT Minting

Manually trigger NFT minting retry for a specific game.

### Request

```bash
curl -X POST https://your-domain.com/api/admin/retry-mint/0x1234...5678 \
  -H "X-Admin-Key: your_admin_key_here"
```

### Parameters

- `logId` (path parameter): The game log ID (32-byte hex string with 0x prefix)

### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "NFT mint retry queued successfully",
  "logId": "0x1234...5678",
  "status": "queued"
}
```

**Unauthorized (401)**:
```json
{
  "error": "Unauthorized - Invalid or missing admin credentials"
}
```

**Invalid Format (400)**:
```json
{
  "error": "Invalid logId format - must be 32-byte hex string with 0x prefix (e.g., 0x1234...)",
  "logId": "invalid"
}
```

**Not Found (404)**:
```json
{
  "error": "Game not found",
  "message": "No failed mint found for logId: 0x1234...5678",
  "logId": "0x1234...5678"
}
```

**Service Unavailable (503)**:
```json
{
  "error": "NFT minting service not available - check configuration",
  "details": "Service may be disabled or not properly initialized"
}
```

**Server Error (500)**:
```json
{
  "error": "Failed to retry NFT mint",
  "message": "Error details...",
  "logId": "0x1234...5678"
}
```

## GET - Check Failed Mint Status

Query the status of a failed NFT mint.

### Request

```bash
curl https://your-domain.com/api/admin/retry-mint/0x1234...5678 \
  -H "X-Admin-Key: your_admin_key_here"
```

### Response

**Success (200)**:
```json
{
  "logId": "0x1234...5678",
  "playerAddress": "0xabcd...ef01",
  "gameType": "ROULETTE",
  "betAmount": "1000000000000000000",
  "payout": "2000000000000000000",
  "timestamp": 1234567890,
  "errorMessage": "Transaction reverted",
  "retryCount": 2,
  "createdAt": "2024-03-06T12:00:00.000Z",
  "lastRetryAt": "2024-03-06T12:05:00.000Z"
}
```

**Not Found (404)**:
```json
{
  "error": "Game not found in failed mints",
  "logId": "0x1234...5678"
}
```

## Usage Examples

### Using curl

```bash
# Retry a failed mint
curl -X POST http://localhost:3000/api/admin/retry-mint/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  -H "X-Admin-Key: dev_admin_key_change_in_production"

# Check failed mint status
curl http://localhost:3000/api/admin/retry-mint/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  -H "X-Admin-Key: dev_admin_key_change_in_production"
```

### Using JavaScript/fetch

```javascript
// Retry a failed mint
const response = await fetch('/api/admin/retry-mint/0x1234...5678', {
  method: 'POST',
  headers: {
    'X-Admin-Key': 'your_admin_key_here'
  }
});

const data = await response.json();
console.log(data);

// Check failed mint status
const statusResponse = await fetch('/api/admin/retry-mint/0x1234...5678', {
  method: 'GET',
  headers: {
    'X-Admin-Key': 'your_admin_key_here'
  }
});

const statusData = await statusResponse.json();
console.log(statusData);
```

## Security Considerations

1. **Keep the admin key secure**: Never commit the `ADMIN_API_KEY` to version control
2. **Use strong keys in production**: Generate a cryptographically secure random key
3. **Rotate keys regularly**: Change the admin key periodically
4. **Monitor access**: Log all admin endpoint access for audit purposes
5. **Use HTTPS**: Always use HTTPS in production to protect the admin key in transit

## Troubleshooting

### "Service not available" error

- Check that `ENABLE_NFT_MINTING=true` in your `.env` file.
- Verify `NFT_CONTRACT_ADDRESS` (CreditCoin Testnet) is set correctly.
- Ensure the treasury wallet is configured with `CREDITCOIN_TREASURY_PRIVATE_KEY` or `TREASURY_PRIVATE_KEY`.

### "Game not found" error

- Verify the logId exists in the failed mints store (or `failed_nft_mints` table if using DB).
- Check that the game actually failed minting (not still pending).
- Ensure the logId format is correct (0x + 64 hex characters).

### Authentication failures

- Verify `ADMIN_API_KEY` is set in the server's `.env` file
- Check that the `X-Admin-Key` header matches exactly
- Ensure there are no extra spaces or characters in the key
