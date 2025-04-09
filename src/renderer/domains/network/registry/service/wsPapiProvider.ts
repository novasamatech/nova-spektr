import { type StatusChange, type WsJsonRpcProvider } from 'polkadot-api/ws-provider/web';

import { createUniversalProvider } from '@/shared/api/network';
import { nullable } from '@/shared/lib/utils';

/**
 * Create WS provider for PAPI. Use UniversalProvider internally to handle
 * WebSocket connection. WsJsonRpcProvider extends JsonRpcProvider that's being
 * used by createClient
 *
 * @param args Chain ID and RpcConfig
 *
 * @returns {Object}
 */
export function createWsPapiProvider(...args: Parameters<typeof createUniversalProvider>): WsJsonRpcProvider {
  const provider = createUniversalProvider(...args);

  const send = (message: string) => {
    console.log(`MSG OUT: ${message}`);
    provider.send(message);
  };

  const disconnect = () => {
    console.log(`DISCONNECTED`);
    provider.disconnect();
  };

  const switchFn = (uri?: string) => {
    if (nullable(uri)) return;

    console.log(`Switch: ${uri}`);
    provider.switch(uri);
  };

  const getStatus = (): StatusChange => {
    const status = provider.getStatus();

    // TODO: apply formatting to align with - StatusChange
    return status as unknown as StatusChange;
  };

  return Object.assign(() => ({ send, disconnect }), { switch: switchFn, getStatus });
}
