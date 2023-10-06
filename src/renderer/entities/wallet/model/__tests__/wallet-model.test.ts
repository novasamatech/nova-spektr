import { fork, allSettled } from 'effector';

import { walletModel } from '../wallet-model';
import { Wallet, WalletType, SigningType, kernelModel } from '@renderer/shared/core';
import { storageService } from '@renderer/shared/api/storage';

describe('entities/wallet/model/wallet-model', () => {
  const activeWallet: Wallet = {
    id: 2,
    name: 'My second wallet',
    isActive: true,
    type: WalletType.WATCH_ONLY,
    signingType: SigningType.WATCH_ONLY,
  };

  const wallets: Wallet[] = [
    {
      id: 1,
      name: 'My first wallet',
      isActive: false,
      type: WalletType.MULTISIG,
      signingType: SigningType.MULTISIG,
    },
    activeWallet,
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set $wallets and $activeWallet with data on appStarted', async () => {
    jest.spyOn(storageService.wallets, 'readBulk').mockResolvedValue(wallets);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(activeWallet.id);

    const scope = fork();

    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(walletModel.$wallets)).toEqual(wallets);
    expect(scope.getState(walletModel.$activeWallet)).toEqual(activeWallet);
  });

  test('should set $activeWallet on walletSelected', async () => {
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(1);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$activeWallet, activeWallet),
    });

    await allSettled(walletModel.events.walletSelected, { scope, params: 1 });
    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
  });

  test('should update $wallets and $activeWallet on walletCreated', async () => {
    const nextId = 3;
    jest.spyOn(storageService.wallets, 'create').mockResolvedValue(nextId);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(nextId);

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$activeWallet, activeWallet),
    });

    const payload = {
      name: 'My third wallet',
      type: WalletType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    };
    expect(scope.getState(walletModel.$wallets)).toHaveLength(wallets.length);
    expect(scope.getState(walletModel.$activeWallet)).toEqual(activeWallet);
    await allSettled(walletModel.events.walletCreated, { scope, params: payload });

    expect(scope.getState(walletModel.$wallets)).toHaveLength(wallets.length + 1);
    expect(scope.getState(walletModel.$activeWallet)).toEqual({ id: nextId, isActive: true, ...payload });
  });
});
