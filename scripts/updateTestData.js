import fs from 'node:fs';
import url from 'node:url';

const MAX_CHAIN_NAME_LENGTH = 100;

const isChain = (chain) =>
  chain !== null &&
  typeof chain === 'object' &&
  typeof chain.name === 'string' &&
  chain.name.length > 0 &&
  chain.name.length <= MAX_CHAIN_NAME_LENGTH &&
  Array.isArray(chain.options) &&
  chain.options.every((option) => typeof option === 'string');

const assertChainsConfig = (chainsJson) => {
  if (!Array.isArray(chainsJson)) {
    throw new Error('Unexpected chains config: expected an array of chains');
  }

  const invalidIndex = chainsJson.findIndex((chain) => !isChain(chain));
  if (invalidIndex !== -1) {
    throw new Error(`Unexpected chains config: invalid chain entry at index ${invalidIndex}`);
  }
};

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
  assertChainsConfig(chainsJson);

  const reachableChains = chainsJson.filter((chain) => !EXCLUDED_CHAIN_NAMES.has(chain.name));

  const substrateChains = reachableChains
    .filter((chain) => !chain.options.includes('ethereum_based'))
    .map((chain) => ({ name: chain.name }));
  const ethChains = reachableChains
    .filter((chain) => chain.options.includes('ethereum_based'))
    .map((chain) => ({ name: chain.name }));

  // Values are serialized as JSON literals, never interpolated as raw source text.
  const chainsListContent = `export const substrateChains = ${JSON.stringify(substrateChains)};

export const ethChains = ${JSON.stringify(ethChains)};
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
