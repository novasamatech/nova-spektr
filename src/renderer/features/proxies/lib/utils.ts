import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { WellKnownChain } from '@substrate/connect';

import { AccountId, Chain, ChainId, ProxyAccount, AccountType, Account, ProxiedAccount } from '@shared/core';

export const proxyWorkerUtils = {
  toAccountId,
  isRegularProxy,
  isSameProxies,
  getKnownChain,
  isProxiedAccount,
};

/**
 * Try to get account id of the address
 * WARNING! Duplication for worker
 * @param address account's address
 * @return {String}
 */
export function toAccountId(address: string): AccountId {
  try {
    return u8aToHex(decodeAddress(address));
  } catch {
    return '0x00';
  }
}

function isRegularProxy(chain: Chain) {
  return chain.options?.includes('regular_proxy');
}

function isSameProxies(oldProxy: ProxyAccount, newProxy: ProxyAccount): boolean {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxiedAccountId === newProxy.proxiedAccountId &&
    oldProxy.chainId === newProxy.chainId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
}

const enum Chains {
  POLKADOT = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  KUSAMA = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
}

const KnownChains: Record<ChainId, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
};

function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  return KnownChains[chainId];
}

function isProxiedAccount(account: Pick<Account, 'type'>): account is ProxiedAccount {
  return account.type === AccountType.PROXIED;
}
