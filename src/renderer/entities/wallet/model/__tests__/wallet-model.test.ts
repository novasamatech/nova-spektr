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

  test('should update $allWallets on watchOnlyCreated', async () => {
    const wallets = walletMock.getWallets(0);
    const { newAccounts, newWallet } = walletMock;

    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(newWallet);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccounts[0]]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(3);

    const scope = fork({
      values: new Map().set(walletModel.$allWallets, wallets),
    });

    await allSettled(walletModel.events.watchOnlyCreated, {
      scope,
      params: { wallet: newWallet, accounts: [newAccounts[0]] as any[] },
    });

    expect(scope.getState(walletModel.$allWallets)).toEqual(
      wallets.concat({ ...newWallet, accounts: [newAccounts[0]] }),
    );
  });

  test('should update $allWallets on multishardCreated', async () => {
    const wallets = walletMock.getWallets(0);
    const { newAccounts, newWallet } = walletMock;

    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(newWallet);
    jest.spyOn(storageService.accounts, 'create').mockResolvedValue(newAccounts[0]);
    jest.spyOn(storageService.accounts, 'createAll').mockResolvedValue([newAccounts[1]]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(3);

    const scope = fork({
      values: new Map().set(walletModel.$allWallets, wallets),
    });

    expect(scope.getState(walletModel.$allWallets)).toHaveLength(wallets.length);
    await allSettled(walletModel.events.multishardCreated, {
      scope,
      params: { wallet: newWallet, accounts: newAccounts as any[] },
    });

    expect(scope.getState(walletModel.$allWallets)).toEqual(wallets.concat({ ...newWallet, accounts: newAccounts }));
  });

  test('should update $allWallets on walletRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'delete').mockResolvedValue(1);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel.$allWallets, wallets),
    });

    await allSettled(walletModel.events.walletRemoved, { scope, params: removedWallet.id });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel.$allWallets)).toEqual(remainingWallets);
  });

  test('should update $allWallets on walletsRemoved', async () => {
    const wallets = walletMock.getWallets(0);
    const [removedWallet, ...remainingWallets] = wallets;

    const removedAccounts = walletMock.accounts.filter((a) => a.walletId === removedWallet.id);

    jest.spyOn(storageService.wallets, 'deleteAll').mockResolvedValue([1]);
    const deleteAccountsSpy = jest.spyOn(storageService.accounts, 'deleteAll').mockResolvedValue([1, 2, 3]);

    const scope = fork({
      values: new Map().set(walletModel.$allWallets, wallets),
    });

    await allSettled(walletModel.events.walletsRemoved, { scope, params: [removedWallet.id] });

    expect(deleteAccountsSpy).toHaveBeenCalledWith(removedAccounts.map((a) => a.id));
    expect(scope.getState(walletModel.$allWallets)).toEqual(remainingWallets);
  });

  test('should update $allWallets on walletHidden', async () => {
    const wallets = walletMock.getWallets(0);
    const hiddenWallet = wallets[0];

    const updateSpy = jest.spyOn(storageService.wallets, 'update').mockResolvedValue(1);

    const scope = fork({
      values: new Map().set(walletModel.$allWallets, wallets),
    });

    await allSettled(walletModel.events.walletHidden, { scope, params: hiddenWallet });

    expect(updateSpy).toHaveBeenCalledWith(1, { isHidden: true });
    expect(scope.getState(walletModel.$allWallets)).toEqual([{ ...hiddenWallet, isHidden: true }, ...wallets.slice(1)]);
  });

  test('should update $allWallets on walletRestore', async () => {
    const wallets = walletMock.getWallets(0);
    const walletToRestore = wallets.find((wallet) => wallet.isHidden)!;

    const updateSpy = jest.spyOn(storageService.wallets, 'update').mockResolvedValue(walletToRestore.id);

    const scope = fork({
      values: new Map().set(walletModel.$allWallets, wallets),
    });

    await allSettled(walletModel.$allWallets, { scope, params: wallets });
    expect(scope.getState(walletModel.$hiddenWallets)).toEqual([walletToRestore]);

    await allSettled(walletModel.events.walletRestored, { scope, params: walletToRestore });

    expect(updateSpy).toHaveBeenCalledWith(walletToRestore.id, { isHidden: false });
    expect(scope.getState(walletModel.$allWallets)).toEqual(
      wallets.map((wallet) => {
        return wallet.id === walletToRestore.id ? { ...wallet, isHidden: false } : wallet;
      }),
    );
  });

  test('should update $wallets and $hiddenWallets when $allWallets is updated', async () => {
    const wallets = walletMock.getWallets(0);
    const hiddenWallet = wallets[2];
    const visibleWallets = wallets.filter((wallet) => !wallet?.isHidden);

    const scope = fork();

    await allSettled(walletModel.$allWallets, { scope, params: wallets });

    expect(scope.getState(walletModel.$hiddenWallets)).toEqual([hiddenWallet]);
    expect(scope.getState(walletModel.$wallets)).toEqual(visibleWallets);
  });
});
