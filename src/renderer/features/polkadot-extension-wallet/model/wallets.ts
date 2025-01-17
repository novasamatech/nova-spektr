import { type Wallet as ConnectWallet, getWallets } from '@talismn/connect-wallets';
import { createEffect, createStore, sample } from 'effector';

import { walletModel } from '@/entities/wallet';
import { polkadotExtensionService } from '../service';

import { polkadotExtensionWalletFeature } from './feature';

const $connectedWallets = createStore<ConnectWallet[]>([]);

const $all = walletModel.$wallets.map((wallets) => wallets.filter(polkadotExtensionService.isPolkadotExtensionWallet));
const $polkadot = $all.map((wallets) => wallets.filter((w) => w.extension === 'polkadot-js'));

const requestWalletsFx = createEffect(() =>
  getWallets()
    .filter((e) => e.installed)
    .filter((e) => e.title !== 'Nova Wallet'),
);

sample({
  clock: polkadotExtensionWalletFeature.running,
  target: requestWalletsFx,
});

sample({
  clock: requestWalletsFx.doneData,
  target: $connectedWallets,
});

export const wallets = {
  $connectedWallets,
  $all,
  $polkadot,
};
