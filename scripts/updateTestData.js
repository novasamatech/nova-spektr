const fs = require('fs');
const path = require('path');

const updateChainsList = () => {
  const chainsJsonPath = path.resolve(__dirname, '../src/renderer/shared/config/chains/chains.json');
  const chainsListPath = path.resolve(__dirname, '../tests/system/data/chains/chainsList.ts');

  const chainsJson = JSON.parse(fs.readFileSync(chainsJsonPath, 'utf-8'));
  const chainNames = chainsJson.map(chain => ({ name: chain.name }));

  const chainsListContent = `export const chainsList = ${JSON.stringify(chainNames, null, 2)};`;

  fs.writeFileSync(chainsListPath, chainsListContent, 'utf-8');
  console.log('chainsList.ts has been updated.');
};

module.exports = updateChainsList;