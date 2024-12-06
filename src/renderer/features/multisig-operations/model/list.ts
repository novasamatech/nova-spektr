import { sample } from 'effector';

import { multisigDomain } from '@/domains/multisig';

import { multisigOperationsFeatureStatus } from './status';

sample({
  clock: multisigOperationsFeatureStatus.running,
  target: [multisigDomain.multisigs.request, multisigDomain.multisigs.subscribe],
});

sample({
  clock: multisigOperationsFeatureStatus.stopped,
  target: multisigDomain.multisigs.unsubscribe,
});

const $operations = multisigDomain.multisigs.$multisigOperations.map((list) => list ?? {});

export const operationsModel = {
  $operations,

  $pending: multisigOperationsFeatureStatus.isStarting,
  $fulfilled: multisigOperationsFeatureStatus.isRunning,
};
