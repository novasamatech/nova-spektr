import { allSettled, fork } from 'effector';

import {
  AccountType,
  ChainType,
  CryptoType,
  ProxiedAccount,
  ProxyType,
  ProxyVariant,
  SigningType,
  WalletType,
  Account,
} from '@shared/core';
import { forgetWalletModel } from '../forget-wallet-model';
import { storageService } from '@shared/api/storage';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';
import { proxyModel } from '@entities/proxy';

jest.mock('@entities/multisig', () => ({
  useForgetMultisig: () => ({ deleteMultisigTxs: jest.fn() }),
}));

jest.mock('@entities/balance', () => ({
  ...jest.requireActual('@entities/balance'),
  useBalanceService: () => ({ deleteBalance: jest.fn() }),
}));

jest.mock('@walletconnect/sign-client', () => ({
  Client: {},
}));

jest.mock('@walletconnect/utils', () => ({
  getSdkError: jest.fn(),
}));

const wallet = {
  id: 1,
  name: 'My wallet',
  isActive: false,
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

const accountBase = {
  chainType: ChainType.SUBSTRATE,
  cryptoType: CryptoType.SR25519,
  walletId: wallet.id,
  type: AccountType.BASE,
  name: 'some account',
};

const walletAccounts: Account[] = [
  { ...accountBase, id: 1, accountId: TEST_ACCOUNTS[0] },
  { ...accountBase, id: 2, accountId: '0x00' },
];

const proxiedAccount: ProxiedAccount = {
  id: 3,
  accountId: '0x01',
  proxyAccountId: '0x00',
  chainId: TEST_CHAIN_ID,
  delay: 0,
  proxyType: ProxyType.ANY,
  proxyVariant: ProxyVariant.REGULAR,
  walletId: 2,
  name: 'proxied',
  type: AccountType.PROXIED,
  chainType: 0,
  cryptoType: 0,
};

const proxiedWallet = {
  id: 2,
  name: 'My second wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
};

describe('features/wallets/ForgetModel', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should call success calback after wallet delete', async () => {
    const spyCallback = jest.fn();
    storageService.wallets.delete = jest.fn();
    storageService.accounts.deleteAll = jest.fn();

    const scope = fork({
      values: new Map().set(walletModel.$wallets, [wallet]).set(walletModel.$accounts, walletAccounts),
    });

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: spyCallback } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyCallback).toHaveBeenCalled();
  });

  test('should delete wallet and accounts', async () => {
    const spyDeleteWallet = jest.fn();
    const spyDeleteAccounts = jest.fn();

    storageService.wallets.delete = spyDeleteWallet;
    storageService.accounts.deleteAll = spyDeleteAccounts;

    const scope = fork({
      values: new Map().set(walletModel.$wallets, [wallet]).set(walletModel.$accounts, walletAccounts),
    });

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: () => {} } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyDeleteWallet).toBeCalledWith(1);
    expect(spyDeleteAccounts).toBeCalledWith([1, 2]);
  });

  test('should delete proxied accounts, wallets and proxyGroups', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);
    jest.spyOn(storageService.proxyGroups, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [wallet, proxiedWallet])
        .set(walletModel.$accounts, [...walletAccounts, proxiedAccount])
        .set(proxyModel.$proxies, {
          '0x01': [
            {
              id: 1,
              accountId: '0x00',
              proxiedAccountId: '0x01',
              chainId: TEST_CHAIN_ID,
              proxyType: ProxyType.ANY,
              delay: 0,
            },
          ],
        })
        .set(proxyModel.$proxyGroups, [
          {
            id: 1,
            walletId: 2,
            proxiedAccountId: '0x01',
            chainId: TEST_CHAIN_ID,
            totalDeposit: '10005100',
          },
        ]),
    });

    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(scope.getState(proxyModel.$proxyGroups)).toEqual([]);
    expect(scope.getState(proxyModel.$proxies)).toEqual({});
    expect(scope.getState(walletModel.$wallets)).toEqual([]);
    expect(scope.getState(walletModel.$accounts)).toEqual([]);
  });
});
