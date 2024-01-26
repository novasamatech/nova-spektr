import { WellKnownChain } from '@substrate/connect';

import type { ChainId, ChainOptions } from '@shared/core';
import { Chains } from './types';

const KnownChains: Record<ChainId, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
};

export function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  return KnownChains[chainId];
}

export function getLightClientChains(): ChainId[] {
  return Object.keys(KnownChains) as ChainId[];
}

export function isPolkadot(chainName: string): boolean {
  return chainName === 'Polkadot';
}

export function isKusama(chainName: string): boolean {
  return chainName === 'Kusama';
}

export function isTestnet(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes('testnet'));
}

export function isNameStartsWithNumber(chainName: string): boolean {
  return /^[0-9]+/.test(chainName);
}
