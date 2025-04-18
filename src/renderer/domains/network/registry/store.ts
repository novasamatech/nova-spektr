import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { WsEvent } from 'polkadot-api/ws-provider/web';

import { type Chain, type ChainId } from '@/shared/core';
import { series } from '@/shared/effector';

import { getChainRegistry } from './service/chainRegistry';

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'close';

const WS_EVENT_TO_READABLE: Record<WsEvent, ConnectionStatus> = {
  [WsEvent.CONNECTING]: 'connecting',
  [WsEvent.CONNECTED]: 'connected',
  [WsEvent.ERROR]: 'error',
  [WsEvent.CLOSE]: 'close',
};

const startNetworks = createEvent();
const statusChanged = createEvent<{ chainId: ChainId; type: WsEvent }>();

const $connectionStatuses = createStore<Record<ChainId, ConnectionStatus>>({});

const createConnectionFx = createEffect((chain: Chain) => {
  const registry = getChainRegistry();

  registry.on(chain.chainId, 'status', scopeBind(statusChanged, { safe: true }));

  registry.connect(
    chain.chainId,
    chain.nodes.map(n => n.url),
  );
});

sample({
  clock: statusChanged,
  source: $connectionStatuses,
  fn: (statuses, { chainId, type }) => ({
    ...statuses,
    [chainId]: WS_EVENT_TO_READABLE[type],
  }),
  target: $connectionStatuses,
});

sample({
  clock: startNetworks,
  fn: () => {
    const TEMPORARY_CHAINS = [
      '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3', // dot
      '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008', // dot_ppl
      '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2', // dot_col
    ];

    return getChainRegistry().chainsList.filter(c => TEMPORARY_CHAINS.includes(c.chainId));
  },
  target: series(createConnectionFx, { parallel: true }),
});

export const registry = {
  $connectionStatuses,

  startNetworks,
};
