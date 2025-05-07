import {
  type StatusChange,
  WsEvent,
  type WsJsonRpcProvider,
  type WsProviderConfig,
} from 'polkadot-api/ws-provider/web';

import { getUniversalProvider } from '@/shared/api/network';
import { type ChainId } from '@/shared/core';

/**
 * Create WS provider for PAPI. Use UniversalProvider internally to handle
 * WebSocket connection. WsJsonRpcProvider extends JsonRpcProvider that's being
 * used by createClient
 *
 * @param chainId Chain ID
 * @param config Original WsProvider config
 *
 * @returns {Object}
 */
export function getWsPapi(chainId: ChainId, config: WsProviderConfig): WsJsonRpcProvider {
  const endpoints = config.endpoints.map(endpoint => (typeof endpoint === 'string' ? endpoint : endpoint.uri));
  const provider = getUniversalProvider(chainId, endpoints);

  const getFormattedStatus = (status: typeof provider.status): StatusChange => {
    switch (status.type) {
      case 'connecting':
        return { type: WsEvent.CONNECTING, uri: status.uri };
      case 'open':
        return { type: WsEvent.CONNECTED, uri: status.uri };
      case 'error':
        return { type: WsEvent.ERROR, event: status.event };
      case 'close':
        return { type: WsEvent.CLOSE, event: status.event };
      default:
        return { type: WsEvent.CLOSE, event: null };
    }
  };

  // const jsonRpcMessage = <T extends object>(msg: T) => {
  //   return JSON.stringify({ jsonrpc: '2.0', ...msg });
  // };

  provider.on('status', status => {
    config.onStatusChanged?.(getFormattedStatus(status));
  });

  const send = (message: string) => {
    provider.send(message);
  };

  const disconnect = () => {
    provider.disconnect();
  };

  const switchFn = (uri?: string) => {
    provider.switch(uri);
  };

  const getStatus = () => {
    return getFormattedStatus(provider.status);
  };

  return Object.assign(() => ({ send, disconnect }), { switch: switchFn, getStatus });
}
