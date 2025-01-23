import { type Wallet as ConnectWallet, getWallets } from '@talismn/connect-wallets';
import { createEffect, createStore, sample } from 'effector';

import { walletModel } from '@/entities/wallet';
import { polkadotExtensionService } from '../service';

import { extensionWalletFeature } from './feature';

const $extensionWallets = createStore<ConnectWallet[]>([]);

const $polkadot = walletModel.$wallets.map((wallets) =>
  wallets.filter(polkadotExtensionService.isPolkadotExtensionWallet),
);
const $talisman = walletModel.$wallets.map((wallets) =>
  wallets.filter(polkadotExtensionService.isTalismanExtensionWallet),
);
const $subWallet = walletModel.$wallets.map((wallets) =>
  wallets.filter(polkadotExtensionService.isSubWalletExtensionWallet),
);

const $polkadotJsExtensionWallet = $extensionWallets.map(
  (l) => l.find((e) => e.extensionName === 'polkadot-js') ?? null,
);
const $talismanExtensionWallet = $extensionWallets.map((l) => l.find((e) => e.extensionName === 'talisman') ?? null);
const $subWalletExtensionWallet = $extensionWallets.map(
  (l) => l.find((e) => e.extensionName === 'subwallet-js') ?? null,
);

const requestWalletsFx = createEffect(() =>
  getWallets()
    .filter((e) => e.installed)
    .filter((e) => e.title !== 'Nova Wallet'),
);

sample({
  clock: extensionWalletFeature.running,
  target: requestWalletsFx,
});

sample({
  clock: requestWalletsFx.doneData,
  target: $extensionWallets,
});

export const wallets = {
  $polkadot,
  $talisman,
  $subWallet,

  $extensionWallets,
  $polkadotJsExtensionWallet,
  $talismanExtensionWallet,
  $subWalletExtensionWallet,
};
