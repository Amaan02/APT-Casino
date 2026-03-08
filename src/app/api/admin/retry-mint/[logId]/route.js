import { NextResponse } from 'next/server';
import getMintingService from '@/services/nftMintingServiceInstance';

/**
 * Admin API - Manual NFT Retry Endpoint
 * 
 * POST /api/admin/retry-mint/:logId
 * 
 * Allows administrators to manually trigger NFT minting retry for a specific game.
 * Requires admin authentication via X-Admin-Key header.
 * 
 * Validates: Requirements 7.4
 */

/**
 * Validate admin authentication
 * @param {Request} request - The incoming request
 * @returns {boolean} True if authenticated, false otherwise
 */
function validateAdminAuth(request) {
  const adminKey = request.headers.get('X-Admin-Key');
  const expectedKey = process.env.ADMIN_API_KEY;
  
  // If no admin key is configured, deny access for security
  if (!expectedKey) {
    console.warn('⚠️ ADMIN_API_KEY not configured - admin endpoints disabled');
    return false;
  }
  
  return adminKey === expectedKey;
}

/**
 * Validate logId format (should be 32-byte hex string with 0x prefix)
 * @param {string} logId - The log ID to validate
 * @returns {boolean} True if valid format
 */
function validateLogIdFormat(logId) {
  if (!logId || typeof logId !== 'string') {
    return false;
  }
  
  // Should be 0x followed by 64 hex characters (32 bytes)
  const hexPattern = /^0x[0-9a-fA-F]{64}$/;
  return hexPattern.test(logId);
}

/**
 * POST handler for manual NFT retry
 * @param {Request} request - The incoming request
 * @param {Object} context - Route context with params
 * @returns {NextResponse} JSON response with success/error
 */
export async function POST(request, { params }) {
  try {
    // Authenticate admin request
    if (!validateAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing admin credentials' },
        { status: 401 }
      );
    }

    // Extract and validate logId parameter
    const { logId } = params;
    
    if (!validateLogIdFormat(logId)) {
      return NextResponse.json(
        { 
          error: 'Invalid logId format - must be 32-byte hex string with 0x prefix (e.g., 0x1234...)',
          logId 
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Admin retry request for logId: ${logId}`);

    // Get minting service instance
    const mintingService = await getMintingService();
    
    if (!mintingService) {
      return NextResponse.json(
        { 
          error: 'NFT minting service not available - check configuration',
          details: 'Service may be disabled or not properly initialized'
        },
        { status: 503 }
      );
    }

    // Call retryMint method
    const result = await mintingService.retryMint(logId);
    
    console.log(`✅ Retry successful for logId: ${logId}`);
    
    return NextResponse.json({
      success: true,
      message: result.message || 'NFT mint retry queued successfully',
      logId,
      status: 'queued'
    });

  } catch (error) {
    console.error('❌ Admin retry endpoint error:', error);
    
    // Handle specific error cases
    if (error.message.includes('No failed mint found')) {
      return NextResponse.json(
        { 
          error: 'Game not found',
          message: error.message,
          logId: params.logId
        },
        { status: 404 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to retry NFT mint',
        message: error.message || 'Unknown error occurred',
        logId: params.logId
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check retry endpoint status
 * @param {Request} request - The incoming request
 * @param {Object} context - Route context with params
 * @returns {NextResponse} JSON response with game status
 */
export async function GET(request, { params }) {
  try {
    // Authenticate admin request
    if (!validateAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing admin credentials' },
        { status: 401 }
      );
    }

    const { logId } = params;
    
    if (!validateLogIdFormat(logId)) {
      return NextResponse.json(
        { 
          error: 'Invalid logId format - must be 32-byte hex string with 0x prefix',
          logId 
        },
        { status: 400 }
      );
    }

    // Get minting service instance
    const mintingService = await getMintingService();
    
    if (!mintingService) {
      return NextResponse.json(
        { error: 'NFT minting service not available' },
        { status: 503 }
      );
    }

    // Query failed mints table for this logId
    const query = `
      SELECT 
        log_id,
        player_address,
        game_type,
        bet_amount,
        payout,
        timestamp,
        error_message,
        retry_count,
        created_at,
        last_retry_at
      FROM failed_nft_mints
      WHERE log_id = $1
    `;
    
    const result = await mintingService.pool.query(query, [logId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Game not found in failed mints',
          logId
        },
        { status: 404 }
      );
    }

    const failedMint = result.rows[0];
    
    return NextResponse.json({
      logId: failedMint.log_id,
      playerAddress: failedMint.player_address,
      gameType: failedMint.game_type,
      betAmount: failedMint.bet_amount,
      payout: failedMint.payout,
      timestamp: failedMint.timestamp,
      errorMessage: failedMint.error_message,
      retryCount: failedMint.retry_count,
      createdAt: failedMint.created_at,
      lastRetryAt: failedMint.last_retry_at
    });

  } catch (error) {
    console.error('❌ Admin status check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check game status',
        message: error.message
      },
      { status: 500 }
    );
  }
}
