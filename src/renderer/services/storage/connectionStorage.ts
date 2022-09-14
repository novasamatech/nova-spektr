import { IndexableType, Table } from 'dexie';

import { ChainId } from '@renderer/domain/shared-kernel';
import { Connection, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
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

  changeConnectionStatus: (connection: Connection, status: ConnectionStatus): Promise<IndexableType> => {
    return db.update(connection, { connectionStatus: status });
  },
});
