import { WellKnownChain } from '@substrate/connect';

import type { ChainId, ChainOptions } from '@shared/core';
import { Chains } from './types';

export function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  const KnownChains: Record<ChainId, WellKnownChain> = {
    [Chains.POLKADOT]: WellKnownChain.polkadot,
    [Chains.KUSAMA]: WellKnownChain.ksmcc3,
  };

  return KnownChains[chainId];
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
