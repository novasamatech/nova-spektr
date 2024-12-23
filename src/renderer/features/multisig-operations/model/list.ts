import { sample } from 'effector';

import { multisigDomain } from '@/domains/multisig';

import { multisigOperationsFeatureStatus } from './status';

sample({
  clock: multisigOperationsFeatureStatus.running,
  target: [multisigDomain.operations.requestOperations, multisigDomain.operations.subscribeEvents],
});

sample({
  clock: multisigOperationsFeatureStatus.stopped,
  target: multisigDomain.operations.unsubscribeEvents,
});

export const operationsModel = {
  $operations: multisigDomain.operations.$operations,
  $events: multisigDomain.operations.$events,

  $pending: multisigOperationsFeatureStatus.isStarting,
  $fulfilled: multisigOperationsFeatureStatus.isRunning,
};
