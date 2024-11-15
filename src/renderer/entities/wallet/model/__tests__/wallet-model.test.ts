import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
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
    jest.spyOn(storageService.accounts, 'readAll').mockResolvedValue(walletMock.accounts);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(1);

    const scope = fork();

    await allSettled(walletModel.events.walletStarted, { scope });
    expect(scope.getState(walletModel.$allWallets)).toEqual(wallets);
    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
  });

  test('should update $allWallets on walletRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel._test.$allWallets, wallets),
    });

    await allSettled(walletModel.events.walletRemoved, { scope, params: removedWallet.id });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel._test.$allWallets)).toEqual(remainingWallets);
  });

  test('should update $allWallets on walletsRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'deleteAll').mockResolvedValue([1]);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel._test.$allWallets, wallets),
    });

    await allSettled(walletModel.events.walletsRemoved, { scope, params: [removedWallet.id] });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel._test.$allWallets)).toEqual(remainingWallets);
  });

  test('should update $wallets and $hiddenWallets when $allWallets is updated', async () => {
    const wallets = walletMock.getWallets(0);
    const hiddenWallet = wallets[2];
    const visibleWallets = wallets.filter((wallet) => !wallet?.isHidden);

    const scope = fork();

    await allSettled(walletModel._test.$allWallets, { scope, params: wallets });

    expect(scope.getState(walletModel.$hiddenWallets)).toEqual([hiddenWallet]);
    expect(scope.getState(walletModel.$wallets)).toEqual(visibleWallets);
  });
});
