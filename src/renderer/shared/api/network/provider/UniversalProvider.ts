import mitt from 'mitt';

import { type ChainId } from '@/shared/core';

type RpcConfig = {
  endpoints: string[];
  timeout?: number;
  handlers: {
    connecting: () => void;
    connected: () => void;
    disconnected: () => void;
    error: () => void;
  };
};

const ProvidersMap = new Map<ChainId, UniversalProvider>();

class UniversalProvider {
  readonly #chainId: ChainId;
  readonly #events = mitt();

  constructor(chainId: ChainId, config: RpcConfig) {
    this.#chainId = chainId;

    // TODO: handle config
    this.#events.on('connecting', config.handlers.connecting);
    console.log('config ', config);
  }

  send(message: string) {
    console.log(`MSG OUT: ${message}`);
  }

  disconnect() {
    console.log('Disconnect to UniversalProvider ', this.#chainId);
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  switch(config: any) {
    console.log('Switched');
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  connect(config: any) {
    console.log('Connecting to UniversalProvider', this.#chainId);
  }

  getStatus() {
    return 'Status';
  }
}

/**
 * Provider that orchestrate WebSocket connection for PAPI and PJS running at
 * the same time
 *
 * @param args Chain ID and RpcConfig
 *
 * @returns {Object}
 */
export function createUniversalProvider(...args: ConstructorParameters<typeof UniversalProvider>): UniversalProvider {
  return ProvidersMap.get(args[0]) ?? new UniversalProvider(...args);
}
