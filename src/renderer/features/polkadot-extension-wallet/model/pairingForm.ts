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

// // returns an array of all the injected sources
// // (this needs to be called first, before other requests)
// const allInjected = await web3Enable('my cool dapp');
//
// // returns an array of { address, meta: { name, source } }
// // meta.source contains the name of the extension that provides this account
// const allAccounts = await web3Accounts();
//
// // the address we use to use for signing, as injected
// const SENDER = '5DTestUPts3kjeXSTMyerHihn1uwMfLj8vU8sqF7qYrFabHE';
//
// // finds an injector for an address
// const injector = await web3FromAddress(SENDER);
//
// // sign and send our transaction - notice here that the address of the account
// // (as retrieved injected) is passed through as the param to the `signAndSend`,
// // the API then calls the extension to present to the user and get it signed.
// // Once complete, the api sends the tx + signature via the normal process
// api.tx.balances
//   .transfer('5C5555yEXUcmEJ5kkcCMvdZjUo7NGJiQJMS7vZXEeoMhj3VQ', 123456)
//   .signAndSend(SENDER, { signer: injector.signer }, (status) => { ... });
