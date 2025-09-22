import { attach, sample } from 'effector';
import { createGate } from 'effector-react';

import { WalletType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { accountSync, identity } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const flow = createGate();

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

  $identityPending: requestIdentityFx.pending,
  requestIdentity: requestIdentityFx,
};
