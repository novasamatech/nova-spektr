import { cloneDeep } from 'lodash';

import { type Multisig, type MultisigEvent } from './types';

export const multisigOperationService = {
  isSameMultisig,
  isSameEvent,
  mergeEvents,
  mergeMultisigOperations,
};

function isSameMultisig(a: Multisig, b: Multisig) {
  const isSameCallHash = a.callHash === b.callHash;
  const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;
  const isSameAccount = a.accountId === b.accountId;

  return isSameCallHash && isSameTimepoint && isSameAccount;
}

function isSameEvent(a: MultisigEvent, b: MultisigEvent) {
  const isSameAccount = a.accountId === b.accountId;
  const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;

  return isSameAccount && isSameTimepoint;
}

function mergeEvents(oldEvents: MultisigEvent[], events: MultisigEvent[]) {
  const newEvents = events.filter(e => !oldEvents.some(o => isSameEvent(o, e)));

  return [...oldEvents, ...newEvents];
}

function mergeMultisigOperations(oldMultisigs: Multisig[], newMultisigs: Multisig[]): Multisig[] {
  const result = cloneDeep(oldMultisigs);

  for (const newMultisig of newMultisigs) {
    const oldMultisig = result.find(m => isSameMultisig(m, newMultisig));

    if (oldMultisig) {
      oldMultisig.events = mergeEvents(oldMultisig.events, newMultisig.events);
    } else {
      result.push(newMultisig);
    }
  }

  return result;
}
