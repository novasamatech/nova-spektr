import { ExtendedChain } from './types';
import { ConnectionType } from '@renderer/shared/core';
import type { Chain, ChainId, ChainOptions } from '@renderer/shared/core';

export const isPolkadot = (chainName: string): boolean => {
  return chainName === 'Polkadot';
};

export const isKusama = (chainName: string): boolean => {
  return chainName === 'Kusama';
};

export const isKusamaChainId = (chainId: ChainId): boolean => {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
};

export const isTestnet = (chainOptions?: ChainOptions[]): boolean => {
  return Boolean(chainOptions?.includes('testnet'));
};

export const isMultisigAvailable = (chainOptions?: ChainOptions[]): boolean => {
  return Boolean(chainOptions?.includes('multisig'));
};

export const isNameWithNumber = (chainName: string): boolean => {
  return /^[0-9]+/.test(chainName);
};

export const isLightClient = (chain: ExtendedChain): boolean => {
  return chain.connection.connectionType === ConnectionType.LIGHT_CLIENT;
};

export const getParachains = (connections: Record<ChainId, Chain>, chainId: ChainId) => {
  return Object.values(connections).filter((c) => c.parentId === chainId);
};
