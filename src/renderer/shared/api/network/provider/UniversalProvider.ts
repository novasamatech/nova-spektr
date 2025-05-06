import mitt, { type Emitter } from 'mitt';

import { type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';

type WsConnecting = {
  type: 'connecting';
  uri: string;
};
type WsOpen = {
  type: 'open';
  uri: string;
};
type WsError = {
  type: 'error';
  event: Event | null;
};
type WsClose = {
  type: 'close';
  event: CloseEvent | null;
};

type Status = WsConnecting | WsOpen | WsError | WsClose;

type RegistryEvents = {
  status: Status;

  message: {
    event: MessageEvent;
  };
};

const DEFAULT_TIMEOUT = 3500;

/**
 * ProvidersMap that holds UniversalProviders for a specific chain
 */
const ProvidersMap = new Map<ChainId, UniversalProvider>();

class UniversalProvider {
  readonly #chainId: ChainId;
  // @ts-expect-error not used
  readonly #timeout: number;

  readonly #endpoints: string[] = [];
  #endpointIndex: number;

  #socket: WebSocket | null = null;
  #status: Status = { type: 'close', event: null };

  readonly #events: Emitter<RegistryEvents> = mitt();
  readonly #subscribers = new Map<keyof RegistryEvents, VoidFunction[]>();

  constructor(chainId: ChainId, endpoints: string[], timeout = DEFAULT_TIMEOUT) {
    this.#chainId = chainId;
    this.#timeout = timeout;
    this.#endpoints = endpoints;
    this.#endpointIndex = 0;

    this.connect();
  }

  connect(endpoint?: string) {
    const nextEndpoint = endpoint || this.#endpoints.at(this.#endpointIndex % this.#endpoints.length);

    if (nullable(nextEndpoint)) {
      throw new Error('No valid RPC URL provided');
    }

    console.info(`Trying to connect URL: ${nextEndpoint}, chainId: ${this.#chainId} `);

    // TODO: handle reconnect with timeout
    try {
      this.#socket = new WebSocket(nextEndpoint);
      this.#onConnecting();

      this.#socket.addEventListener('open', this.#onOpen);
      this.#socket.addEventListener('close', this.#onClose);
      this.#socket.addEventListener('error', this.#onError);
      this.#socket.addEventListener('message', this.#onMessage);

      this.#endpointIndex++;
    } catch (error) {
      console.error('WebSocket initialization error: ', error);
      this.#updateStatus({ type: 'error', event: null });
    }
  }

  #onConnecting() {
    this.#updateStatus({ type: 'connecting', uri: this.#socket?.url ?? '' });
  }

  #onOpen() {
    this.#updateStatus({ type: 'open', uri: this.#socket?.url ?? '' });
  }

  #onClose(event: CloseEvent) {
    this.#updateStatus({ type: 'close', event });
  }

  #onError(event: Event) {
    this.#updateStatus({ type: 'error', event });
  }

  #onMessage(event: MessageEvent) {
    this.#events.emit('message', event.data);
  }

  disconnect() {
    if (nullable(this.#socket)) {
      throw new Error('Connection is not initialized');
    }

    console.log(`Disconnecting from URL: ${this.#socket.url}, chainId: ${this.#chainId} `);

    this.#socket.close();

    this.#socket.removeEventListener('open', this.#onOpen);
    this.#socket.removeEventListener('close', this.#onClose);
    this.#socket.removeEventListener('error', this.#onError);
    this.#socket.removeEventListener('message', this.#onMessage);

    this.#socket = null;
  }

  send(message: string) {
    if (nullable(this.#socket)) {
      throw new Error('Connection is not initialized');
    }

    this.#socket.send(message);
  }

  /*
   * Switch to a specific endpoint or use the next one from initial endpoints
   */
  switch(endpoint?: string) {
    console.log('Switched to ', endpoint);
  }

  on<K extends keyof RegistryEvents>(key: K, cb: (value: RegistryEvents[K]) => void) {
    this.#events.on(key, cb);
    const unsub = () => this.#events.off(key, cb);

    const subscriber = this.#subscribers.get(key);

    if (nullable(subscriber)) {
      this.#subscribers.set(key, [unsub]);
    } else {
      subscriber.push(unsub);
    }
  }

  off<K extends keyof RegistryEvents>(key: K, listener: VoidFunction) {
    const subscriber = this.#subscribers.get(key);

    if (nullable(subscriber)) {
      throw new Error("Doesn't contain this event listener");
    }

    this.#events.off(key, listener);
    subscriber.filter((fn) => fn !== listener);
  }

  #updateStatus(data: Status) {
    this.#status = data;
    this.#events.emit('status', data);
  }

  get status() {
    return this.#status;
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
export function getUniversalProvider(...args: ConstructorParameters<typeof UniversalProvider>) {
  return ProvidersMap.get(args[0]) ?? new UniversalProvider(...args);
}
