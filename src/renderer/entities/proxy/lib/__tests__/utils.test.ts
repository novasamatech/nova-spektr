import {
  ProxyAccount,
  AccountType,
  ChainType,
  CryptoType,
  ProxyType,
  WalletType,
  SigningType,
  AccountId,
  ProxyDeposits,
  Account,
  Wallet,
} from '@shared/core';
import { proxyUtils } from '../utils';
import { TEST_ACCOUNTS } from '@shared/lib/utils';

describe('entities/proxy/lib/utils', () => {
  test('should return true when for identical Proxies', () => {
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
    const result = proxyUtils.getProxiedName(TEST_ACCOUNTS[0], ProxyType.ANY);

    expect(result).toEqual('Any for 5CGQ7B...VbXyr9');
  });

  test('should return proxy group', () => {
    const wallets: Wallet[] = [
      {
        id: 1,
        name: 'My first wallet',
        isActive: true,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
    ];
    const accounts: Account[] = [
      {
        id: 1,
        walletId: 1,
        name: 'My base account',
        type: AccountType.BASE,
        accountId: TEST_ACCOUNTS[0] as AccountId,
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      },
    ];
    const deposits: ProxyDeposits = {
      chainId: '0x00',
      deposits: { [TEST_ACCOUNTS[0]]: '100' },
    };

    const result = proxyUtils.getProxyGroups(wallets, accounts, deposits);
    expect(result).toEqual([
      {
        walletId: 1,
        proxiedAccountId: TEST_ACCOUNTS[0],
        chainId: '0x00',
        totalDeposit: '100',
      },
    ]);
  });

  test('should sort proxy accounts by type', () => {
    const proxyAccounts: ProxyAccount[] = [
      {
        id: 1,
        accountId: '0x01',
        proxiedAccountId: '0x02',
        chainId: '0x05',
        proxyType: ProxyType.CANCEL_PROXY,
        delay: 0,
      },
      {
        id: 2,
        accountId: '0x01',
        proxiedAccountId: '0x02',
        chainId: '0x05',
        proxyType: ProxyType.GOVERNANCE,
        delay: 0,
      },
      {
        id: 3,
        accountId: '0x01',
        proxiedAccountId: '0x02',
        chainId: '0x05',
        proxyType: ProxyType.NON_TRANSFER,
        delay: 0,
      },
    ];

    proxyUtils.sortAccountsByProxyType(proxyAccounts);
    ['NonTransfer', 'CancelProxy', 'Governance'].forEach((type, index) => {
      expect(proxyAccounts[index].proxyType).toEqual(type);
    });
  });
});
