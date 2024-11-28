import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Account } from '@/shared/core';
import { walletModel } from '@/entities/wallet';
import { renameWalletModel } from '../rename-wallet-model';

import { walletMock } from './mocks/wallet-mock';

jest.mock('@walletconnect/utils', () => ({
  getSdkError: jest.fn(),
}));

jest.mock('@walletconnect/universal-provider', () => ({
  Provider: {},
}));

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should validate non-unique wallet name', async () => {
    const wallets = [walletMock.wallet1, walletMock.wallet2];
    const scope = fork({
      values: new Map().set(walletModel._test.$allWallets, wallets),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.onChange, { scope, params: walletMock.wallet2.name });
    await allSettled(renameWalletModel.$walletForm.validate, { scope });

    expect(scope.getState(renameWalletModel.$walletForm.$isValid)).toEqual(false);
  });

  test('should updated wallet name after form submit', async () => {
    const newName = 'New wallet name';
    const updatedWallet = {
      ...walletMock.wallet1,
      name: newName,
      accounts: [{ cryptoType: 0, name: 'New wallet name', type: 'base', walletId: 1 }] as Account[],
    };

    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(updatedWallet.id);
    jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1]);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue(updatedWallet.accounts);

    const scope = fork({
      values: new Map().set(walletModel._test.$allWallets, [walletMock.wallet1]),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.onChange, { scope, params: newName });
    await allSettled(renameWalletModel.$walletForm.submit, { scope });

    expect(scope.getState(walletModel.$allWallets)).toEqual([updatedWallet]);
  });
});
