import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ChainID } from '@renderer/domain/shared-kernel';
import { ConnectionDS, IConnectionStorage, TConnection, ID } from './common/types';

export const useConnectionStorage = (db: TConnection): IConnectionStorage => ({
  getConnection: (chainId: ChainID): Promise<ConnectionDS | undefined> => {
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
