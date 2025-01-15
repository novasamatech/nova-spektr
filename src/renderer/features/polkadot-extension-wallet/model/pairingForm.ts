import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { attach, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAccountId, toShortAddress } from '@/shared/lib/utils';
import { type AnyAccountDraft } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { type PolkadotExtensionAccount } from '../types';

type Step = 'idle' | 'pairing' | 'select' | 'rejected' | 'success';

type InjectedExtension = Awaited<ReturnType<typeof web3Enable>>[number];
type InjectedAccountWithMeta = Awaited<ReturnType<typeof web3Accounts>>[number];
type AccountDraft = AnyAccountDraft<PolkadotExtensionAccount>;

const flow = createGate();

const requestPermission = createEvent();
const create = createEvent<{ name: string; account: AccountDraft }>();

const $step = createStore<Step>('idle');
const $extensions = createStore<InjectedExtension[]>([]);
const $rawAccounts = createStore<InjectedAccountWithMeta[]>([]);

const cryptoTypeMap: Record<Required<InjectedAccountWithMeta>['type'], CryptoType> = {
  ecdsa: CryptoType.ECDSA,
  ed25519: CryptoType.ED25519,
  ethereum: CryptoType.ETHEREUM,
  sr25519: CryptoType.SR25519,
};

const $accounts = $rawAccounts.map((accounts) => {
  return accounts.map<AccountDraft>(({ address, type, meta }) => {
    return {
      walletId: 0,
      accountType: 'polkadot_extension',
      accountId: toAccountId(address),
      cryptoType: type ? cryptoTypeMap[type] : CryptoType.SR25519,
      name: meta.name ?? toShortAddress(address),
      type: 'universal',
      signingType: SigningType.POLKADOT_EXTENSION,
    };
  });
});

const getInjectedExtensionsFx = createEffect(() => web3Enable('Nova Spektr'));
const requestAccessToAccountsFx = createEffect(() => web3Accounts());
const createWalletFx = attach({ effect: walletModel.createWallet });

sample({
  clock: requestPermission,
  target: getInjectedExtensionsFx,
});

sample({
  clock: getInjectedExtensionsFx.doneData,
  target: $extensions,
});

sample({
  clock: getInjectedExtensionsFx.doneData,
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
        type: WalletType.POLKADOT_EXTENSION,
        signingType: SigningType.POLKADOT_EXTENSION,
      },
      accounts: [account],
    };
  },
  target: createWalletFx,
});

sample({
  clock: createWalletFx.done,
  target: flow.close,
});

// Steps

sample({
  clock: flow.open,
  fn: () => 'idle' as const,
  target: $step,
});

sample({
  clock: requestPermission,
  fn: () => 'pairing' as const,
  target: $step,
});

sample({
  clock: [getInjectedExtensionsFx.fail, requestAccessToAccountsFx.fail],
  fn: () => 'rejected' as const,
  target: $step,
});

sample({
  clock: requestAccessToAccountsFx.done,
  fn: () => 'select' as const,
  target: $step,
});

export const pairingForm = {
  flow,

  $step,
  $accounts,
  $extensions,

  create,
  requestPermission,
  requestAccessToAccounts: requestAccessToAccountsFx,
};
