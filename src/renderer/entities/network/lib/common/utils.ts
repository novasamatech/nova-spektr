import { ExtendedChain } from './types';
import { ConnectionType } from '@renderer/shared/core';
import type { ChainOptions } from '@renderer/shared/core';

export const isPolkadot = (chainName: string): boolean => {
  return chainName === 'Polkadot';
};

export const isKusama = (chainName: string): boolean => {
  return chainName === 'Kusama';
};

export const isTestnet = (chainOptions?: ChainOptions[]): boolean => {
  return Boolean(chainOptions?.includes('testnet'));
};

export const isNameWithNumber = (chainName: string): boolean => {
  return /^[0-9]+/.test(chainName);
};

export const isLightClient = (chain: ExtendedChain): boolean => {
  return chain.connection.connectionType === ConnectionType.LIGHT_CLIENT;
};
