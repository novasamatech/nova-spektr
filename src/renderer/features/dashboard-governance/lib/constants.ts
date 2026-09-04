import { AssetHubChains } from '@/domains/staking';

/** The two chains the app runs governance on. */
export const POLKADOT_AH_CHAIN_ID = AssetHubChains['POLKADOT_AH'];
export const KUSAMA_AH_CHAIN_ID = AssetHubChains['KUSAMA_AH'];

/**
 * The chain filter's "every chain" option. `Select` needs a value for it, and
 * the filter itself is `null` — the sentinel never leaves the picker.
 */
export const ALL_CHAINS = '__all__';

/**
 * The one date format the tab prints: unlock estimates and ended-referendum
 * dates alike, so two dates about the same lock never disagree on shape.
 */
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';
