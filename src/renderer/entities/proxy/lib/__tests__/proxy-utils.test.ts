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
      connections: [{ proxyType: 'Any' }],
      proxyVariant: ProxyVariant.REGULAR,
    } as unknown as ProxiedAccount;

    const result = proxyUtils.getProxiedName(proxiedAccount);

    expect(result).toEqual('Any for 1ChFWe...X7iTVZ');
  });

  test('should sort proxy accounts by type', () => {
    const { proxyAccounts } = proxyMock;
    const sortedAccounts = proxyUtils.sortAccountsByProxyType(proxyAccounts);

    expect(sortedAccounts).toEqual([proxyAccounts[2], proxyAccounts[0], proxyAccounts[1]]);
  });
});
