/**
 * CreditCoin Testnet Configuration
 * Network documentation: https://docs.creditcoin.org/smart-contract-guides/creditcoin-endpoints
 */

// CreditCoin Testnet Configuration
export const creditcoinTestnetConfig = {
  id: 102031,
  name: 'CreditCoin Testnet',
  network: 'creditcoin-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'CTC',
    symbol: 'CTC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.cc3-testnet.creditcoin.network'],
    },
    public: {
      http: ['https://rpc.cc3-testnet.creditcoin.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'CreditCoin Testnet Explorer',
      url: 'https://creditcoin-testnet.blockscout.com',
    },
  },
  testnet: true,
};

export const creditcoinTestnetTokens = {
  CTC: {
    address: 'native',
    decimals: 18,
    symbol: 'CTC',
    name: 'CreditCoin Token',
    isNative: true,
  },
};

// Helper function to get explorer URL for a transaction
export const getCreditcoinExplorerTxUrl = (txHash) => {
  return `${creditcoinTestnetConfig.blockExplorers.default.url}/tx/${txHash}`;
};

// Helper function to get explorer URL for an address
export const getCreditcoinExplorerAddressUrl = (address) => {
  return `${creditcoinTestnetConfig.blockExplorers.default.url}/address/${address}`;
};

export default creditcoinTestnetConfig;
