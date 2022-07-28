import { IndexableType, PromiseExtended } from 'dexie';

import db, { Connection } from '@renderer/services/storage';
import { HexString } from '@renderer/domain/types';
import { ConnectionType } from './common/types';

export type { Connection } from '@renderer/services/storage';

interface IConnectionStorage {
  getConnection: (chainId: HexString) => PromiseExtended<Connection | undefined>;
  getConnections: () => PromiseExtended<Connection[]>;
  addConnection: (chainId: HexString, type: ConnectionType) => PromiseExtended<IndexableType>;
  addConnections: (connections: Connection[]) => PromiseExtended<IndexableType>;
  changeConnectionType: (connection: Connection, type: ConnectionType) => PromiseExtended<IndexableType>;
}

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
