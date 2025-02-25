import { sample } from 'effector';
import { createGate } from 'effector-react';

import { WalletType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { multisigsModel } from '@/entities/multisig';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { proxiesModel } from '@/features/proxies';

const flow = createGate();

// TODO form should react on actual wallet create flow,
sample({
  // @ts-expect-error This type error will be addressed when the pairing logic is refactored out of the component
  clock: [walletModel.events.singleshardCreated, walletModel.events.multishardCreated],
  fn: ({ accounts }) => accounts,
  target: [proxiesModel.findAllProxies, multisigsModel.request],
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
};
