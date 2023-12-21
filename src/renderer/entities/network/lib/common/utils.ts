import { ChainMap } from './types';
import { ConnectionType } from '@shared/core';
import type { Chain, ChainId, ChainOptions, Connection } from '@shared/core';

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

export const isLightClient = (connection: Connection): boolean => {
  return connection.connectionType === ConnectionType.LIGHT_CLIENT;
};

export const getParachains = (chainMap: ChainMap, chainId: ChainId): Chain[] => {
  return Object.values(chainMap).filter((c) => c.parentId === chainId);
};
