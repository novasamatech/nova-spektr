import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import {
  AccountType,
  type BaseAccount,
  ChainType,
  CryptoType,
  ProxyVariant,
  SigningType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@/shared/lib/utils';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { forgetWalletModel } from '../forget-wallet-model';

jest.mock('@/entities/multisig', () => ({
  useForgetMultisig: () => ({ deleteMultisigTxs: jest.fn() }),
}));

jest.mock('@/entities/balance', () => ({
  ...jest.requireActual('@/entities/balance'),
  useBalanceService: () => ({ deleteBalance: jest.fn() }),
}));

jest.mock('@walletconnect/universal-provider', () => ({
  Provider: {},
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
  accounts: [
    {
      id: 1,
      walletId: 1,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
      type: AccountType.BASE,
      name: 'first account',
      accountId: TEST_ACCOUNTS[0],
    } as BaseAccount,
    {
      id: 2,
      walletId: 1,
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
      type: AccountType.BASE,
      name: 'second account',
      accountId: '0x00',
    } as BaseAccount,
  ],
} as Wallet;

const proxiedWallet = {
  id: 2,
  name: 'My second wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [
    {
      id: 3,
      accountId: '0x01',
      proxyAccountId: '0x00',
      chainId: TEST_CHAIN_ID,
      delay: 0,
      proxyType: 'Any',
      proxyVariant: ProxyVariant.REGULAR,
      walletId: 2,
      name: 'proxied',
      type: AccountType.PROXIED,
      chainType: 0,
      cryptoType: 0,
    },
  ],
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
      values: new Map().set(walletModel._test.$allWallets, [wallet]),
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
      values: new Map().set(walletModel._test.$allWallets, [wallet]),
    });

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: () => {} } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyDeleteWallet).toHaveBeenCalledWith(1);
    expect(spyDeleteAccounts).toHaveBeenCalledWith([1, 2]);
  });

  test('should delete proxied accounts, wallets and proxyGroups', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);
    jest.spyOn(storageService.proxyGroups, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map()
        .set(walletModel._test.$allWallets, [wallet, proxiedWallet])
        .set(proxyModel.$proxies, {
          '0x01': [
            {
              id: 1,
              accountId: '0x00',
              proxiedAccountId: '0x01',
              chainId: TEST_CHAIN_ID,
              proxyType: 'Any',
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
    expect(scope.getState(walletModel._test.$allWallets)).toEqual([]);
  });
});
