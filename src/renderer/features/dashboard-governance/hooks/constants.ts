import { AssetHubChains } from '@/domains/staking';

export const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH'];
export const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH'];

/**
 * How long a block-derived figure is held before it is taken again. Everything
 * on the tab that moves with the head — the unlock schedule, the referendum
 * timelines — is measured in days, so it has nothing to say between one block
 * and the next; re-deriving on every ~6 s block would re-render the whole tab
 * for a change no one can see.
 */
export const BLOCK_SNAPSHOT_THROTTLE_MS = 300_000;
