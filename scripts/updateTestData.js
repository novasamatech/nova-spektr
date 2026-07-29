import fs from 'node:fs';
import url from 'node:url';

const updateChainsList = async () => {
  const chainsListURL = new URL('../tests/system/data/chains/chainsList.ts', import.meta.url);
  const chainsListPath = url.fileURLToPath(chainsListURL);

  const CHAINS_FILE = (process.env.CHAINS_FILE || 'chains_dev') + '.json';
  const CONFIG_VERSION = 'v2';
  const CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/chains/${CONFIG_VERSION}/${CHAINS_FILE}`;

  // Chains whose public RPC nodes are dead or unreliable — fee-loading system
  // tests against them time out on every retry, failing the whole suite.
  const EXCLUDED_CHAIN_NAMES = new Set(['Phala', 'Zeitgeist']);

  const response = await fetch(CONFIG_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains config: ${response.status} ${response.statusText}`);
  }
  const chainsJson = await response.json();
  const reachableChains = chainsJson.filter((chain) => !EXCLUDED_CHAIN_NAMES.has(chain.name));

  const substrateChains = reachableChains
    .filter((chain) => !chain.options.includes('ethereum_based'))
    .map((chain) => ({ name: chain.name }));
  const ethChains = reachableChains
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

  // Emit prettier-clean output — the file is committed, and a formatting
  // mismatch would dirty the working tree on every test run.
  const prettier = await import('prettier');
  const prettierConfig = await prettier.resolveConfig(chainsListPath);
  const formatted = await prettier.format(chainsListContent, { ...prettierConfig, filepath: chainsListPath });

  fs.writeFileSync(chainsListPath, formatted, 'utf-8');
  console.log('chainsList.ts has been updated.');
};

export default updateChainsList;
