// Network Configuration - CreditCoin only
export const CREDITCOIN_NETWORKS = {
  TESTNET: 'creditcoin-testnet',
};

// CreditCoin Network URLs
export const CREDITCOIN_NETWORK_URLS = {
  [CREDITCOIN_NETWORKS.TESTNET]: "https://rpc.cc3-testnet.creditcoin.network",
};

// CreditCoin Explorer URLs
export const CREDITCOIN_EXPLORER_URLS = {
  [CREDITCOIN_NETWORKS.TESTNET]: "https://creditcoin-testnet.blockscout.com",
};

// Default network - now using CreditCoin Testnet
export const DEFAULT_NETWORK = CREDITCOIN_NETWORKS.TESTNET;

// CreditCoin Contract Addresses
export const CREDITCOIN_CONTRACTS = {
  [CREDITCOIN_NETWORKS.TESTNET]: {
    treasury: process.env.NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS || "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123",
    gameLogger: process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS || "0x0F95D1c2c4E18A17A0a0A4E3c27D5e581b58ABBE"
  }
};

// Token Configuration
export const TOKEN_CONFIG = {
  CTC: {
    name: "Creditcoin Token",
    symbol: "CTC",
    decimals: 18,
    type: "native"
  }
};

// Network Information
export const NETWORK_INFO = {
  [CREDITCOIN_NETWORKS.TESTNET]: {
    name: "Creditcoin Testnet",
    chainId: 102031,
    nativeCurrency: TOKEN_CONFIG.CTC,
    explorer: CREDITCOIN_EXPLORER_URLS[CREDITCOIN_NETWORKS.TESTNET]
  }
};

// Export default configuration
export default {
  CREDITCOIN_NETWORKS,
  CREDITCOIN_NETWORK_URLS,
  CREDITCOIN_EXPLORER_URLS,
  CREDITCOIN_CONTRACTS,
  DEFAULT_NETWORK,
  TOKEN_CONFIG,
  NETWORK_INFO
}; 
