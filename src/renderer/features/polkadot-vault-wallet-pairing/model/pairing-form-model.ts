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

// TODO form should react on actual wallet create flow,
sample({
  clock: walletModel.createWallet.doneData.filter({ fn: nonNullable }),
  filter: ({ wallet }) => wallet.type === WalletType.POLKADOT_VAULT,
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

export const pairingFormModel = {
  flow,

  $identityPending: requestIdentityFx.pending,
  requestIdentity: requestIdentityFx,
};
