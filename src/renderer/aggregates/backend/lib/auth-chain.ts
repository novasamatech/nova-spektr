import { type ChainId } from '@/shared/core';

// Polkadot Asset Hub — picked as the auth QR default because Polkadot Vault
// always provisions its keyring and users who derived their keys on the relay
// or other parachains can pre-select another chain via the UI selector.
export const DEFAULT_AUTH_CHAIN_ID: ChainId = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';
