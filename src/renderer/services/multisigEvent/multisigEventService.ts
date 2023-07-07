import { useLiveQuery } from 'dexie-react-hooks';

import storage, { MultisigEventDS } from '@renderer/services/storage';
import { IMultisigEventService } from './common/types';
import { AccountId, CallHash, ChainId } from '@renderer/domain/shared-kernel';
import { MultisigEvent } from '@renderer/domain/transaction';

export const useMultisigEvent = (): IMultisigEventService => {
  const multisigEventStorage = storage.connectTo('multisigEvents');

  if (!multisigEventStorage) {
    throw new Error('=== 🔴 Multisig event storage in not defined 🔴 ===');
  }
  const { getEvent, getEvents, addEvent, updateEvent, deleteEvent } = multisigEventStorage;

  const getLiveEvents = <T extends MultisigEvent>(where?: Partial<T>): MultisigEventDS[] => {
    const query = () => {
      try {
        return getEvents(where);
      } catch (error) {
        console.warn('Error trying to get multisig events');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  const getLiveTxEvents = <T extends MultisigEvent>(
    txAccountId: AccountId,
    txChainId: ChainId,
    txCallHash: CallHash,
    txBlock: number,
    txIndex: number,
    where?: Partial<T>,
  ): MultisigEventDS[] => {
    const query = () => {
      try {
        return getEvents({
          ...where,
          txAccountId,
          txChainId,
          txCallHash,
          txBlock,
          txIndex,
        });
      } catch (error) {
        console.warn('Error trying to get multisig events');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [txAccountId, txChainId, txCallHash, txBlock, txIndex], []);
  };

  return {
    getEvent,
    getEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    getLiveEvents,
    getLiveTxEvents,
  };
};
