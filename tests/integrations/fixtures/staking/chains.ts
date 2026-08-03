import { type AssetId, type Chain, AssetType, ChainOptions, StakingType } from '@/shared/core';
import { AssetHubChains } from '@/domains/staking';

/**
 * Asset Hub chains as the staking dashboard sees them.
 *
 * `AssetHubChains` is the only source of staking chain ids — the fixtures key
 * off it so a chain id change in the domain surfaces here rather than silently
 * dropping a chain out of every test.
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const toAssetId = (value: number) => value as AssetId;

export const polkadotAssetHubChainId = AssetHubChains.POLKADOT_AH;
export const kusamaAssetHubChainId = AssetHubChains.KUSAMA_AH;
export const westendAssetHubChainId = AssetHubChains.WESTEND_AH;

type AssetHubParams = {
  chainId: Chain['chainId'];
  name: string;
  specName: string;
  symbol: string;
  precision: number;
  addressPrefix: number;
};

function createAssetHubChain({ chainId, name, specName, symbol, precision, addressPrefix }: AssetHubParams): Chain {
  return {
    chainId,
    name,
    specName,
    // Staking lives on Asset Hub itself; the relay is only the era timeline, and
    // no test seeds a relay api — `timelineApi` falls back to the Asset Hub api.
    parentId: undefined,
    assets: [
      {
        assetId: toAssetId(0),
        symbol,
        name,
        precision,
        type: AssetType.NATIVE,
        // No price feed — a chain landing in the config must not make the price
        // domain reach the network from a test.
        priceId: undefined,
        staking: StakingType.RELAYCHAIN,
        icon: {
          monochrome: `https://example.com/${specName}-mono.svg`,
          colored: `https://example.com/${specName}-color.svg`,
        },
      },
    ],
    nodes: [],
    addressPrefix,
    externalApi: undefined,
    explorers: [],
    icon: `https://example.com/${specName}.svg`,
    options: [ChainOptions.MULTISIG],
  };
}

export const polkadotAssetHubChain: Chain = createAssetHubChain({
  chainId: polkadotAssetHubChainId,
  name: 'Polkadot Asset Hub',
  specName: 'statemint',
  symbol: 'DOT',
  precision: 10,
  addressPrefix: 0,
});

export const kusamaAssetHubChain: Chain = createAssetHubChain({
  chainId: kusamaAssetHubChainId,
  name: 'Kusama Asset Hub',
  specName: 'statemine',
  symbol: 'KSM',
  precision: 12,
  addressPrefix: 2,
});

/**
 * Westend Asset Hub only exists in dev configs — it must appear when the config
 * carries it and stay absent otherwise, never be hardcoded either way.
 */
export const westendAssetHubChain: Chain = createAssetHubChain({
  chainId: westendAssetHubChainId,
  name: 'Westend Asset Hub',
  specName: 'westmint',
  symbol: 'WND',
  precision: 12,
  addressPrefix: 42,
});
