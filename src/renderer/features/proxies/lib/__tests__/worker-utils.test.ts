import { type NoID, type PartialProxiedAccount, type ProxyAccount } from '@/shared/core';
import { AccountType, ChainType, CryptoType, ProxyVariant } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { proxyWorkerUtils } from '../worker-utils';

describe('features/proxies/lib/worker-utils', () => {
  test('should return true when oldProxy and newProxy have the same properties', () => {
    const oldProxy = {
      id: 1,
      accountId: '0x00' as AccountId,
      proxiedAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const newProxy = {
      id: 2,
      accountId: '0x00' as AccountId,
      proxiedAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const result = proxyWorkerUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toEqual(true);
  });

  test('should return false when oldProxy and newProxy have different properties', () => {
    const oldProxy = {
      id: 1,
      accountId: '0x00' as AccountId,
      proxiedAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const newProxy = {
      id: 2,
      accountId: '0x01' as AccountId,
      proxiedAccountId: '0x02' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as ProxyAccount;

    const result = proxyWorkerUtils.isSameProxy(oldProxy, newProxy);

    expect(result).toEqual(false);
  });

  test('should return true when oldProxy and newProxy have the same properties', () => {
    const oldProxied = {
      walletId: 0,
      name: 'Proxied wallet',
      accountType: AccountType.PROXIED,
      accountId: '0x00' as AccountId,
      proxyAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const newProxied = {
      walletId: 1,
      name: 'Proxied wallet 2',
      accountType: AccountType.PROXIED,
      accountId: '0x00' as AccountId,
      proxyAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const result = proxyWorkerUtils.isSameProxied(oldProxied, newProxied);

    expect(result).toEqual(true);
  });

  test('should return false when oldProxied and newProxied have different properties', () => {
    const oldProxied = {
      walletId: 0,
      name: 'Proxied wallet',
      accountType: AccountType.PROXIED,
      accountId: '0x00' as AccountId,
      proxyAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const newProxied = {
      walletId: 1,
      name: 'Proxied wallet 2',
      accountType: AccountType.PROXIED,
      accountId: '0x00' as AccountId,
      proxyAccountId: '0x02' as AccountId,
      chainId: '0x06',
      proxyType: 'Any',
      delay: 0,
      proxyVariant: ProxyVariant.REGULAR,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
    } as PartialProxiedAccount;

    const result = proxyWorkerUtils.isSameProxied(oldProxied, newProxied);

    expect(result).toEqual(false);
  });

  test('should return the account id when given a valid address', () => {
    const address = TEST_ADDRESS;
    const expectedAccountId = TEST_ACCOUNTS[0];

    const result = proxyWorkerUtils.toAccountId(address);

    expect(result).toEqual(expectedAccountId);
  });

  test('should return "0x00" when given an invalid address', () => {
    const address = 'invalid_address';
    const expectedAccountId = '0x00';

    const result = proxyWorkerUtils.toAccountId(address);

    expect(result).toEqual(expectedAccountId);
  });

  test('should return undefined if chainId is not found', () => {
    const result = proxyWorkerUtils.getKnownChain('0x01');

    expect(result).toBeUndefined();
  });

  test('should check proxy is delayed (true for delay > 0)', () => {
    const proxy = {
      accountId: '0x00' as AccountId,
      proxiedAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 1,
    } as NoID<ProxyAccount>;

    expect(proxyWorkerUtils.isDelayedProxy(proxy)).toEqual(true);
  });

  test('should check proxy is delayed (false for delay === 0)', () => {
    const proxy = {
      accountId: '0x00' as AccountId,
      proxiedAccountId: '0x01' as AccountId,
      chainId: '0x05',
      proxyType: 'Any',
      delay: 0,
    } as NoID<ProxyAccount>;

    expect(proxyWorkerUtils.isDelayedProxy(proxy)).toEqual(false);
  });
});
