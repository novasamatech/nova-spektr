import { type Wallet as ConnectWallet, type WalletAccount } from '@talismn/connect-wallets';
import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { CryptoType, SigningType, WalletType } from '@/shared/core';
import { waitFor } from '@/shared/effector';
import { nonNullable, nullable, toAccountId, toShortAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { type AnyAccountDraft } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { type ExtensionType, type PolkadotExtensionAccount } from '../types';

import { wallets } from './wallets';

type Step = 'idle' | 'pairing' | 'select' | 'rejected' | 'success';

type ConnectedAccount = WalletAccount & {
  type: 'sr25519' | 'ed25519' | 'ecdsa' | 'ethereum';
};

type AccountDraft = AnyAccountDraft<PolkadotExtensionAccount>;

const reconnect = createEvent();
const create = createEvent<{ name: string; account: AccountDraft }>();

const flow = createGate<{ extension: ExtensionType | null }>({ defaultState: { extension: null } });

const $extensionType = flow.state.map(({ extension }) => extension);
const $wallet = combine(
  $extensionType,
  wallets.$connectedWallets,
  (type, wallets) => wallets.find((w) => w.extensionName === type) ?? null,
);
const $step = createStore<Step>('idle');
const $rawAccounts = createStore<ConnectedAccount[]>([]);

const cryptoTypeMap: Record<ConnectedAccount['type'], CryptoType> = {
  ecdsa: CryptoType.ECDSA,
  ed25519: CryptoType.ED25519,
  ethereum: CryptoType.ETHEREUM,
  sr25519: CryptoType.SR25519,
};

const $accounts = combine($rawAccounts, $extensionType, (accounts, extensionType) => {
  if (nullable(extensionType)) return [];

  return accounts.map<AccountDraft>(({ address, type, name }) => {
    return {
      walletId: 0,
      accountType: 'extension',
      extension: extensionType,
      accountId: toAccountId(address),
      cryptoType: type ? (cryptoTypeMap[type] ?? CryptoType.SR25519) : CryptoType.SR25519,
      name: name ?? toShortAddress(address),
      type: 'universal',
      signingType: SigningType.POLKADOT_EXTENSION,
    };
  });
});

const requestAccessToAccountsFx = createEffect(async (wallet: ConnectWallet) => {
  await wallet.enable('Nova Spektr');

  return wallet.getAccounts() as Promise<ConnectedAccount[]>;
});
const createWalletFx = attach({ effect: walletModel.createWallet });

const receivedEmptyAccountList = requestAccessToAccountsFx.doneData.filter({ fn: (a) => a.length === 0 });
const receivedAccountList = requestAccessToAccountsFx.doneData.filter({ fn: (a) => a.length > 0 });

const readyToPair = waitFor({
  source: flow.open,
  clock: $wallet,
  filter: nonNullable,
  reset: flow.close,
});

const readyToReconnect = waitFor({
  source: reconnect,
  clock: $wallet,
  filter: nonNullable,
  reset: flow.close,
});

sample({
  clock: [readyToPair, readyToReconnect],
  fn: ({ trigger: wallet }) => wallet,
  target: requestAccessToAccountsFx,
});

sample({
  clock: requestAccessToAccountsFx.doneData,
  target: $rawAccounts,
});

sample({
  clock: create,
  fn: ({ account, name }) => {
    return {
      external: false,
      wallet: {
        name: name.trim(),
        extension: account.extension,
        type: WalletType.POLKADOT_EXTENSION,
        signingType: SigningType.POLKADOT_EXTENSION,
      },
      accounts: [account],
    };
  },
  target: createWalletFx,
});

const walletCreated = createWalletFx.doneData.filterMap((r) => r?.wallet?.id);

sample({
  clock: walletCreated,
  fn: () => ({ extension: null }),
  target: flow.close,
});

sample({
  clock: walletCreated,
  fn: () => Paths.ASSETS,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: walletCreated,
  target: walletModel.events.selectWallet,
});

// Steps

sample({
  clock: flow.open,
  fn: () => 'idle' as const,
  target: $step,
});

sample({
  clock: requestAccessToAccountsFx,
  fn: () => 'pairing' as const,
  target: $step,
});

sample({
  clock: [receivedEmptyAccountList, requestAccessToAccountsFx.fail],
  fn: () => 'rejected' as const,
  target: $step,
});

sample({
  clock: receivedAccountList,
  fn: () => 'select' as const,
  target: $step,
});

export const pairingForm = {
  flow,

  $step,
  $accounts,

  create,
  reconnect,
};
