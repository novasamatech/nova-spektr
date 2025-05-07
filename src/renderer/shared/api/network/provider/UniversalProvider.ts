import mitt, { type Emitter } from 'mitt';

import { type ChainId } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';

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

class UniversalProvider {
  // readonly #endpoints: string[] = [];
  // #endpointIndex = 0;

  // @ts-expect-error not used
  readonly #timeout: number;
  readonly #reconnectDelay = 1_000;
  readonly #maxReconnectAttempts = 3;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectAttempts = 0;

  #messageQueue: string[] = [];

  #socket: WebSocket | null = null;
  #status: Status = { type: 'close', event: null };

  readonly #events: Emitter<RegistryEvents> = mitt();
  readonly #subscribers = new Map<keyof RegistryEvents, VoidFunction[]>();

  // ==================================================================
  // =========================== Public API ===========================
  // ==================================================================

  constructor(endpoints: string[], timeout = DEFAULT_TIMEOUT) {
    this.#timeout = timeout;
    // this.#endpoints = endpoints;

    this.connect();
  }

  connect() {
    // const nextEndpoint = endpoint || this.#endpoints.at(this.#endpointIndex % this.#endpoints.length);

    if (nonNullable(this.#socket)) {
      throw new Error('Web Socket already exists');
    }

    // console.info(`Trying to connect URL: ${nextEndpoint}`);
    this.#attemptToConnect();
  }

  disconnect() {
    if (nullable(this.#socket)) {
      throw new Error('WebSocket is not initialized');
    }

    console.info(`Disconnecting from URL: ${this.#socket.url}`);

    this.#socket.removeEventListener('open', this.#openListener);
    this.#socket.removeEventListener('close', this.#closeListener);
    this.#socket.removeEventListener('error', this.#errorListener);
    this.#socket.removeEventListener('message', this.#messageListener);

    if (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING) {
      this.#socket.close(1000, 'Internal disconnect');
    }

    this.#socket = null;
    this.#reconnectAttempts = 0;
    this.#unsubscribeAll();
    this.#clearReconnectTimer();
    this.#updateStatus({ type: 'close', event: null });
  }

  send(message: string) {
    if (nullable(this.#socket)) {
      throw new Error('Connection is not initialized');
    }

    if (this.#socket.readyState === WebSocket.CONNECTING) {
      this.#messageQueue.push(message);
    } else if (this.#socket.readyState === WebSocket.OPEN) {
      this.#socket.send(message);
    } else {
      throw new Error('WebSocket is not connected or connecting');
    }
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

  // ==================================================================
  // ============================ Internals ===========================
  // ==================================================================

  #attemptToConnect() {
    this.#updateStatus({ type: 'connecting', uri: this.#socket?.url ?? '' });
    this.#clearReconnectTimer();

    try {
      this.#socket = new WebSocket('ws://localhost:8080');
      // this.#socket = new WebSocket(nextEndpoint);

      this.#socket.addEventListener('open', this.#openListener);
      this.#socket.addEventListener('close', this.#closeListener);
      this.#socket.addEventListener('error', this.#errorListener);
      this.#socket.addEventListener('message', this.#messageListener);

      // this.#endpointIndex++;
    } catch (error) {
      console.error('WebSocket connection error: ', error);

      this.#updateStatus({ type: 'error', event: null });
      this.#attemptToReconnect();
    }
  }

  #clearReconnectTimer() {
    if (nullable(this.#reconnectTimer)) return;

    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }

  #attemptToReconnect() {
    if (this.#reconnectAttempts >= this.#maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, switching the endpoint');
      // TODO: try another endpoint
      this.disconnect();
    } else {
      const delay = this.#reconnectDelay * Math.pow(2, ++this.#reconnectAttempts - 1);

      this.#reconnectTimer = setTimeout(this.#attemptToConnect, delay);
    }
  }

  #openListener = () => {
    this.#updateStatus({ type: 'open', uri: this.#socket?.url ?? '' });
    this.#reconnectAttempts = 0;
    this.#flushMessageQueue();
  };

  #closeListener = (event: CloseEvent | null = null) => {
    this.#updateStatus({ type: 'close', event });
    this.#attemptToReconnect();
  };

  #errorListener = (event: Event | null = null) => {
    this.#updateStatus({ type: 'error', event });
    this.#attemptToReconnect();
  };

  #messageListener = (event: MessageEvent) => {
    this.#events.emit('message', event.data);
  };

  #updateStatus(data: Status) {
    this.#status = data;
    this.#events.emit('status', data);
  }

  #unsubscribeAll() {
    for (const unsubFns of this.#subscribers.values()) {
      for (const fn of unsubFns) {
        fn();
      }
    }

    this.#subscribers.clear();
  }

  #flushMessageQueue() {
    for (const message of this.#messageQueue) {
      this.send(message);
    }

    this.#messageQueue = [];
  }

  get status() {
    return this.#status;
  }
}

/**
 * ProvidersMap that holds UniversalProviders for a specific chain
 */
const ProvidersMap = new Map<ChainId, UniversalProvider>();

/**
 * Provider that orchestrate WebSocket connection for PAPI and PJS running at
 * the same time
 *
 * @param args Chain ID and RpcConfig
 *
 * @returns {Object}
 */
export function getUniversalProvider(chainId: ChainId, ...args: ConstructorParameters<typeof UniversalProvider>) {
  return ProvidersMap.get(chainId) ?? new UniversalProvider(...args);
}
