import { allSettled, fork } from 'effector';

import { type Wallet, WalletType } from '@/shared/core';
import { walletModel } from '@/entities/wallet';

import { walletSelect } from './model';

const wallets: Wallet[] = [
  {
    id: 1,
    type: WalletType.POLKADOT_VAULT,
    name: 'My PV',
    accounts: [],
  },
  {
    id: 2,
    type: WalletType.WALLET_CONNECT,
    name: 'My WC',
    accounts: [],
  },
];

const newWallet: Wallet = {
  id: 3,
  type: WalletType.SINGLE_PARITY_SIGNER,
  name: 'My new SPS',
  accounts: [],
};

describe('walletSelect', () => {
  it('should derive $selectedWallet from wallets', async () => {
    const scope = fork({
      handlers: [[walletModel.populate, () => wallets]],
    });

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(null);

    await allSettled(walletModel.populate, { scope });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets[0]);
  });

  it('should change $selectedWallet on selectWallet', async () => {
    const scope = fork();

    await allSettled(walletModel.__test.$rawWallets, { scope, params: wallets });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets[0]);

    await allSettled(walletSelect.select, { scope, params: 2 });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets[1]);
  });

  it('should explicitly set $selectedWallet if there is no selected wallet', async () => {
    const scope = fork({
      handlers: [[walletModel.populate, () => wallets]],
    });

    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(null);

    await allSettled(walletModel.populate, { scope });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(wallets.at(0));
  });

  it('should set $selectedWallet on $selectedWallet removed', async () => {
    const initialWallets = wallets.concat(newWallet);
    const [_deletedWallet, ...restWallets] = initialWallets;

    const scope = fork();

    await allSettled(walletModel.__test.$rawWallets, { scope, params: initialWallets });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(initialWallets.at(0));

    await allSettled(walletModel.__test.$rawWallets, { scope, params: restWallets });
    expect(scope.getState(walletSelect.$selectedWallet)).toEqual(initialWallets.at(1));
  });
});
