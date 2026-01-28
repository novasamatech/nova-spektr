import { type Done, persist as idbPersist } from '@effector-storage/idb-keyval';
import { type Store, type Unit } from 'effector';

/**
 * Persist effector store to IndexedDB using spektr-cache database.
 *
 * We use a separate database from Dexie ('spektr') to avoid schema conflicts.
 * Dexie manages the main 'spektr' database with its own versioning, while
 * effector-storage uses 'spektr-cache' for reactive store persistence.
 */
export function persist<T>({ store, key, done }: { store: Store<T>; key: string; done?: Unit<Done<T>> }) {
  return idbPersist({
    store,
    key,
    done,
    dbName: 'spektr-cache',
    storeName: 'effector',
  });
}

export type { Done };
