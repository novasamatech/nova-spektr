import { fork, allSettled } from 'effector';

import { walletMock } from './mocks/wallet-mock';
import { renameWalletModel } from '../rename-wallet-model';
import { walletModel } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should discard not unique wallet names', async () => {
    const wallets = [walletMock.wallet1, walletMock.wallet2];
    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.setForm, { scope, params: { name: walletMock.wallet2.name } });
    await allSettled(renameWalletModel.$walletForm.validate, { scope });

    expect(scope.getState(renameWalletModel.$walletForm.$isValid)).toEqual(false);
  });

  test('should updated $walletForDetails and $wallets after name change', async () => {
    const wallets = [walletMock.wallet1, walletMock.wallet2];
    const newName = 'New wallet name';
    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletSelectModel.$walletForDetails, walletMock.wallet1),
    });

    await allSettled(renameWalletModel.events.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.setForm, { scope, params: { name: newName } });
    await allSettled(renameWalletModel.$walletForm.submit, { scope });

    expect(scope.getState(walletSelectModel.$walletForDetails)?.name).toEqual(newName);
    expect(scope.getState(walletModel.$wallets).find((w) => w.id === walletMock.wallet1.id)?.name).toEqual(newName);
  });
});
