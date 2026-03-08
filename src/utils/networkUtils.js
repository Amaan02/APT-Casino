// Network utilities for CreditCoin Testnet
import { creditcoinTestnet } from '@/config/chains';

// CreditCoin Testnet Configuration (Primary Network)
export const CREDITCOIN_TESTNET_CONFIG = {
  chainId: '0x18E8F', // 102031 in hex
  chainName: 'CreditCoin Testnet',
  nativeCurrency: {
    name: 'CreditCoin',
    symbol: 'CTC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.cc3-testnet.creditcoin.network'],
  blockExplorerUrls: ['https://creditcoin-testnet.blockscout.com'],
};

// Switch to CreditCoin Testnet
export const switchToCreditCoinTestnet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch to CreditCoin Testnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CREDITCOIN_TESTNET_CONFIG.chainId }],
    });
  } catch (switchError) {
    // If the chain is not added, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CREDITCOIN_TESTNET_CONFIG],
        });
      } catch (addError) {
        throw new Error('Failed to add CreditCoin Testnet to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to CreditCoin Testnet');
    }
  }
};

export const isCreditCoinTestnet = (chainId) => {
  return chainId === 102031 || chainId === '0x18E8F';
};

export const formatCTCBalance = (balance, decimals = 18) => {
  const numBalance = parseFloat(balance || '0');
  return `${numBalance.toFixed(decimals)} CTC`;
};

export const getCreditCoinTestnetExplorerUrl = (txHash) => {
  return `https://creditcoin-testnet.blockscout.com/tx/${txHash}`;
};

// Entropy/VRF transaction explorer (Pyth Entropy may use external chain)
export const getEntropyExplorerUrl = (txHash) => {
  return `https://sepolia.arbiscan.io/tx/${txHash}`;
};
