import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type AnyAccount, accounts } from '@/domains/network';
import { walletModel } from '../wallet-model';

import { walletMock } from './mocks/wallet-mock';

// TODO wallet model should be either in wallets domain or wallets feature

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $allWallets, $activeWallets with data on appStarted', async () => {
    const wallets = walletMock.getWallets();

    const scope = fork({
      handlers: [
        [accounts.populate, () => walletMock.accounts],
        [walletModel.populate, () => wallets],
      ],
    });

    await allSettled(accounts.populate, { scope });
    await allSettled(walletModel.populate, { scope });
    expect(scope.getState(walletModel.$allWallets)).toEqual(wallets);
  });

  test('should update $allWallets on walletRemoved', async () => {
    const wallets = walletMock.getWallets();
    const [removedWallet, ...remainingWallets] = wallets;

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, wallets],
        [accounts.__test.$list, walletMock.accounts],
      ],
      handlers: [[accounts.deleteAccounts, (accounts: AnyAccount[]) => accounts]],
    });

    await allSettled(walletModel.events.removeWallet, { scope, params: removedWallet!.id });

    expect(scope.getState(walletModel.$allWallets)).toEqual(remainingWallets);
  });

  test('should update $allWallets on walletsRemoved', async () => {
    const wallets = walletMock.getWallets();
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet!.id);
    const accoutsDeleteSpy = jest.fn().mockImplementation((accounts: AnyAccount[]) => accounts);

    jest.spyOn(storageService.wallets, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, wallets],
        [accounts.__test.$list, walletMock.accounts],
      ],
      handlers: [[accounts.deleteAccounts, accoutsDeleteSpy]],
    });

    await allSettled(walletModel.walletsRemoved, { scope, params: [removedWallet!.id] });

    expect(accoutsDeleteSpy).toHaveBeenCalledWith(removedAccounts);
    expect(scope.getState(walletModel.__test.$rawWallets)).toEqual(remainingWallets);
  });

  test('should update $wallets and $hiddenWallets when $rawWallets is updated', async () => {
    const wallets = walletMock.getWallets();
    const hiddenWallet = wallets[2];
    const visibleWallets = wallets.filter((wallet) => !wallet?.isHidden);

    const scope = fork({
      values: [[accounts.__test.$list, walletMock.accounts]],
    });

    await allSettled(walletModel.__test.$rawWallets, { scope, params: wallets });

    expect(scope.getState(walletModel.$hiddenWallets)).toEqual([hiddenWallet]);
    expect(scope.getState(walletModel.$wallets)).toEqual(visibleWallets);
  });
});
