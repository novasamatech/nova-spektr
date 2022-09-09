import { Chain } from '@renderer/domain/chain';

export const isPolkadot = (chain: Chain) => chain.name === 'Polkadot';
export const isKusama = (chain: Chain) => chain.name === 'Kusama';
export const isTestnet = (chain: Chain) => chain.options?.includes('testnet');
