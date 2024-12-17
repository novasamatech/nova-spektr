import { createEffect, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type ChainId, type Connection, ConnectionType, type RpcNode } from '@/shared/core';
import { networkModel, networkUtils } from '@/entities/network';

const lightClientSelected = createEvent<ChainId>();
const autoBalanceSelected = createEvent<ChainId>();
const rpcNodeSelected = createEvent<{ chainId: ChainId; node: RpcNode }>();
const networkDisabled = createEvent<ChainId>();

const $reconnectMap = createStore<Record<ChainId, boolean>>({});

const updateConnectionFx = createEffect((connection: Connection): Promise<Connection | undefined> => {
  return storageService.connections.put(connection);
});

sample({
  clock: autoBalanceSelected,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.AUTO_BALANCE,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: lightClientSelected,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.LIGHT_CLIENT,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: rpcNodeSelected,
  source: networkModel.$connections,
  fn: (connections, { chainId, node }) => ({
    ...connections[chainId],
    connectionType: ConnectionType.RPC_NODE,
    activeNode: node,
  }),
  target: updateConnectionFx,
});

sample({
  clock: networkDisabled,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.DISABLED,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: networkDisabled,
  target: networkModel.events.chainDisconnected,
});

sample({
  clock: updateConnectionFx.doneData,
  source: {
    reconnectMap: $reconnectMap,
    connections: networkModel.$connections,
  },
  filter: (connection) => Boolean(connection),
  fn: ({ reconnectMap, connections }, connection) => {
    const chainId = connection!.chainId;
    const update = { ...connections, [chainId]: connection };

    const isOldEnabled = networkUtils.isEnabledConnection(connections[chainId]);
    const isNewEnabled = networkUtils.isEnabledConnection(connection!);
    if (isOldEnabled && isNewEnabled) {
      return { update, reconnectMap: { ...reconnectMap, [chainId]: true } };
    }

    return { update };
  },
  target: spread({
    reconnectMap: $reconnectMap,
    update: networkModel.$connections,
  }),
});

sample({
  clock: updateConnectionFx.doneData,
  source: $reconnectMap,
  filter: (_, connection) => Boolean(connection),
  fn: (reconnectMap, connection) => {
    const chainId = connection!.chainId;

    return reconnectMap[chainId] ? { disconnect: chainId } : { connect: chainId };
  },
  target: spread({
    disconnect: networkModel.events.chainDisconnected,
    connect: networkModel.events.chainConnected,
  }),
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: $reconnectMap,
  filter: (reconnectMap, { status, chainId }) => {
    return reconnectMap[chainId] && networkUtils.isDisconnectedStatus(status);
  },
  fn: (reconnectMap, { chainId }) => {
    const { [chainId]: _, ...rest } = reconnectMap;

    return { reconnectMap: rest, connect: chainId };
  },
  target: spread({
    connect: networkModel.events.chainConnected,
    reconnectMap: $reconnectMap,
  }),
});

export const networkSelectorModel = {
  events: {
    lightClientSelected,
    autoBalanceSelected,
    rpcNodeSelected,
    networkDisabled,
  },
};
