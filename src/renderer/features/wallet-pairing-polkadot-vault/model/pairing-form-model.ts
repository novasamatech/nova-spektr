import { sample } from 'effector';
import { createGate } from 'effector-react';

import { multisigsModel } from '@/entities/multisig';
import { walletModel } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';

const flow = createGate();

// TODO form should react on actual wallet create flow,
sample({
  // @ts-expect-error This type error will be addressed when the pairing logic is refactored out of the component
  clock: [walletModel.events.singleshardCreated, walletModel.events.multishardCreated],
  fn: ({ accounts }) => accounts,
  target: [proxiesModel.findAllProxies, multisigsModel.request],
});

export const pairingFormModel = {
  flow,
};
