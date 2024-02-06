import type { ChainOptions } from '@shared/core';

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
