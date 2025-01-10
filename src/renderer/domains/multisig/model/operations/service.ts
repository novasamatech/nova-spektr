import { merge } from '@/shared/lib/utils';

import { type MultisigEvent, type MultisigOperation } from './types';

const isSameMultisig = (a: MultisigOperation, b: MultisigOperation) => {
  const isSameCallHash = a.callHash === b.callHash;
  const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;
  const isSameAccount = a.accountId === b.accountId;

  return isSameCallHash && isSameTimepoint && isSameAccount;
};

const isSameEvent = (a: MultisigEvent, b: MultisigEvent) => {
  const isSameAccount = a.accountId === b.accountId;
  const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;

  return isSameAccount && isSameTimepoint;
};

const mergeEvents = (oldEvents: MultisigEvent[], events: MultisigEvent[]) =>
  merge({
    a: oldEvents,
    b: events,
    mergeBy: a => [a.callHash, a.blockCreated, a.indexCreated, a.chainId, a.accountId],
    filter: (a, b) => !isSameEvent(a, b),
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });

const mergeMultisigOperations = (
  oldMultisigs: MultisigOperation[],
  newMultisigs: MultisigOperation[],
): MultisigOperation[] =>
  merge({
    a: oldMultisigs,
    b: newMultisigs,
    mergeBy: a => [a.callHash, a.blockCreated, a.indexCreated, a.chainId, a.accountId],
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });

const getOperationEvents = (operation: MultisigOperation, events: MultisigEvent[]) => {
  return events.filter(
    event =>
      event.accountId === operation.accountId &&
      event.chainId === operation.chainId &&
      event.callHash === operation.callHash,
  );
};

export const operationsService = {
  isSameMultisig,
  isSameEvent,

  mergeEvents,
  mergeMultisigOperations,

  getOperationEvents,
};
