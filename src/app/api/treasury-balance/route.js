import { NextResponse } from 'next/server';
import { ethers, JsonRpcProvider, Wallet } from 'ethers';
import { creditcoinTestnetConfig } from '@/config/creditcoinTestnetConfig';

/**
 * Treasury Balance API - CreditCoin Network
 *
 * Returns treasury balance information for CreditCoin Testnet.
 */
export async function GET() {
  try {
    const CREDITCOIN_RPC_URL = creditcoinTestnetConfig.rpcUrls.default.http[0];
    const TREASURY_PRIVATE_KEY = process.env.CREDITCOIN_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY;

    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury not configured' },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(CREDITCOIN_RPC_URL);
    const treasuryWallet = new Wallet(TREASURY_PRIVATE_KEY, provider);

    const balance = await provider.getBalance(treasuryWallet.address);
    const balanceInCTC = ethers.formatEther(balance);

    return NextResponse.json({
      success: true,
      treasury: {
        address: treasuryWallet.address,
        balance: balanceInCTC,
        balanceWei: balance.toString(),
        currency: 'CTC'
      },
      network: {
        name: creditcoinTestnetConfig.name,
        chainId: creditcoinTestnetConfig.id,
        rpcUrl: CREDITCOIN_RPC_URL,
        explorer: creditcoinTestnetConfig.blockExplorers.default.url
      }
    });

  } catch (error) {
    console.error('❌ Treasury balance check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to check treasury balance',
        details: error.message
      },
      { status: 500 }
    );
  }
}
