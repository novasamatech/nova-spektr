import { IndexableType } from 'dexie';

import { db } from './storage';
import { Connection, ConnectionType, IConnectionStorage } from './common/types';
import { HexString } from '@renderer/domain/types';

export const useConnectionStorage = (): IConnectionStorage => ({
  getConnection: (chainId: HexString): Promise<Connection | undefined> => {
    return db.connections.get({ chainId });
  },
  getConnections: (): Promise<Connection[]> => {
    return db.connections.toArray();
  },
  addConnection: (chainId: HexString, type: ConnectionType): Promise<IndexableType> => {
    return db.connections.add({ chainId, type });
  },
  addConnections: (connections: Connection[]): Promise<IndexableType> => {
    return db.connections.bulkAdd(connections);
  },
  changeConnectionType: (connection: Connection, type: ConnectionType): Promise<IndexableType> => {
    return db.connections.update(connection, { type });
  },
});
