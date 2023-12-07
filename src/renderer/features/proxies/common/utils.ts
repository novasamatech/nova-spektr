import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';

import { AccountId, Chain } from '@shared/core';
import { ProxyAccount } from './types';

/**
 * Try to get account id of the address
 * WARNING! Duplication for worker
 * @param address account's address
 * @return {String}
 */
export const toAccountId = (address: string): AccountId => {
  try {
    return u8aToHex(decodeAddress(address));
  } catch {
    return '0x00';
  }
};

export const isRegularProxy = (chain: Chain) => chain.options?.includes('regular_proxy');

export const toProxyAccount = (account: any): ProxyAccount => {
  const proxyAccount = {
    accountId: toAccountId(account?.delegate),
    proxyType: account.proxyType,
    delay: Number(account.delay),
  };

  return proxyAccount;
};

export const isEqualProxies = (oldProxy: ProxyAccount, newProxy: ProxyAccount) => {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxiedAccountId === newProxy.proxiedAccountId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
};
