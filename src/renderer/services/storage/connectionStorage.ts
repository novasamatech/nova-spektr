import { IndexableType, PromiseExtended } from 'dexie';

import { db } from './storage';
import { Connection, ConnectionType, IConnectionStorage } from './types';
import { HexString } from '@renderer/domain/types';

export const useConnectionStorage = (): IConnectionStorage => ({
  getConnection: (chainId: HexString): PromiseExtended<Connection | undefined> => {
    return db.connections.get({ chainId });
  },
  getConnections: (): PromiseExtended<Connection[]> => {
    return db.connections.toArray();
  },
  addConnection: (chainId: HexString, type: ConnectionType): PromiseExtended<IndexableType> => {
    return db.connections.add({ chainId, type });
  },
  addConnections: (connections: Connection[]): PromiseExtended<IndexableType> => {
    return db.connections.bulkAdd(connections);
  },
  changeConnectionType: (connection: Connection, type: ConnectionType): PromiseExtended<IndexableType> => {
    return db.connections.update(connection, { type });
  },
});
