import { attach, combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type PolkadotVaultGroup, type VaultBaseAccount, WalletType } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountSync, identity } from '@/domains/network';
import { type WalletCreateParams, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { findExistingVaultWallet } from '../lib/findExistingVaultWallet';

const flow = createGate();

const seedScanned = createEvent<AccountId>();
const openExistingWallet = createEvent();

const $scannedRootAccountId = createStore<AccountId | null>(null)
  .on(seedScanned, (_, accountId) => accountId)
  .reset(flow.close);

const $existingWallet = combine(walletModel.$allWallets, $scannedRootAccountId, findExistingVaultWallet);

sample({
  clock: sample({ clock: openExistingWallet, source: $existingWallet }).filter({ fn: nonNullable }),
  fn: wallet => wallet.id,
  target: [walletSelect.select, flow.close],
});

const requestIdentityFx = attach({ effect: identity.request });

const createSingleshard = createEvent<WalletCreateParams<VaultBaseAccount, PolkadotVaultGroup>>();

// Guarded here, not only in the UI: a duplicate must never reach the wallet model.
sample({
  clock: createSingleshard,
  source: $existingWallet,
  filter: nullable,
  fn: (_, params) => params,
  target: walletModel.events.createSingleshard,
});

// TODO form should react on actual wallet create flow,
sample({
  clock: walletModel.events.createSingleshard,
  target: accountSync.syncAccounts,
});

const createWalletDone = walletModel.createWallet.doneData.filter({ fn: nonNullable });
// TODO form should react on actual wallet create flow,
sample({
  clock: createWalletDone,
  filter: ({ wallet }) => wallet.type === WalletType.POLKADOT_VAULT,
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

sample({
  clock: createWalletDone,
  target: accountSync.syncAccounts,
});

export const pairingFormModel = {
  flow,

  $existingWallet,
  seedScanned,
  openExistingWallet,
  createSingleshard,

  $identityPending: requestIdentityFx.pending,
  requestIdentity: requestIdentityFx,
};
