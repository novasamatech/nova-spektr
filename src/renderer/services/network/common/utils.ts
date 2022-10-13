import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from './types';

export const isPolkadot = (chain: Chain) => chain.name === 'Polkadot';
export const isKusama = (chain: Chain) => chain.name === 'Kusama';
export const isTestnet = (chain: Chain) => chain.options?.includes('testnet');

export const isLightClient = (chain: ExtendedChain) => chain.connection.connectionType === ConnectionType.LIGHT_CLIENT;
