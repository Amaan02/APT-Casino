import { ethers } from 'ethers';
import { NETWORK_INFO, CREDITCOIN_NETWORKS, CREDITCOIN_CONTRACTS } from '../config/contracts';

export const getProvider = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return new ethers.JsonRpcProvider('https://rpc.cc3-testnet.creditcoin.network');
  }
  return new ethers.BrowserProvider(window.ethereum);
};

export const getTokenContract = async (withSigner = false) => {
  const provider = getProvider();
  // Creditcoin uses native CTC for most gaming, but if a token contract is needed, use CreditCoin configuration
  const contractAddress = CREDITCOIN_CONTRACTS[CREDITCOIN_NETWORKS.TESTNET].treasury;

  const contract = new ethers.Contract(
    contractAddress,
    ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function allowance(address,address) view returns (uint256)'],
    provider
  );

  if (withSigner) {
    const signer = await provider.getSigner();
    return contract.connect(signer);
  }

  return contract;
};

export const getRouletteContract = async (withSigner = false) => {
  const provider = getProvider();

  // Use Creditcoin Game Logger as the primary contract for logging results
  const contractAddress = CREDITCOIN_CONTRACTS[CREDITCOIN_NETWORKS.TESTNET].gameLogger;
  const abi = [
    'function logGameResult(uint8 gameType, uint256 betAmount, bytes resultData, uint256 payout, bytes32 entropyRequestId, string entropyTxHash) external returns (bytes32)',
    'function randomResult() view returns (uint256)'
  ];

  const contract = new ethers.Contract(
    contractAddress,
    abi,
    provider
  );

  if (withSigner) {
    const signer = await provider.getSigner();
    return contract.connect(signer);
  }

  return contract;
};

export const switchToCreditCoinTestnet = async () => {
  if (typeof window === 'undefined' || !window.ethereum) return;

  const info = NETWORK_INFO[CREDITCOIN_NETWORKS.TESTNET];
  const chainIdHex = '0x' + info.chainId.toString(16);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: info.name,
          nativeCurrency: info.nativeCurrency,
          rpcUrls: ['https://rpc.cc3-testnet.creditcoin.network'],
          blockExplorerUrls: [info.explorer]
        }],
      });
    }
  }
};

export const formatTokenAmount = (amount, decimals = 18) => {
  return ethers.formatUnits(amount, decimals);
};

export const parseTokenAmount = (amount, decimals = 18) => {
  return ethers.parseUnits(amount.toString(), decimals);
}; 
