import { IndexableType, Table } from 'dexie';

import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import { ConnectionDS, IConnectionStorage } from './common/types';

export const useConnectionStorage = (db: Table<ConnectionDS>): IConnectionStorage => ({
  getConnection: (chainId: ChainId): Promise<ConnectionDS | undefined> => {
    return db.get({ chainId });
  },

  getConnections: (): Promise<ConnectionDS[]> => {
    return db.toArray();
  },

  addConnection: (connection: Connection): Promise<IndexableType> => {
    return db.add(connection);
  },

  addConnections: (connections: Connection[]): Promise<IndexableType> => {
    return db.bulkAdd(connections);
  },

  updateConnection: (connection: Connection): Promise<IndexableType> => {
    return db.update(connection, { ...connection });
  },

  changeConnectionType: (connection: Connection, type: ConnectionType): Promise<IndexableType> => {
    return db.update(connection, { connectionType: type });
  },

  clearConnections: (): Promise<void> => {
    return db.clear();
  },
});
