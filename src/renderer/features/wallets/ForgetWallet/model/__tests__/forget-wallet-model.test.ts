import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import {
  AccountType,
  CryptoType,
  ProxyVariant,
  SigningType,
  type VaultBaseAccount,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { TEST_ACCOUNTS, TEST_CHAIN_ID } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts } from '@/domains/network';
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

const wallet: Wallet = {
  id: 1,
  name: 'My wallet',
  isActive: false,
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
  accounts: [
    {
      id: '1',
      walletId: 1,
      type: 'universal',
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      accountType: AccountType.BASE,
      name: 'first account',
      accountId: TEST_ACCOUNTS[0],
    } satisfies VaultBaseAccount,
    {
      id: '2',
      walletId: 1,
      type: 'universal',
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      accountType: AccountType.BASE,
      name: 'second account',
      accountId: createAccountId('proxied account'),
    } satisfies VaultBaseAccount,
  ],
};

const proxiedWallet = {
  id: 2,
  name: 'My second wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [
    {
      id: 3,
      type: 'chain',
      accountId: '0x01',
      proxyAccountId: createAccountId('proxied account'),
      chainId: TEST_CHAIN_ID,
      delay: 0,
      proxyType: 'Any',
      proxyVariant: ProxyVariant.REGULAR,
      walletId: 2,
      name: 'proxied',
      accountType: AccountType.PROXIED,
      chainType: 0,
      cryptoType: 0,
    },
  ],
};

describe('features/wallets/ForgetModel', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should call success callback after wallet delete', async () => {
    const spyCallback = jest.fn();

    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [wallet]),
    });

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: spyCallback } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyCallback).toHaveBeenCalled();
  });

  test('should delete wallet and accounts', async () => {
    const spyDeleteWallet = jest.fn();
    const spyDeleteAccounts = jest.fn().mockImplementation((accounts: AnyAccount[]) => accounts);

    storageService.wallets.delete = spyDeleteWallet;

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [wallet]],
        [accounts.__test.$list, wallet.accounts],
      ],
      handlers: [[accounts.deleteAccounts, spyDeleteAccounts]],
    });

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: () => {} } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyDeleteWallet).toHaveBeenCalledWith(1);
    expect(spyDeleteAccounts).toHaveBeenCalledWith(wallet.accounts);
  });

  test('should delete proxied accounts, wallets and proxyGroups', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);
    jest.spyOn(storageService.proxyGroups, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map()
        .set(walletModel.__test.$rawWallets, [wallet, proxiedWallet])
        .set(accounts.__test.$list, [...wallet.accounts, ...proxiedWallet.accounts])
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
    expect(scope.getState(walletModel.__test.$rawWallets)).toEqual([]);
  });
});
