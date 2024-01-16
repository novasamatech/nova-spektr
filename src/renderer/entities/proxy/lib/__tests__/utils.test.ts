import type { ProxyAccount } from '@shared/core';
import { ProxyType } from '@shared/core';
import { proxyUtils } from '../utils';
import { TEST_ACCOUNT_ID } from '@shared/lib/utils';

describe('entities/proxy/lib/utils', () => {
  test('should return true when oldProxy and newProxy have the same properties', () => {
    const oldProxy = {
      id: 1,
      accountId: '0x00',
      proxiedAccountId: '0x01',
      chainId: '0x05',
      proxyType: ProxyType.ANY,
      delay: 0,
    } as ProxyAccount;

    const newProxy = {
      id: 2,
      accountId: '0x00',
      proxiedAccountId: '0x01',
      chainId: '0x05',
      proxyType: ProxyType.ANY,
      delay: 0,
    } as ProxyAccount;

    const result = proxyUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toEqual(true);
  });

  test('should return false when oldProxy and newProxy have different properties', () => {
    const oldProxy = {
      id: 1,
      accountId: '0x00',
      proxiedAccountId: '0x01',
      chainId: '0x05',
      proxyType: ProxyType.ANY,
      delay: 0,
    } as ProxyAccount;

    const newProxy = {
      id: 2,
      accountId: '0x01',
      proxiedAccountId: '0x02',
      chainId: '0x05',
      proxyType: ProxyType.ANY,
      delay: 0,
    } as ProxyAccount;

    const result = proxyUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toEqual(false);
  });

  test('should return proxied name for a given proxied account', () => {
    const result = proxyUtils.getProxiedName(TEST_ACCOUNT_ID, ProxyType.ANY);

    expect(result).toEqual('Any for 5CGQ7B...VbXyr9');
  });
});
