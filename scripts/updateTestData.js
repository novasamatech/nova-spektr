import fs from 'node:fs';
import url from 'node:url';

const updateChainsList = () => {
  const chainsJsonURL = new URL('../src/renderer/shared/config/chains/chains.json', import.meta.url);
  const chainsListURL = new URL('../tests/system/data/chains/chainsList.ts', import.meta.url);
  const chainsJsonPath = url.fileURLToPath(chainsJsonURL);
  const chainsListPath = url.fileURLToPath(chainsListURL);

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

export default updateChainsList;
