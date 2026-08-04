import { type ChainId } from '@/shared/core';

const PARACHAINS_ENABLED = false;

export const MINIMUM_INFLATION = 0.025;
export const INFLATION_IDEAL = PARACHAINS_ENABLED ? 0.2 : 0.1;
export const STAKED_PORTION_IDEAL = PARACHAINS_ENABLED ? 0.5 : 0.75;
export const INTEREST_IDEAL = INFLATION_IDEAL / STAKED_PORTION_IDEAL;

export const DECAY_RATE = 0.05;

type AssetHubChainKey = 'POLKADOT_AH' | 'KUSAMA_AH' | 'WESTEND_AH';

export const AssetHubChains: Record<AssetHubChainKey, ChainId> = {
  POLKADOT_AH: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  KUSAMA_AH: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  WESTEND_AH: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
};

export const DEFAULT_STAKING_CHAIN = AssetHubChains['POLKADOT_AH'];
export const STAKING_NETWORK = 'staking_network';

/**
 * Era length fallback (ms) per staking chain, used when the era length cannot
 * be derived from the timeline chain — the relay api may not be connected yet,
 * in which case the timeline api collapses onto Asset Hub itself, which carries
 * neither session nor babe. Keeping a per-chain answer here means every
 * era-derived number on screen (APY, unbonding estimates, reward expiry) agrees
 * on the same era length instead of some of them silently disappearing.
 */
export const FALLBACK_ERA_DURATION_MS: Record<string, number> = {
  [AssetHubChains.POLKADOT_AH]: 24 * 60 * 60 * 1000, // 24h
  [AssetHubChains.KUSAMA_AH]: 6 * 60 * 60 * 1000, // 6h
  [AssetHubChains.WESTEND_AH]: 6 * 60 * 60 * 1000, // 6h
};

/** Era length assumed for chains missing from {@link FALLBACK_ERA_DURATION_MS}. */
export const DEFAULT_ERA_DURATION_MS = 24 * 60 * 60 * 1000;
