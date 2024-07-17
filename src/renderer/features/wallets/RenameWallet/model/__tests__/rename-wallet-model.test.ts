import { allSettled, fork } from 'effector';

import { walletMock } from './mocks/wallet-mock';
import { renameWalletModel } from '../rename-wallet-model';
import { walletModel } from '@entities/wallet';
import { storageService } from '@shared/api/storage';

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should validate non-unique wallet name', async () => {
    const wallets = [walletMock.wallet1, walletMock.wallet2];
    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.onChange, { scope, params: walletMock.wallet2.name });
    await allSettled(renameWalletModel.$walletForm.validate, { scope });

    expect(scope.getState(renameWalletModel.$walletForm.$isValid)).toEqual(false);
  });

  test('should updated wallet name after form submit', async () => {
    const newName = 'New wallet name';
    const updatedWallet = { ...walletMock.wallet1, name: newName };

    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(updatedWallet.id);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, [walletMock.wallet1]),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.onChange, { scope, params: newName });
    await allSettled(renameWalletModel.$walletForm.submit, { scope });

    expect(scope.getState(walletModel.$wallets)).toEqual([updatedWallet]);
  });
});
