import { sample } from 'effector';
import { createGate } from 'effector-react';

import { walletModel } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';

const flow = createGate();

// TODO form should react on actual wallet create flow,
sample({
  clock: [walletModel.events.singleshardCreated, walletModel.events.multishardCreated],
  target: proxiesModel.findAllProxies,
});

export const pairingFormModel = {
  flow,
};
