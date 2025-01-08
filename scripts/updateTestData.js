import fs from 'node:fs';
import path from 'node:path';

const updateChainsList = () => {
  const chainsJsonPath = path.resolve(__dirname, '../src/renderer/shared/config/chains/chains.json');
  const chainsListPath = path.resolve(__dirname, '../tests/system/data/chains/chainsList.ts');

  const chainsJson = JSON.parse(fs.readFileSync(chainsJsonPath, 'utf-8'));
  const substrateChains = chainsJson
    .filter((chain) => !chain.options.includes('ethereum_based'))
    .map((chain) => ({ name: chain.name }));
  const ethChains = chainsJson
    .filter((chain) => chain.options.includes('ethereum_based'))
    .map((chain) => ({ name: chain.name }));

  const formatChains = (chains) => chains.map((chain) => `  { name: '${chain.name}' }`).join(',\n');

  const chainsListContent = `export const substrateChains = [
${formatChains(substrateChains)},
];

export const ethChains = [
${formatChains(ethChains)},
];
`;

  fs.writeFileSync(chainsListPath, chainsListContent, 'utf-8');
  console.log('chainsList.ts has been updated.');
};

module.exports = updateChainsList;
