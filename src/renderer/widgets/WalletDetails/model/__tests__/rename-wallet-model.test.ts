import { fork, allSettled } from 'effector';

import { walletMock } from './mocks/wallet-mock';
import { renameWalletModel } from '../rename-wallet-model';
import { walletModel } from '@entities/wallet';

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
});
