import { IndexableType, Table } from 'dexie';

import { ChainId } from '@renderer/domain/shared-kernel';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ConnectionDS, IConnectionStorage } from './common/types';

export const useConnectionStorage = (db: Table<ConnectionDS>): IConnectionStorage => ({
  getConnection: (chainId: ChainId): Promise<ConnectionDS | undefined> => {
    return db.get({ chainId });
  },

  getConnections: (): Promise<ConnectionDS[]> => {
    return db.toArray();
  },

  addConnection: (chainId: ChainId, type: ConnectionType): Promise<IndexableType> => {
    return db.add({ chainId, type });
  },

  addConnections: (connections: Connection[]): Promise<IndexableType> => {
    return db.bulkAdd(connections);
  },

  changeConnectionType: (connection: Connection, type: ConnectionType): Promise<IndexableType> => {
    return db.update(connection, { type });
  },
});
