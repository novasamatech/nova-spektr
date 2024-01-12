import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { WellKnownChain } from '@substrate/connect';
import { ApiPromise } from '@polkadot/api';

import {
  AccountId,
  ChainId,
  ProxyAccount,
  AccountType,
  Account,
  ProxiedAccount,
  NoID,
  PartialProxiedAccount,
} from '@shared/core';

export const proxyWorkerUtils = {
  toAccountId,
  isSameProxy,
  isSameProxied,
  isProxiedAccount,
  isApiConnected,
  getKnownChain,
};

export function toAccountId(address: string): AccountId {
  try {
    return u8aToHex(decodeAddress(address));
  } catch {
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

function isSameProxied(oldProxy: PartialProxiedAccount, newProxy: PartialProxiedAccount): boolean {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxyAccountId === newProxy.proxyAccountId &&
    oldProxy.chainId === newProxy.chainId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
}

function isProxiedAccount(account: Pick<Account, 'type'>): account is ProxiedAccount {
  return account.type === AccountType.PROXIED;
}

function isApiConnected(apis: Record<ChainId, ApiPromise>, chainId: ChainId): boolean {
  const api = apis[chainId];

  return Boolean(api?.isConnected);
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
