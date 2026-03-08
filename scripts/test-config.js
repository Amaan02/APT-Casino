/**
 * Test Config Loading - CreditCoin Testnet
 */

require('dotenv').config();

console.log('🔍 Testing Config Loading (CreditCoin)...\n');

console.log('Environment Variables:');
console.log('  NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS:', process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS);
console.log('  NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS:', process.env.NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS);
console.log('  NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC_URL:', process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC_URL || '(default)');

const gameLogger = process.env.NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS || '0x4f52F99D2581884fe4F81943fed2042b61bBd4c0';
const treasury = process.env.NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS || '0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123';

console.log('\nCreditCoin Testnet:');
console.log('  treasury:', treasury);
console.log('  gameLogger:', gameLogger);

if (!gameLogger || gameLogger === '0x0000000000000000000000000000000000000000') {
  console.error('\n❌ ERROR: GameLogger address not found in config!');
  process.exit(1);
}

console.log('\n✅ Config loaded successfully!');
