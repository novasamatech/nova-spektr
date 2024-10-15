import { createEffect, createEvent, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type ChainId, type Connection, type RpcNode } from '@/shared/core';
import { networkModel } from '@/entities/network';

const flowFinished = createEvent<{ chainId: ChainId; node: RpcNode }>();

const rpcNodeRemoved = createEvent<{ chainId: ChainId; node: RpcNode }>();

const $nodeToRemove = createStore<RpcNode | null>(null);

const updateConnectionFx = createEffect(async ({ id, ...rest }: Connection): Promise<Connection | undefined> => {
  const connectionId = await storageService.connections.update(id, rest);

  return connectionId ? { id, ...rest } : undefined;
});

sample({
  clock: rpcNodeRemoved,
  fn: ({ node }) => node,
  target: $nodeToRemove,
});

sample({
  clock: rpcNodeRemoved,
  source: networkModel.$connections,
  fn: (connections, { chainId, node }) => {
    const { customNodes, ...rest } = connections[chainId];

    const filteredNodes = customNodes.filter((custom) => custom.url !== node.url);

    return { ...rest, customNodes: filteredNodes };
  },
  target: updateConnectionFx,
});

sample({
  clock: updateConnectionFx.doneData,
  source: networkModel.$connections,
  filter: (_, connection) => Boolean(connection),
  fn: (connections, connection) => ({
    ...connections,
    [connection!.chainId]: connection,
  }),
  target: networkModel.$connections,
});

sample({
  clock: updateConnectionFx.doneData,
  source: $nodeToRemove,
  filter: (node, connection) => node !== null && Boolean(connection),
  fn: (node, connection) => ({
    chainId: connection!.chainId,
    node: node!,
  }),
  target: flowFinished,
});

export const removeCustomRpcModel = {
  events: {
    rpcNodeRemoved,
  },

  output: {
    flowFinished,
  },
};
