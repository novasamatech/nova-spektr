import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
// TODO wallet model should be either in wallets domain or wallets feature
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, accounts } from '@/domains/network';
import { walletModel } from '../wallet-model';

import { walletMock } from './mocks/wallet-mock';

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $allWallets, $activeWallets with data on appStarted', async () => {
    const wallets = walletMock.getWallets(1);

    jest.spyOn(storageService.contacts, 'readAll').mockResolvedValue([]);
    jest.spyOn(storageService.wallets, 'readAll').mockResolvedValue(wallets);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(1);

    const scope = fork({
      handlers: [[accounts.populate, () => walletMock.accounts]],
    });

    await allSettled(walletModel.events.walletStarted, { scope });
    expect(scope.getState(walletModel.$allWallets)).toEqual(wallets);
    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
  });

  test('should update $allWallets on walletRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, wallets],
        [accounts.__test.$list, walletMock.accounts],
      ],
      handlers: [[accounts.deleteAccounts, (accounts: AnyAccount[]) => accounts]],
    });

    await allSettled(walletModel.events.walletRemoved, { scope, params: removedWallet.id });

    expect(scope.getState(walletModel.$allWallets)).toEqual(remainingWallets);
  });

  test('should update $allWallets on walletsRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);
    const accoutsDeleteSpy = jest.fn().mockImplementation((accounts: AnyAccount[]) => accounts);

    jest.spyOn(storageService.wallets, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, wallets],
        [accounts.__test.$list, walletMock.accounts],
      ],
      handlers: [[accounts.deleteAccounts, accoutsDeleteSpy]],
    });

    await allSettled(walletModel.events.walletsRemoved, { scope, params: [removedWallet.id] });

    expect(accoutsDeleteSpy).toHaveBeenCalledWith(removedAccounts);
    expect(scope.getState(walletModel.__test.$rawWallets)).toEqual(remainingWallets);
  });

  test('should update $wallets and $hiddenWallets when $rawWallets is updated', async () => {
    const wallets = walletMock.getWallets(0);
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
