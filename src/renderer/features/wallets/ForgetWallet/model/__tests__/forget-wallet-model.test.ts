import { allSettled, fork } from 'effector';

import { Account, AccountType, ChainType, CryptoType, SigningType, WalletType } from '@shared/core';
import { forgetWalletModel } from '../forget-wallet-model';
import { storageService } from '@shared/api/storage';
import { TEST_ACCOUNT_ID } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';

jest.mock('@shared/api/storage', () => ({
  __esModule: true,
  default: jest.fn(),
  storage: { connectTo: jest.fn() },
  storageService: {
    wallets: {},
    accounts: {},
  },
}));

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('@entities/multisig', () => ({
  useForgetMultisig: () => ({ deleteMultisigTxs: jest.fn() }),
}));

jest.mock('@entities/balance', () => ({
  useBalanceService: () => ({ deleteBalance: jest.fn() }),
}));

jest.mock('@entities/network', () => ({
  useMetadata: () => ({}),
}));

const wallet = {
  id: 2,
  name: 'My second wallet',
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
  { ...accountBase, id: 1, accountId: TEST_ACCOUNT_ID },
  { ...accountBase, id: 2, accountId: '0x00' },
];

jest.mock(
  'dexie',
  jest.fn().mockImplementation(() => {
    return jest.fn().mockReturnValue({
      version: jest.fn().mockReturnValue({
        stores: jest.fn().mockReturnValue({
          upgrade: jest.fn(),
        }),
      }),
      table: jest.fn(),
    });
  }),
);

describe('features/ForgetModel', () => {
  test('should call success calback after wallet delete', async () => {
    const spyCallback = jest.fn();
    storageService.wallets.delete = jest.fn();
    storageService.accounts.deleteAll = jest.fn();
    const scope = fork({
      values: new Map().set(walletModel.$wallets, [wallet]).set(walletModel.$accounts, walletAccounts),
    });

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: spyCallback } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyCallback).toBeCalled();
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

    expect(spyDeleteWallet).toBeCalledWith(2);
    expect(spyDeleteAccounts).toBeCalledWith([1, 2]);
  });
});
