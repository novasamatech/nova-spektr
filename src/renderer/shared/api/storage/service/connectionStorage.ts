import { Connection, ConnectionType } from '@shared/core';
import { ConnectionDS, IConnectionStorage, TConnection, ID } from '../common/types';
import type { ChainId } from '@shared/core';

export const useConnectionStorage = (db: TConnection): IConnectionStorage => ({
  getConnection: (chainId: ChainId): Promise<ConnectionDS | undefined> => {
    return db.get({ chainId });
  },

  getConnections: (): Promise<ConnectionDS[]> => {
    return db.toArray();
  },

  addConnection: (connection: Connection): Promise<ID> => {
    return db.add(connection);
  },

  addConnections: (connections: Connection[]): Promise<ID> => {
    return db.bulkAdd(connections);
  },

  updateConnection: (connection: Connection): Promise<number> => {
    return db.update(connection, { ...connection });
  },

  changeConnectionType: (connection: Connection, type: ConnectionType): Promise<number> => {
    return db.update(connection, { connectionType: type });
  },

  clearConnections: (): Promise<void> => {
    return db.clear();
  },
});
