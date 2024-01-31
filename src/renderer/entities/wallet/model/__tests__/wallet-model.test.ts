import { fork, allSettled } from 'effector';

import { walletModel } from '../wallet-model';
import { walletMock } from './mocks/wallet-mock';
import { storageService } from '@shared/api/storage';

describe('entities/wallet/model/wallet-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $wallets, $accounts, $activeWallets, $activeAccounts with data on appStarted', async () => {
    const wallets = walletMock.getWallets(1);
    const [acc1, acc2] = walletMock.accounts;

    jest.spyOn(storageService.contacts, 'readAll').mockResolvedValue([]);
    jest.spyOn(storageService.wallets, 'readAll').mockResolvedValue(wallets);
    jest.spyOn(storageService.accounts, 'readAll').mockResolvedValue(walletMock.accounts);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(1);

    const scope = fork();

    await allSettled(walletModel.events.walletStarted, { scope });
    expect(scope.getState(walletModel.$wallets)).toEqual(wallets);
    expect(scope.getState(walletModel.$accounts)).toEqual(walletMock.accounts);
    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
    expect(scope.getState(walletModel.$activeAccounts)).toEqual([acc1, acc2]);
  });

  test('should update $wallets, $accounts on watchOnlyCreated', async () => {
    const wallets = walletMock.getWallets(0);
    const { newAccounts, newWallet } = walletMock;

    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(newWallet);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccounts[0]]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(3);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$accounts, walletMock.accounts),
    });

    await allSettled(walletModel.events.watchOnlyCreated, {
      scope,
      params: { wallet: newWallet, accounts: [newAccounts[0]] },
    });

    expect(scope.getState(walletModel.$wallets)).toEqual(wallets.concat(newWallet));
    expect(scope.getState(walletModel.$accounts)).toEqual(walletMock.accounts.concat(newAccounts[0]));
  });

  test('should update $wallets, $accounts on multishardCreated', async () => {
    const wallets = walletMock.getWallets(0);
    const { newAccounts, newWallet } = walletMock;

    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(newWallet);
    jest.spyOn(storageService.accounts, 'create').mockResolvedValue(newAccounts[0]);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccounts[1]]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(3);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$accounts, walletMock.accounts),
    });

    expect(scope.getState(walletModel.$wallets)).toHaveLength(wallets.length);
    await allSettled(walletModel.events.multishardCreated, {
      scope,
      params: { wallet: newWallet, accounts: newAccounts },
    });

    expect(scope.getState(walletModel.$wallets)).toEqual(wallets.concat(newWallet));
    expect(scope.getState(walletModel.$accounts)).toEqual(walletMock.accounts.concat(newAccounts));
  });

  test('should update $wallets, $accounts on multisigAccountUpdated', async () => {
    const updatedAccount = walletMock.accounts[0];
    updatedAccount.name = 'Updated account';

    jest.spyOn(storageService.accounts, 'update').mockResolvedValue(1);

    const scope = fork({
      values: new Map().set(walletModel.$accounts, walletMock.accounts),
    });

    await allSettled(walletModel.events.multisigAccountUpdated, {
      scope,
      params: updatedAccount,
    });

    const upadatedAccounts = [...walletMock.accounts];
    upadatedAccounts[0] = updatedAccount;

    expect(scope.getState(walletModel.$accounts)).toEqual(upadatedAccounts);
  });

  test('should update $wallets, $accounts on removeWallet', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...newWallets] = wallets;

    const newAccounts = walletMock.accounts.filter((a) => a.walletId !== removedWallet.id);
    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$accounts, walletMock.accounts),
    });

    await allSettled(walletModel.events.walletRemoved, {
      scope,
      params: removedWallet.id,
    });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel.$wallets)).toEqual(newWallets);
    expect(scope.getState(walletModel.$accounts)).toEqual(newAccounts);
  });

  test('should update $wallets, $accounts on removeWallets', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...newWallets] = wallets;

    const newAccounts = walletMock.accounts.filter((a) => a.walletId !== removedWallet.id);
    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$accounts, walletMock.accounts),
    });

    await allSettled(walletModel.events.walletsRemoved, {
      scope,
      params: [removedWallet.id],
    });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel.$wallets)).toEqual(newWallets);
    expect(scope.getState(walletModel.$accounts)).toEqual(newAccounts);
  });
});
