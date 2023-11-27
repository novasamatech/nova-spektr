import { createEffect, createStore, forward } from 'effector';
import keyBy from 'lodash/keyBy';

import { storageService } from '@shared/api/storage';
import { kernelModel, Connection, ChainId } from '@shared/core';

const $connections = createStore<Record<ChainId, Connection>>({});

const populateConnectionsFx = createEffect((): Promise<Connection[]> => {
  return storageService.connections.readAll();
});

const createConnectionFx = createEffect(async (connection: Omit<Connection, 'id'>): Promise<Connection | undefined> => {
  return storageService.connections.create(connection);
});

const updateConnectionFx = createEffect(async ({ id, ...rest }: Connection): Promise<Connection> => {
  await storageService.connections.update(id, rest);

  return { id, ...rest };
});

const deleteConnectionFx = createEffect(async (connectionId: number): Promise<number> => {
  await storageService.connections.delete(connectionId);

  return connectionId;
});

$connections
  .on(populateConnectionsFx.doneData, (_, connections) => {
    return keyBy(connections, 'chainId');
  })
  .on(createConnectionFx.doneData, (state, connection) => {
    return connection
      ? {
          ...state,
          [connection.chainId]: connection,
        }
      : state;
  })
  .on(deleteConnectionFx.doneData, (state, connectionId) => {
    const deletedConnection = Object.values(state).find((c) => c.id === connectionId);

    if (!deletedConnection?.chainId) return state;

    const { [deletedConnection.chainId]: _, ...newConnections } = state;

    return newConnections;
  })
  .on(updateConnectionFx.doneData, (state, connection) => {
    return {
      ...state,
      [connection.chainId]: connection,
    };
  });

forward({
  from: kernelModel.events.appStarted,
  to: populateConnectionsFx,
});

export const connectionModel = {
  $connections,
  effects: {
    createConnectionFx,
    deleteConnectionFx,
    updateConnectionFx,
  },
};
