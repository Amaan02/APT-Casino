/**
 * Verification script: Game history components with CreditCoin transaction links
 *
 * Verifies that game history components:
 * 1. Display CreditCoin Testnet transaction hashes
 * 2. Open CreditCoin Testnet block explorer URLs
 * 3. Maintain Pyth Entropy links on Arbitrum Sepolia
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying game history components for CreditCoin transaction links...\n');

const historyComponents = [
  { name: 'MinesHistory', path: 'src/app/game/mines/components/MinesHistory.jsx' },
  { name: 'RouletteHistory', path: 'src/app/game/roulette/components/RouletteHistory.jsx' },
  { name: 'WheelHistory', path: 'src/app/game/wheel/components/WheelHistory.jsx' },
  { name: 'PlinkoHistory (GameHistory)', path: 'src/app/game/plinko/components/GameHistory.jsx' }
];

const requiredPatterns = {
  creditcoinExplorer: /creditcoin-testnet\.blockscout\.com|openCreditcoinExplorer|getCreditCoinTestnetExplorerUrl/,
  creditcoinTxHash: /creditcoinTxHash/,
  entropyExplorer: /entropy-explorer\.pyth\.network/,
  entropyChain: /chain=arbitrum-sepolia/
};

let allPassed = true;

historyComponents.forEach(component => {
  console.log(`\n📄 Checking ${component.name}...`);
  try {
    const filePath = path.join(process.cwd(), component.path);
    const content = fs.readFileSync(filePath, 'utf8');

    let componentPassed = true;

    if (requiredPatterns.creditcoinExplorer.test(content) || requiredPatterns.creditcoinTxHash.test(content)) {
      console.log('  ✅ CreditCoin Testnet explorer / creditcoinTxHash found');
    } else {
      console.log('  ❌ CreditCoin explorer or creditcoinTxHash NOT found');
      componentPassed = false;
    }

    if (requiredPatterns.creditcoinTxHash.test(content)) {
      console.log('  ✅ creditcoinTxHash property referenced');
    } else {
      console.log('  ⚠️  creditcoinTxHash not found (may use alternative)');
    }

    if (requiredPatterns.entropyExplorer.test(content)) {
      console.log('  ✅ Entropy explorer URL found');
    } else {
      console.log('  ⚠️  Entropy explorer URL not found');
    }

    if (requiredPatterns.entropyChain.test(content)) {
      console.log('  ✅ Entropy explorer uses Arbitrum Sepolia chain');
    } else {
      console.log('  ⚠️  Entropy chain parameter not found');
    }

    if (componentPassed) {
      console.log(`  ✅ ${component.name} PASSED`);
    } else {
      allPassed = false;
      console.log(`  ❌ ${component.name} FAILED`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All history components verified for CreditCoin links');
  process.exit(0);
} else {
  console.log('❌ Some components need updates');
  process.exit(1);
}
