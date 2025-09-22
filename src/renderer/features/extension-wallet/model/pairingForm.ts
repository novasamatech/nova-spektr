import { type Wallet as ConnectWallet, type WalletAccount } from '@talismn/connect-wallets';
import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { CryptoType, type HexString, SigningType, WalletType } from '@/shared/core';
import { waitFor } from '@/shared/effector';
import { nonNullable, nullable, toAccountId, toShortAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { type AnyAccountDraft, accountSync } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { navigationModel } from '@/features/navigation';
import {
  type ExtensionAccount,
  type ExtensionChainAccount,
  type ExtensionType,
  type ExtensionUniversalAccount,
} from '../types';

import { wallets } from './wallets';

type Step = 'idle' | 'pairing' | 'select' | 'rejected' | 'success';

type ConnectedAccount = WalletAccount & {
  type: 'sr25519' | 'ed25519' | 'ecdsa' | 'ethereum';
  genesisHash?: HexString | '';
};

type AccountDraft = AnyAccountDraft<ExtensionAccount>;

const reconnect = createEvent();
const create = createEvent<{ name: string; account: AccountDraft }>();

const flow = createGate<{ extension: ExtensionType | null }>({ defaultState: { extension: null } });

const $extensionType = flow.state.map(({ extension }) => extension);
const $wallet = combine(
  $extensionType,
  wallets.$extensionWallets,
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

const WalletTypeFromExtension = (extension: ExtensionType) => {
  switch (extension) {
    case 'polkadot-js':
      return WalletType.POLKADOT_EXTENSION;
    case 'subwallet-js':
      return WalletType.SUBWALLET_EXTENSION;
    case 'talisman':
      return WalletType.TALISMAN_EXTENSION;
  }
};

const $accounts = combine($rawAccounts, $extensionType, (accounts, extensionType) => {
  if (nullable(extensionType)) return [];

  return accounts.map<AccountDraft>(({ address, type, name, genesisHash }) => {
    const isChainAccount = !!genesisHash;

    const baseAccount = {
      walletId: 0,
      accountType: 'extension' as const,
      extension: extensionType,
      accountId: toAccountId(address),
      cryptoType: type ? (cryptoTypeMap[type] ?? CryptoType.SR25519) : CryptoType.SR25519,
      name: name ?? toShortAddress(address),
      type: isChainAccount ? 'chain' : 'universal',
      signingType: SigningType.EXTENSION,
    };

    if (isChainAccount) {
      return {
        ...baseAccount,
        type: 'chain',
        chainId: genesisHash,
      } satisfies AnyAccountDraft<ExtensionChainAccount>;
    }

    return {
      ...baseAccount,
      type: 'universal',
    } satisfies AnyAccountDraft<ExtensionUniversalAccount>;
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
      wallet: {
        name: name.trim(),
        type: WalletTypeFromExtension(account.extension),
        signingType: SigningType.EXTENSION,
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
  target: walletSelect.select,
});

sample({
  clock: walletCreated,
  target: accountSync.syncAccounts,
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
