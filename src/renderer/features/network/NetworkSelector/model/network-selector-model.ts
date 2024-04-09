import { createEvent, sample, attach } from 'effector';
import { delay, spread } from 'patronum';

import { networkModel, networkUtils } from '@entities/network';
import { ChainId, ConnectionType, RpcNode } from '@shared/core';

const lightClientSelected = createEvent<ChainId>();
const autoBalanceSelected = createEvent<ChainId>();
const rpcNodeSelected = createEvent<{ chainId: ChainId; node: RpcNode }>();
const chainDisabled = createEvent<ChainId>();

const updateConnectionFx = attach({ effect: networkModel.effects.updateConnectionFx });
const disconnectProviderFx = attach({ effect: networkModel.effects.disconnectProviderFx });

const reconnectProviderFx = attach({ effect: disconnectProviderFx });

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
  clock: chainDisabled,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.DISABLED,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: chainDisabled,
  source: networkModel.$providers,
  fn: (providers, chainId) => ({ chainId, providers }),
  target: disconnectProviderFx,
});

sample({
  clock: updateConnectionFx.doneData,
  source: networkModel.$connections,
  filter: (connection) => Boolean(connection),
  fn: (connections, connection) => ({
    ...connections,
    [connection!.chainId]: connection,
  }),
  target: networkModel.$connections,
});

sample({
  clock: updateConnectionFx.doneData,
  source: networkModel.$providers,
  filter: (_, connection) => {
    return Boolean(connection) && networkUtils.isEnabledConnection(connection!);
  },
  fn: (providers, connection) => {
    const chainId = connection!.chainId;

    return providers[chainId] ? { reconnect: { chainId, providers } } : { start: chainId };
  },
  target: spread({
    start: networkModel.events.chainConnected,
    reconnect: reconnectProviderFx,
  }),
});

sample({
  clock: [disconnectProviderFx.doneData, reconnectProviderFx.doneData],
  source: networkModel.$providers,
  fn: (providers, chainId) => {
    const { [chainId]: _, ...rest } = providers;

    return rest;
  },
  target: networkModel.$providers,
});

delay({
  source: reconnectProviderFx.doneData,
  timeout: 500,
  target: networkModel.events.chainConnected,
});

export const networkSelectorModel = {
  events: {
    lightClientSelected,
    autoBalanceSelected,
    rpcNodeSelected,
    chainDisabled,
  },
};
