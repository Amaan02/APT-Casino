const { ethers } = require('ethers');
require('dotenv').config({ path: '.env' });

async function checkTreasuryContract() {
  console.log('🔍 Checking CreditCoin Treasury...');

  const rpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC || 'https://rpc.cc3-testnet.creditcoin.network';
  const treasuryAddress = process.env.CREDITCOIN_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS;

  if (!treasuryAddress) {
    console.error('❌ Set CREDITCOIN_TREASURY_ADDRESS or TREASURY_ADDRESS in .env');
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const code = await provider.getCode(treasuryAddress);
    console.log('📄 Treasury Address:', treasuryAddress);
    console.log('🔧 Is Contract:', code !== '0x');
    console.log('📏 Code Length:', code.length);

    if (code !== '0x') {
      console.log('🤖 Treasury is a smart contract!');
      console.log('📝 Contract Code (first 200 chars):', code.substring(0, 200) + '...');
    } else {
      console.log('👤 Treasury is an EOA (Externally Owned Account)');
    }

    const balance = await provider.getBalance(treasuryAddress);
    console.log('💰 Treasury Balance:', ethers.formatEther(balance), 'CTC');
    console.log('🔗 Explorer:', `https://creditcoin-testnet.blockscout.com/address/${treasuryAddress}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTreasuryContract();
