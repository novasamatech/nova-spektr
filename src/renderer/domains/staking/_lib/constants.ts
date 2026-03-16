import { type ChainId } from '@/shared/core';

const PARACHAINS_ENABLED = false;

export const MINIMUM_INFLATION = 0.025;
export const INFLATION_IDEAL = PARACHAINS_ENABLED ? 0.2 : 0.1;
export const STAKED_PORTION_IDEAL = PARACHAINS_ENABLED ? 0.5 : 0.75;
export const INTEREST_IDEAL = INFLATION_IDEAL / STAKED_PORTION_IDEAL;

export const DECAY_RATE = 0.05;

export const KUSAMA_MAX_NOMINATORS = 24;
export const DEFAULT_MAX_NOMINATORS = 16;

type AssetHubChainKey = 'POLKADOT_AH' | 'KUSAMA_AH';

export const AssetHubChains: Record<AssetHubChainKey, ChainId> = {
  POLKADOT_AH: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  KUSAMA_AH: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  // WESTEND_AH: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
};

export const DEFAULT_STAKING_CHAIN = AssetHubChains['POLKADOT_AH'];
export const STAKING_NETWORK = 'staking_network';
