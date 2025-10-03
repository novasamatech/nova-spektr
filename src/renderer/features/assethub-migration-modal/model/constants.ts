import { RelayChains } from '@/shared/lib/utils/constants';

// Migration block numbers when AssetHub migration alerts should start showing
export const KUSAMA_MIGRATION_BLOCK = 30_423_691;
export const POLKADOT_MIGRATION_BLOCK = Infinity; // TODO: REPLACE WITH AN ACTUAL POLKADOT MIGRATION BLOCK!

// Hide alert after 5,000,000 blocks (~347 days)
export const HIDE_AFTER_BLOCKS = 5_000_000;

export const POLKADOT_CHAIN_ID = RelayChains.POLKADOT;
export const KUSAMA_CHAIN_ID = RelayChains.KUSAMA;

// AssetHub chain IDs to show corresponding icons in modal header
export const ASSET_HUB_CHAIN_IDS = {
  [RelayChains.KUSAMA]: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  [RelayChains.POLKADOT]: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
} as const;
