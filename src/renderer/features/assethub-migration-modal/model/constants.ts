import { RelayChains } from '@/shared/lib/utils/constants';

// Migration block numbers when AssetHub migration alerts should start showing
export const KUSAMA_MIGRATION_BLOCK = 30_423_691;
export const POLKADOT_MIGRATION_BLOCK = 28_490_502;

// Hide alert after 5,000,000 blocks (~347 days)
export const HIDE_AFTER_BLOCKS = 5_000_000;

export const POLKADOT_CHAIN_ID = RelayChains.POLKADOT;
export const KUSAMA_CHAIN_ID = RelayChains.KUSAMA;

// Relay chain ID to AssetHub chain ID mapping to display correct icons in modal header
export const RELAY_TO_ASSET_HUB_CHAIN_IDS = {
  [RelayChains.KUSAMA]: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a', // Kusama AssetHub chain ID
  [RelayChains.POLKADOT]: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f', // Polkadot AssetHub chain ID
} as const;
