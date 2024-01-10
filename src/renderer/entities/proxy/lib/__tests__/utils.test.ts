import { HexString, ProxyAccount, ProxyType } from '@shared/core';
import { proxyUtils } from '../utils';

describe('entities/proxy/lib/utils', () => {
  it('should return true when oldProxy and newProxy have the same properties', () => {
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

    expect(result).toBe(true);
  });

  it('should return false when oldProxy and newProxy have different properties', () => {
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

    expect(result).toBe(false);
  });

  it('should return the proxied name for a given proxied account', () => {
    const proxiedAccount = {
      accountId: '0x01' as HexString,
      proxyType: 'Any' as ProxyType,
    };
    const expectedName = 'Any for 0x01';

    const result = proxyUtils.getProxiedName(proxiedAccount);

    expect(result).toEqual(expectedName);
  });
});
