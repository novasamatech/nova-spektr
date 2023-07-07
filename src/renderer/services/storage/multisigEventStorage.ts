import { MultisigEvent } from '@renderer/domain/transaction';
import { TMultisigEvent, IMultisigEventStorage, MultisigEventDS, ID } from './common/types';

export const useMultisigEventStorage = (db: TMultisigEvent): IMultisigEventStorage => ({
  getEvent: (id: ID): Promise<MultisigEventDS | undefined> => {
    return db.get(id);
  },

  getEvents: <T extends MultisigEvent>(where?: Partial<T>): Promise<MultisigEventDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
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
