import {
  AccountType,
  Chain,
  ChainType,
  CryptoType,
  PartialProxiedAccount,
  ProxyAccount,
  ProxyVariant,
} from '@shared/core';
import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@shared/lib/utils';
import { proxyWorkerUtils } from '../utils';

describe('features/proxies/lib/utils', () => {
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

    const result = proxyWorkerUtils.isSameProxy(oldProxy, newProxy);

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

    const result = proxyWorkerUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toBe(false);
  });

  it('should return true when oldProxy and newProxy have the same properties', () => {
    const oldProxied = {
      id: 0,
      walletId: 0,
      name: 'Proxied wallet',
      type: AccountType.PROXIED,
      accountId: '0x00',
      proxyAccountId: '0x01',
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const newProxied = {
      id: 2,
      walletId: 1,
      name: 'Proxied wallet 2',
      type: AccountType.PROXIED,
      accountId: '0x00',
      proxyAccountId: '0x01',
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const result = proxyWorkerUtils.isSameProxied(oldProxied, newProxied);

    expect(result).toBe(true);
  });

  it('should return false when oldProxied and newProxied have different properties', () => {
    const oldProxied = {
      id: 0,
      walletId: 0,
      name: 'Proxied wallet',
      type: AccountType.PROXIED,
      accountId: '0x00',
      proxyAccountId: '0x01',
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const newProxied = {
      id: 2,
      walletId: 1,
      name: 'Proxied wallet 2',
      type: AccountType.PROXIED,
      accountId: '0x00',
      proxyAccountId: '0x02',
      chainId: '0x06',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const result = proxyWorkerUtils.isSameProxied(oldProxied, newProxied);

    expect(result).toBe(false);
  });

  it('should return the account id when given a valid address', () => {
    const address = TEST_ADDRESS;
    const expectedAccountId = TEST_ACCOUNT_ID;

    const result = proxyWorkerUtils.toAccountId(address);

    expect(result).toEqual(expectedAccountId);
  });

  it('should return "0x00" when given an invalid address', () => {
    const address = 'invalid_address';
    const expectedAccountId = '0x00';

    const result = proxyWorkerUtils.toAccountId(address);

    expect(result).toEqual(expectedAccountId);
  });

  it('should return true if "regular_proxy" is included in chain options', () => {
    const chainWithRegularProxy = { options: ['regular_proxy'] } as Chain;
    const result = proxyWorkerUtils.isRegularProxy(chainWithRegularProxy);

    expect(result).toBe(true);
  });

  it('should return false if "regular_proxy" is not included in chain options', () => {
    const chainWithoutRegularProxy = { options: ['multisig'] } as Chain;
    const result = proxyWorkerUtils.isRegularProxy(chainWithoutRegularProxy);

    expect(result).toBe(false);
  });

  it('should return false if chain options is undefined', () => {
    const chainWithUndefinedOptions = {} as Chain;
    const result = proxyWorkerUtils.isRegularProxy(chainWithUndefinedOptions);

    expect(result).toBe(false);
  });

  it('should return true if account type is PROXIED', () => {
    const account = { type: AccountType.PROXIED };
    expect(proxyWorkerUtils.isProxiedAccount(account)).toBe(true);
  });

  it('should return false if account type is not PROXIED', () => {
    const account = { type: AccountType.BASE };
    expect(proxyWorkerUtils.isProxiedAccount(account)).toBe(false);
  });
});
