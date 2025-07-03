import { sample } from 'effector';

import { multisigOperation } from '@/domains/network';

import { multisigOperationsFeature } from './feature';

sample({
  clock: multisigOperationsFeature.running,
  target: [multisigOperation.subscribe, multisigOperation.subscribeEvents],
});

sample({
  clock: multisigOperationsFeature.stopped,
  target: [multisigOperation.unsubscribe, multisigOperation.unsubscribeEvents],
});

export const operationsModel = {
  $operations: multisigOperation.$list,
  $pending: multisigOperationsFeature.isStarting,
  $fulfilled: multisigOperationsFeature.isRunning,
};
