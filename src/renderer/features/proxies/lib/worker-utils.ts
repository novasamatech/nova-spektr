import { type ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { WellKnownChain } from '@substrate/connect';

import { type ChainId, type NoID, type PartialProxiedAccount, type ProxyAccount } from '@/shared/core';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

export const proxyWorkerUtils = {
  toAccountId,
  isSameProxy,
  isSameProxied,
  isApiConnected,
  isDelayedProxy,
  getKnownChain,
};

export function toAccountId(address: string): AccountId {
  try {
    return pjsSchema.helpers.toAccountId(u8aToHex(decodeAddress(address)));
  } catch {
    // TODO WTF
    // @ts-expect-error 0x00 is not account id
    return '0x00';
  }
}

function isSameProxy(oldProxy: NoID<ProxyAccount>, newProxy: NoID<ProxyAccount>): boolean {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxiedAccountId === newProxy.proxiedAccountId &&
    oldProxy.chainId === newProxy.chainId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
}

function isSameProxied(oldProxied: PartialProxiedAccount, newProxied: PartialProxiedAccount): boolean {
  return (
    oldProxied.accountId === newProxied.accountId &&
    oldProxied.chainId === newProxied.chainId &&
    oldProxied.connections.length === newProxied.connections.length &&
    oldProxied.connections.every((existingConnection, index) => {
      const newConnection = newProxied.connections.at(index);
      return (
        newConnection &&
        existingConnection.proxyAccountId === newConnection.proxyAccountId &&
        existingConnection.proxyType === newConnection.proxyType &&
        existingConnection.delay === newConnection.delay
      );
    })
  );
}

function isApiConnected(apis: Record<ChainId, ApiPromise>, chainId: ChainId): boolean {
  const api = apis[chainId];

  return Boolean(api?.isConnected);
}

function isDelayedProxy(proxy: Pick<ProxyAccount, 'delay'>): boolean {
  return proxy.delay !== 0;
}

const MainChains = {
  POLKADOT: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  KUSAMA: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
};

const KnownChains: Record<ChainId, WellKnownChain> = {
  [MainChains.POLKADOT]: WellKnownChain.polkadot,
  [MainChains.KUSAMA]: WellKnownChain.ksmcc3,
};

function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  return KnownChains[chainId];
}
