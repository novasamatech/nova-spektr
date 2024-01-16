import { HexString, ProxyAccount, ProxyType } from '@shared/core';
import { proxyUtils } from '../utils';

describe('entities/proxy/lib/utils', () => {
  test('should return true when for identical Proxies', () => {
    const oldProxy = {
      id: 1,
      accountId: '0x00',
      proxiedAccountId: '0x01',
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const newProxy = {
      id: 2,
      accountId: '0x00',
      proxiedAccountId: '0x01',
      chainId: '0x05',
      proxyType: 'Any',
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
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const newProxy = {
      id: 2,
      accountId: '0x01',
      proxiedAccountId: '0x02',
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const result = proxyUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toEqual(false);
  });

  test('should return the proxied name for a given proxied account', () => {
    const proxiedAccount = {
      accountId: '0x01' as HexString,
      proxyType: 'Any' as ProxyType,
    };
    const expectedName = 'Any for 0x01';

    const result = proxyUtils.getProxiedName(proxiedAccount.accountId, proxiedAccount.proxyType);

    expect(result).toEqual(expectedName);
  });
});
