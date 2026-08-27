import { attach, combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { WalletType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountSync, identity } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { findExistingVaultWallet } from '../lib/findExistingVaultWallet';

const flow = createGate();

// Duplicate detection: the scanned public key identifies the device.
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

  $identityPending: requestIdentityFx.pending,
  requestIdentity: requestIdentityFx,
};
