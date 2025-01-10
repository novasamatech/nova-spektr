import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { storageService } from '@/shared/api/storage';
import { AccountType, type VaultBaseAccount } from '@/shared/core';
import * as networkDomain from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { renameWalletModel } from '../rename-wallet-model';

import { walletMock } from './mocks/wallet-mock';

vi.mock('@walletconnect/utils', () => ({
  getSdkError: jest.fn(),
}));

vi.mock('@walletconnect/universal-provider', () => ({
  Provider: {},
}));

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should validate non-unique wallet name', async () => {
    const wallets = [walletMock.wallet1, walletMock.wallet2];
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, wallets),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.onChange, { scope, params: walletMock.wallet2.name });
    await allSettled(renameWalletModel.$walletForm.validate, { scope });

    expect(scope.getState(renameWalletModel.$walletForm.$isValid)).toEqual(false);
  });

  test.skip('should updated wallet name after form submit', async () => {
    const newName = 'New wallet name';
    const updatedWallet = {
      ...walletMock.wallet1,
      name: newName,
      accounts: [
        { cryptoType: 0, name: 'New wallet name', accountType: AccountType.BASE, type: 'universal', walletId: 1 },
      ] as VaultBaseAccount[],
    };

    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(updatedWallet.id);

    const scope = fork({
      values: new Map()
        .set(walletModel.__test.$rawWallets, [walletMock.wallet1])
        .set(networkDomain.accounts.__test.$list, walletMock.wallet1.accounts.concat(walletMock.wallet2.accounts)),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.onChange, { scope, params: newName });
    await allSettled(renameWalletModel.$walletForm.submit, { scope });

    expect(scope.getState(walletModel.$allWallets)).toEqual([updatedWallet]);
  });
});
