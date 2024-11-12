import { type ProxiedAccount, ProxyVariant } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { proxyUtils } from '../proxy-utils';

import { proxyMock } from './mocks/proxy-mocks';

describe('entities/proxy/lib/proxy-utils', () => {
  test('should return true for identical proxies', () => {
    const { oldProxy } = proxyMock;
    const result = proxyUtils.isSameProxy(oldProxy, oldProxy);

    expect(result).toEqual(true);
  });

  test('should return false for different proxies', () => {
    const { oldProxy, newProxy } = proxyMock;
    const result = proxyUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toEqual(false);
  });

  test('should return proxied name for a given proxied account', () => {
    const proxiedAccount = {
      accountId: TEST_ACCOUNTS[0],
      proxyType: 'Any',
      proxyVariant: ProxyVariant.REGULAR,
    } as unknown as ProxiedAccount;

    const result = proxyUtils.getProxiedName(proxiedAccount);

    expect(result).toEqual('Any for 5CGQ7B...VbXyr9');
  });

  test('should return proxy group', () => {
    const { wallets, deposits } = proxyMock;
    const result = proxyUtils.getProxyGroups([wallets[0]], deposits[0]);

    expect(result).toEqual([
      {
        walletId: 1,
        proxiedAccountId: TEST_ACCOUNTS[0],
        chainId: '0x001',
        totalDeposit: '100',
      },
    ]);
  });

  test('should return proxy group for Wallet Connect', () => {
    const { wallets, deposits } = proxyMock;
    const result = proxyUtils.getProxyGroups([wallets[1]], deposits[1]);

    expect(result).toEqual([
      {
        walletId: 2,
        proxiedAccountId: TEST_ACCOUNTS[1],
        chainId: '0x001',
        totalDeposit: '200',
      },
    ]);
  });

  test('should sort proxy accounts by type', () => {
    const { proxyAccounts } = proxyMock;
    const sortedAccounts = proxyUtils.sortAccountsByProxyType(proxyAccounts);

    expect(sortedAccounts).toEqual([proxyAccounts[2], proxyAccounts[0], proxyAccounts[1]]);
  });
});
