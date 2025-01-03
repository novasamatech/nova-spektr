import { useLiveQuery } from 'dexie-react-hooks';

import { type MultisigEventDS, storage } from '@/shared/api/storage';
import {
  type CallHash,
  type ChainId,
  type MultisigEvent,
  type MultisigTransactionKey,
  type SigningStatus,
} from '@/shared/core';
import { type Task } from '@/shared/lib/hooks/useTaskQueue';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type IMultisigEventService } from './common/types';

type Props = {
  addTask?: (task: Task) => void;
};

export const useMultisigEvent = ({ addTask }: Props): IMultisigEventService => {
  const multisigEventStorage = storage.connectTo('multisigEvents');

  if (!multisigEventStorage) {
    throw new Error('=== 🔴 Multisig event storage in not defined 🔴 ===');
  }
  const { getEvent, getEvents, addEvent, updateEvent, deleteEvent, getEventsByKeys } = multisigEventStorage;

  const getLiveEvents = <T extends MultisigEvent>(where?: Partial<T>): MultisigEventDS[] => {
    const query = () => {
      return getEvents(where).catch(() => {
        console.warn('Error trying to get multisig events');

        return [];
      });
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
      } catch {
        console.warn('Error trying to get multisig events');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [txAccountId, txChainId, txCallHash, txBlock, txIndex], []);
  };

  const getLiveEventsByKeys = (keys: MultisigTransactionKey[]): MultisigEventDS[] => {
    const query = () => {
      return getEventsByKeys(keys).catch(() => {
        console.warn('Error trying to get multisig events');

        return [];
      });
    };

    return useLiveQuery(
      query,
      [
        keys.length,
        keys.length && keys[0].accountId,
        keys.length && keys[0].chainId,
        keys.length && keys[0].callHash,
        keys.length && keys[0].blockCreated,
        keys.length && keys[0].indexCreated,
      ],
      [],
    );
  };

  const addEventWithQueue = (event: MultisigEvent, pendingStatuses: SigningStatus[] = []) => {
    addTask?.(async () => {
      const events = await getEvents({
        txAccountId: event.txAccountId,
        txChainId: event.txChainId,
        txCallHash: event.txCallHash,
        txBlock: event.txBlock,
        txIndex: event.txIndex,
        accountId: event.accountId,
      });

      const oldEvent = events.find((e) => [...pendingStatuses, event.status].includes(e.status));

      if (oldEvent) {
        updateEvent({ ...oldEvent, ...event });
      } else {
        addEvent(event);
      }
    });
  };

  return {
    getEvent,
    getEvents,
    addEvent,
    addEventWithQueue,
    updateEvent,
    deleteEvent,
    getLiveEvents,
    getLiveTxEvents,
    getEventsByKeys,
    getLiveEventsByKeys,
  };
};
