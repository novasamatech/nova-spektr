import { allSettled, fork } from 'effector';

import { walletModel } from '../wallet-model';
import { walletMock } from './mocks/wallet-mock';
import { storageService } from '@shared/api/storage';

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $wallets, $activeWallets with data on appStarted', async () => {
    const wallets = walletMock.getWallets(1);

    jest.spyOn(storageService.contacts, 'readAll').mockResolvedValue([]);
    jest.spyOn(storageService.wallets, 'readAll').mockResolvedValue(wallets);
    jest.spyOn(storageService.accounts, 'readAll').mockResolvedValue(walletMock.accounts);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(1);

    const scope = fork();

    await allSettled(walletModel.events.walletStarted, { scope });
    expect(scope.getState(walletModel.$wallets)).toEqual(wallets);
    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
  });

  test('should update $wallets on watchOnlyCreated', async () => {
    const wallets = walletMock.getWallets(0);
    const { newAccounts, newWallet } = walletMock;

    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(newWallet);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccounts[0]]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(3);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    await allSettled(walletModel.events.watchOnlyCreated, {
      scope,
      params: { wallet: newWallet, accounts: [newAccounts[0]] as any[] },
    });

    expect(scope.getState(walletModel.$wallets)).toEqual(wallets.concat({ ...newWallet, accounts: [newAccounts[0]] }));
  });

  test('should update $wallets on multishardCreated', async () => {
    const wallets = walletMock.getWallets(0);
    const { newAccounts, newWallet } = walletMock;

    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(newWallet);
    jest.spyOn(storageService.accounts, 'create').mockResolvedValue(newAccounts[0]);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccounts[1]]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(3);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    expect(scope.getState(walletModel.$wallets)).toHaveLength(wallets.length);
    await allSettled(walletModel.events.multishardCreated, {
      scope,
      params: { wallet: newWallet, accounts: newAccounts as any[] },
    });

    expect(scope.getState(walletModel.$wallets)).toEqual(wallets.concat({ ...newWallet, accounts: newAccounts }));
  });

  test('should update $wallets on walletRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    await allSettled(walletModel.events.walletRemoved, { scope, params: removedWallet.id });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel.$wallets)).toEqual(remainingWallets);
  });

  test('should update $wallets on walletsRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'deleteAll').mockResolvedValue([1]);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    await allSettled(walletModel.events.walletsRemoved, { scope, params: [removedWallet.id] });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel.$wallets)).toEqual(remainingWallets);
  });
});
