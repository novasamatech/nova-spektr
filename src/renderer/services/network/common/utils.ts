import { ChainOptions } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from './types';

export const isPolkadot = (chainName: string): boolean => {
  return chainName === 'Polkadot';
};

export const isKusama = (chainName: string): boolean => {
  return chainName === 'Kusama';
};

export const isTestnet = (chainOptions?: ChainOptions[]): boolean => {
  return Boolean(chainOptions?.includes('testnet'));
};

export const isLightClient = (chain: ExtendedChain): boolean => {
  return chain.connection.connectionType === ConnectionType.LIGHT_CLIENT;
};
