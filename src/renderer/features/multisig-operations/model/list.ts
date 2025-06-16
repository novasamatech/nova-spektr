import { sample } from 'effector';

import { multisigOperation } from '@/domains/network';

import { multisigOperationsFeatureStatus } from './status';

sample({
  clock: multisigOperationsFeatureStatus.running,
  target: [multisigOperation.subscribe, multisigOperation.subscribeEvents],
});

sample({
  clock: multisigOperationsFeatureStatus.stopped,
  target: [multisigOperation.unsubscribe, multisigOperation.unsubscribeEvents],
});

export const operationsModel = {
  $operations: multisigOperation.$list,
  $pending: multisigOperationsFeatureStatus.isStarting,
  $fulfilled: multisigOperationsFeatureStatus.isRunning,
};
