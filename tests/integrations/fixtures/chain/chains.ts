import { type AssetId, type Chain, AssetType, ChainOptions, StakingType } from '@/shared/core';
import { polkadotChain as basePolkadotChain } from '@/shared/mocks';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const toAssetId = (n: number) => n as AssetId;

/**
 * Chain IDs for test fixtures
 */
export const polkadotChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const kusamaChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
export const assetHubChainId = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';
export const bifrostChainId = '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b';

/**
 * Polkadot relay chain
 */
export const polkadotChain: Chain = {
  ...basePolkadotChain,
  chainId: polkadotChainId,
};

/**
 * Kusama relay chain
 */
export const kusamaChain: Chain = {
  name: 'Kusama',
  specName: 'kusama',
  chainId: kusamaChainId,
  parentId: undefined,
  assets: [
    {
      assetId: toAssetId(0),
      symbol: 'KSM',
      name: 'Kusama',
      precision: 12,
      type: AssetType.NATIVE,
      priceId: 'kusama',
      staking: StakingType.RELAYCHAIN,
      icon: {
        monochrome: 'https://example.com/ksm-mono.svg',
        colored: 'https://example.com/ksm-color.svg',
      },
    },
  ],
  nodes: [],
  addressPrefix: 2,
  externalApi: undefined,
  explorers: [],
  icon: 'https://example.com/kusama.svg',
  options: [ChainOptions.MULTISIG],
};

/**
 * Asset Hub parachain (Polkadot)
 */
export const assetHubChain: Chain = {
  name: 'Asset Hub',
  specName: 'statemint',
  chainId: assetHubChainId,
  parentId: polkadotChainId,
  assets: [
    {
      assetId: toAssetId(0),
      symbol: 'DOT',
      name: 'Polkadot',
      precision: 10,
      type: AssetType.NATIVE,
      priceId: 'polkadot',
      staking: StakingType.RELAYCHAIN,
      icon: {
        monochrome: 'https://example.com/dot-mono.svg',
        colored: 'https://example.com/dot-color.svg',
      },
    },
    {
      assetId: toAssetId(1337),
      symbol: 'USDT',
      name: 'Tether USD',
      precision: 6,
      type: AssetType.STATEMINE,
      priceId: 'tether',
      staking: undefined,
      icon: {
        monochrome: 'https://example.com/usdt-mono.svg',
        colored: 'https://example.com/usdt-color.svg',
      },
      typeExtras: {
        assetId: '1337',
      },
    },
  ],
  nodes: [],
  addressPrefix: 0,
  externalApi: undefined,
  explorers: [],
  icon: 'https://example.com/assethub.svg',
  options: [ChainOptions.MULTISIG],
};

/**
 * Bifrost parachain (Polkadot)
 */
export const bifrostChain: Chain = {
  name: 'Bifrost Polkadot',
  specName: 'bifrost',
  chainId: bifrostChainId,
  parentId: polkadotChainId,
  assets: [
    {
      assetId: toAssetId(0),
      symbol: 'BNC',
      name: 'Bifrost',
      precision: 12,
      type: AssetType.NATIVE,
      priceId: 'bifrost-native-coin',
      staking: undefined,
      icon: {
        monochrome: 'https://example.com/bnc-mono.svg',
        colored: 'https://example.com/bnc-color.svg',
      },
    },
  ],
  nodes: [],
  addressPrefix: 6,
  externalApi: undefined,
  explorers: [],
  icon: 'https://example.com/bifrost.svg',
  options: [ChainOptions.MULTISIG],
};
