import { cloneDeep } from 'lodash';

import { type Multisig, type MultisigEvent } from './types';

export const multisigOperationService = {
  isSameMultisig: (a: Multisig, b: Multisig) => {
    const isSameCallHash = a.callHash === b.callHash;
    const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;
    const isSameAccount = a.accountId === b.accountId;

    return isSameCallHash && isSameTimepoint && isSameAccount;
  },

  isSameEvent: (a: MultisigEvent, b: MultisigEvent) => {
    return a.accountId === b.accountId && a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;
  },

  mergeEvents: (oldEvents: MultisigEvent[], newEvents: MultisigEvent[]) => {
    return [...oldEvents, ...newEvents.filter(e => !oldEvents.find(o => multisigOperationService.isSameEvent(o, e)))];
  },

  mergeMultisig: (oldMultisig: Multisig, newMultisig: Multisig) => {
    return {
      ...oldMultisig,
      events: multisigOperationService.mergeEvents(oldMultisig.events, newMultisig.events),
    };
  },

  mergeMultisigOperations: (oldMultisigs: Multisig[], newMultisigs: Multisig[]): Multisig[] => {
    const result = cloneDeep(oldMultisigs);

    for (const newMultisig of newMultisigs) {
      const oldMultisig = result.find(m => multisigOperationService.isSameMultisig(m, newMultisig));

      if (oldMultisig) {
        oldMultisig.events = multisigOperationService.mergeEvents(oldMultisig.events, newMultisig.events);
      } else {
        result.push(newMultisig);
      }
    }

    return result;
  },
};
