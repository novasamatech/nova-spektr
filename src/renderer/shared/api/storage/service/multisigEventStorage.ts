import { MultisigEvent, MultisigTransactionKey } from '@entities/transaction/model/transaction';
import { TMultisigEvent, IMultisigEventStorage, MultisigEventDS, ID } from '../common/types';

export const useMultisigEventStorage = (db: TMultisigEvent): IMultisigEventStorage => ({
  getEvent: (id: ID): Promise<MultisigEventDS | undefined> => {
    return db.get(id);
  },

  getEvents: <T extends MultisigEvent>(where?: Partial<T>): Promise<MultisigEventDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  getEventsByKeys: (keys: MultisigTransactionKey[]): Promise<MultisigEventDS[]> => {
    return db
      .where(['txAccountId', 'txChainId', 'txCallHash', 'txBlock', 'txIndex'])
      .anyOf(keys.map((k) => [k.accountId, k.chainId, k.callHash, k.blockCreated, k.indexCreated]))
      .toArray();
  },

  addEvent: async (event: MultisigEvent): Promise<ID> => {
    return db.add(event);
  },

  updateEvent: (event: MultisigEventDS): Promise<ID> => {
    //@ts-ignore
    return db.update(event.id, event);
  },

  deleteEvent: (id: ID): Promise<void> => {
    //@ts-ignore
    return db.delete([id]);
  },
});
