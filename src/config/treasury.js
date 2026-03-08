// Casino Treasury Configuration
// This file contains the treasury wallet address and related configuration
// Updated for CreditCoin Testnet

// Treasury Contract Address (deployed on CreditCoin Testnet)
export const TREASURY_CONFIG = {
  // CreditCoin Testnet Treasury Contract (for deposits/withdrawals)
  ADDRESS: process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS || '0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123',
  
  // ⚠️  DEVELOPMENT ONLY - Never use in production!
  PRIVATE_KEY: process.env.CREDITCOIN_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY || '',
  
  // Network configuration for CreditCoin Testnet (for deposit/withdraw)
  NETWORK: {
    CHAIN_ID: '0x18E8F', // CreditCoin Testnet (102031 in decimal)
    CHAIN_NAME: 'CreditCoin Testnet',
    RPC_URL: process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC || 'https://rpc.cc3-testnet.creditcoin.network',
    EXPLORER_URL: process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_EXPLORER || 'https://creditcoin-testnet.blockscout.com'
  },
  
  // Gas settings for transactions
  GAS: {
    DEPOSIT_LIMIT: process.env.GAS_LIMIT_DEPOSIT ? '0x' + parseInt(process.env.GAS_LIMIT_DEPOSIT).toString(16) : '0x1E8480', // 2000000 gas for contract deposit() call
    WITHDRAW_LIMIT: process.env.GAS_LIMIT_WITHDRAW ? '0x' + parseInt(process.env.GAS_LIMIT_WITHDRAW).toString(16) : '0x1E8480', // 2000000 gas for contract withdraw() call
  },
  
  // Minimum and maximum deposit amounts (in CTC)
  LIMITS: {
    MIN_DEPOSIT: parseFloat(process.env.MIN_DEPOSIT) || 0.001, // 0.001 CTC minimum
    MAX_DEPOSIT: parseFloat(process.env.MAX_DEPOSIT) || 10000, // 10000 CTC maximum (increased limit)
  }
};

// Helper function to validate treasury address
export const isValidTreasuryAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Helper function to get treasury info
export const getTreasuryInfo = () => {
  return {
    address: TREASURY_CONFIG.ADDRESS,
    network: TREASURY_CONFIG.NETWORK.CHAIN_NAME,
    chainId: TREASURY_CONFIG.NETWORK.CHAIN_ID
  };
};

