import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { TREASURY_CONFIG } from '@/config/treasury';
import creditcoinTestnetConfig from '@/config/creditcoinTestnetConfig';

/**
 * Withdraw API - CreditCoin Testnet
 * 
 * NETWORK ARCHITECTURE:
 * This API processes withdrawals on CreditCoin Testnet using CTC tokens.
 * Uses the Treasury wallet to send funds to users.
 * Validates: Requirements 3.2, 3.6, 3.8
 */

// CreditCoin Testnet Treasury private key from environment
const CREDITCOIN_TREASURY_PRIVATE_KEY = TREASURY_CONFIG.PRIVATE_KEY;

// Treasury Wallet Address
const TREASURY_WALLET_ADDRESS = TREASURY_CONFIG.ADDRESS;

// CreditCoin Testnet RPC URL from config
const CREDITCOIN_RPC_URL = creditcoinTestnetConfig.rpcUrls.default.http[0];

// Create provider and wallet
const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC_URL);
const treasuryWallet = CREDITCOIN_TREASURY_PRIVATE_KEY ? new ethers.Wallet(CREDITCOIN_TREASURY_PRIVATE_KEY, provider) : null;

export async function POST(request) {
  try {
    const { userAddress, amount } = await request.json();

    console.log('📥 Received withdrawal request:', { userAddress, amount, type: typeof userAddress });

    // Validate input
    if (!userAddress || !amount || amount <= 0) {
      return new Response(JSON.stringify({
        error: 'Invalid parameters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!CREDITCOIN_TREASURY_PRIVATE_KEY || !treasuryWallet) {
      return NextResponse.json(
        { error: 'Treasury not configured' },
        { status: 500 }
      );
    }

    console.log(`🏦 Processing withdrawal: ${amount} CTC to ${userAddress}`);
    console.log(`📍 Treasury Wallet: ${treasuryWallet.address}`);

    // Check treasury wallet balance
    let treasuryBalance = BigInt(0);
    try {
      treasuryBalance = await provider.getBalance(treasuryWallet.address);
      console.log(`💰 Treasury Wallet balance: ${ethers.formatEther(treasuryBalance)} CTC`);
    } catch (balanceError) {
      console.log('⚠️ Could not check treasury balance, proceeding with transfer attempt...');
    }

    // Balance validation before withdrawal (Requirement 3.2, 3.6)
    const amountWei = ethers.parseEther(amount.toString());
    if (treasuryBalance < amountWei) {
      return NextResponse.json(
        { error: `Insufficient treasury funds. Available: ${ethers.formatEther(treasuryBalance)} CTC, Requested: ${amount} CTC` },
        { status: 400 }
      );
    }

    // Format and validate user address
    let formattedUserAddress;
    if (typeof userAddress === 'object' && userAddress.data) {
      const bytes = Object.values(userAddress.data);
      formattedUserAddress = '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (typeof userAddress === 'string') {
      formattedUserAddress = userAddress.startsWith('0x') ? userAddress : `0x${userAddress}`;
    } else {
      throw new Error(`Invalid userAddress format: ${typeof userAddress}`);
    }

    // Validate and checksum the address using ethers
    try {
      formattedUserAddress = ethers.getAddress(formattedUserAddress);
    } catch (addressError) {
      throw new Error(`Invalid Ethereum address: ${formattedUserAddress}. Error: ${addressError.message}`);
    }

    // CRITICAL: Ensure user address is not the treasury wallet address
    if (formattedUserAddress.toLowerCase() === treasuryWallet.address.toLowerCase()) {
      throw new Error('Cannot withdraw to treasury wallet address. Please use your connected wallet address.');
    }

    console.log('🔧 Formatted user address:', formattedUserAddress);
    console.log('🔧 Treasury wallet address:', treasuryWallet.address);
    console.log('🔧 Amount in Wei:', amountWei.toString());

    // Use direct wallet transfer for CreditCoin Testnet
    console.log('💸 Sending CTC from Treasury wallet...');
    
    const walletBalance = await provider.getBalance(treasuryWallet.address);
    console.log(`💰 Treasury Wallet balance: ${ethers.formatEther(walletBalance)} CTC`);
    
    if (walletBalance < amountWei) {
      return NextResponse.json(
        { error: `Treasury wallet has insufficient funds. Wallet balance: ${ethers.formatEther(walletBalance)} CTC, Requested: ${amount} CTC` },
        { status: 400 }
      );
    }
    
    // Calculate gas fees using CreditCoin Testnet gas prices (Requirement 3.6)
    const feeData = await provider.getFeeData();
    console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')} gwei`);
    
    console.log(`💸 Sending ${amount} CTC from ${treasuryWallet.address} to ${formattedUserAddress}...`);
    const tx = await treasuryWallet.sendTransaction({
      to: formattedUserAddress,
      value: amountWei,
      gasPrice: feeData.gasPrice, // Use CreditCoin network gas price
    });
    
    console.log(`📤 CreditCoin transaction sent: ${tx.hash}`);
    console.log(`✅ Withdraw CTC to ${formattedUserAddress}, TX: ${tx.hash}`);

    // Return CreditCoin transaction hash for withdrawal confirmation (Requirement 3.8)
    return new Response(JSON.stringify({
      success: true,
      transactionHash: tx.hash,
      amount: amount,
      userAddress: formattedUserAddress,
      toAddress: formattedUserAddress,
      treasuryAddress: treasuryWallet.address,
      status: 'pending',
      network: 'CreditCoin Testnet',
      message: 'Transaction sent successfully on CreditCoin Testnet. Check CreditCoin Explorer for confirmation.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Withdraw API error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    return new Response(JSON.stringify({
      error: `Withdrawal failed: ${errorMessage}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


// GET endpoint to check treasury balance
export async function GET() {
  try {
    if (!CREDITCOIN_TREASURY_PRIVATE_KEY || !treasuryWallet) {
      return NextResponse.json(
        { error: 'Treasury not configured' },
        { status: 500 }
      );
    }

    try {
      const walletBalance = await provider.getBalance(treasuryWallet.address);

      return NextResponse.json({
        treasuryWalletAddress: treasuryWallet.address,
        walletBalance: ethers.formatEther(walletBalance),
        walletBalanceWei: walletBalance.toString(),
        status: 'active',
        network: 'CreditCoin Testnet'
      });
    } catch (balanceError) {
      return NextResponse.json({
        treasuryWalletAddress: treasuryWallet.address,
        walletBalance: '0',
        walletBalanceWei: '0',
        status: 'error',
        error: balanceError.message,
        network: 'CreditCoin Testnet'
      });
    }
  } catch (error) {
    console.error('Treasury balance check error:', error);
    return NextResponse.json(
      { error: 'Failed to check treasury balance: ' + error.message },
      { status: 500 }
    );
  }
}
