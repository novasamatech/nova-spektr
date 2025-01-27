import { allSettled, fork } from 'effector';

import { SigningType, type Wallet, WalletType } from '@/shared/core';
import { walletModel } from '@/entities/wallet';

import { walletSelect } from './model';

describe('walletSelect', () => {
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

  it('should derive $selectedWallet from wallets', async () => {
    const scope = fork({
      handlers: [
        [walletModel.populate, () => wallets],
        [walletModel.updateWallet, (wallet: Wallet) => wallet],
      ],
    });

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(null);

    await allSettled(walletModel.populate, { scope });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets[0]);
  });

  it('should change $selectedWallet on selectWallet', async () => {
    const scope = fork({
      values: [[walletModel.__test.$rawWallets, wallets]],
      handlers: [[walletModel.updateWallet, (wallet: Wallet) => wallet]],
    });

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets[0]);

    await allSettled(walletSelect.select, { scope, params: 2 });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual({ ...wallets[1], isActive: true });
  });

  it('should explicitly set $selectedWallet if there is no selected wallet', async () => {
    const inactiveWallets = wallets.map(wallet => ({ ...wallet, isActive: false }));

    const scope = fork({
      handlers: [
        [walletModel.populate, () => inactiveWallets],
        [walletModel.updateWallet, (wallet: Wallet) => wallet],
      ],
    });

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(null);

    await allSettled(walletModel.populate, { scope });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual({ ...inactiveWallets[0], isActive: true });
  });

  it('should set $selectedWallet on $selectedWallet removed', async () => {
    const extendedWallets = wallets.concat(newWallet);

    const scope = fork({
      handlers: [
        [walletModel.populate, () => extendedWallets],
        [walletModel.updateWallet, (wallet: Wallet) => wallet],
      ],
    });

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(null);

    await allSettled(walletModel.populate, { scope });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets[0]);

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(extendedWallets[0]);
    await allSettled(walletModel.__test.$rawWallets, { scope, params: extendedWallets.slice(1) });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual({ ...extendedWallets[2], isActive: true });
  });
});
