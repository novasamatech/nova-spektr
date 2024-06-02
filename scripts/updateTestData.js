const fs = require('fs');
const path = require('path');

const updateChainsList = () => {
  const chainsJsonPath = path.resolve(__dirname, '../src/renderer/shared/config/chains/chains.json');
  const chainsListPath = path.resolve(__dirname, '../tests/system/data/chains/chainsList.ts');

  const chainsJson = JSON.parse(fs.readFileSync(chainsJsonPath, 'utf-8'));
  const substrateChains = chainsJson.filter(chain => !chain.options.includes('ethereum_based')).map(chain => ({ name: chain.name }));
  const ethChains = chainsJson.filter(chain => chain.options.includes('ethereum_based')).map(chain => ({ name: chain.name }));

  const chainsListContent = `export const substrateChains = ${JSON.stringify(substrateChains, null, 2)
    .replace(/"name":/g, 'name:')
    .replace(/"/g, "'")
    .replace(/,\n\s+}/g, '\n  }')};

export const ethChains = ${JSON.stringify(ethChains, null, 2)
    .replace(/"name":/g, 'name:')
    .replace(/"/g, "'")
    .replace(/,\n\s+}/g, '\n  }')};`;

  fs.writeFileSync(chainsListPath, chainsListContent, 'utf-8');
  console.log('chainsList.ts has been updated.');
};

module.exports = updateChainsList;
