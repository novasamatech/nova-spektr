import fs from 'node:fs';
import url from 'node:url';

const updateChainsList = async () => {
  const chainsListURL = new URL('../tests/system/data/chains/chainsList.ts', import.meta.url);
  const chainsListPath = url.fileURLToPath(chainsListURL);

  const CHAINS_FILE = (process.env.CHAINS_FILE || 'chains_dev') + '.json';
  const CONFIG_VERSION = 'v2';
  const CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/chains/${CONFIG_VERSION}/${CHAINS_FILE}`;

  const response = await fetch(CONFIG_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains config: ${response.status} ${response.statusText}`);
  }
  const chainsJson = await response.json();

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
