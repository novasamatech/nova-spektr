import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { SigningType, type Wallet, WalletType } from '@/shared/core';
import { walletModel } from '@/entities/wallet';
import { walletSelectModel } from '../wallet-select-model';

describe('wallet-select-model', () => {
  const wallets: Wallet[] = [
    {
      id: 1,
      signingType: SigningType.POLKADOT_VAULT,
      type: WalletType.POLKADOT_VAULT,
      isActive: true,
      name: 'My PV',
      accounts: [],
    },
    {
      id: 2,
      signingType: SigningType.WALLET_CONNECT,
      type: WalletType.WALLET_CONNECT,
      isActive: false,
      name: 'My WC',
      accounts: [],
    },
  ];

  const newWallet: Wallet = {
    id: 3,
    signingType: SigningType.POLKADOT_VAULT,
    type: WalletType.SINGLE_PARITY_SIGNER,
    isActive: false,
    name: 'My new SPS',
    accounts: [],
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should change $activeWallet on walletSelected', async () => {
    jest.spyOn(storageService.wallets, 'readAll').mockResolvedValue(wallets);
    jest.spyOn(storageService.wallets, 'updateAll').mockResolvedValue([1]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(2);

    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, wallets),
    });

    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
    await allSettled(walletSelectModel.events.walletSelected, { scope, params: 2 });
    expect(scope.getState(walletModel.$activeWallet)).toEqual({ ...wallets[1], isActive: true });
  });

  test('should explicitly set $activeWallet if there is no active wallet', async () => {
    const inactiveWallets = wallets.map(wallet => ({ ...wallet, isActive: false }));

    jest.spyOn(storageService.wallets, 'readAll').mockResolvedValue(inactiveWallets);
    jest.spyOn(storageService.wallets, 'updateAll').mockResolvedValue([]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(inactiveWallets[0].id);

    const scope = fork();

    expect(scope.getState(walletModel.$activeWallet)).toEqual(undefined);
    await allSettled(walletModel.__test.$rawWallets, { scope, params: inactiveWallets });
    expect(scope.getState(walletModel.$activeWallet)).toEqual({ ...inactiveWallets[0], isActive: true });
  });

  test('should not explicitly set $activeWallet if there is an active wallet', async () => {
    const spyRead = jest.spyOn(storageService.wallets, 'readAll');
    const spyUpdateAll = jest.spyOn(storageService.wallets, 'updateAll');
    const spyUpdate = jest.spyOn(storageService.wallets, 'update');

    const scope = fork();

    expect(scope.getState(walletModel.$activeWallet)).toEqual(undefined);
    await allSettled(walletModel.__test.$rawWallets, { scope, params: wallets });

    expect(spyRead).not.toHaveBeenCalled();
    expect(spyUpdateAll).not.toHaveBeenCalled();
    expect(spyUpdate).not.toHaveBeenCalled();
    expect(scope.getState(walletModel.$activeWallet)).toEqual(wallets[0]);
  });

  test('should set $activeWallet on $activeWallet removed, respect wallet groups', async () => {
    const extendedWallets = wallets.concat(newWallet);

    jest.spyOn(storageService.wallets, 'readAll').mockResolvedValue([wallets[0]]);
    jest.spyOn(storageService.wallets, 'updateAll').mockResolvedValue([1]);
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(newWallet.id);

    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, extendedWallets),
    });

    expect(scope.getState(walletModel.$activeWallet)).toEqual(extendedWallets[0]);
    await allSettled(walletModel.__test.$rawWallets, { scope, params: extendedWallets.slice(1) });
    expect(scope.getState(walletModel.$activeWallet)).toEqual({ ...extendedWallets[2], isActive: true });
  });
});
