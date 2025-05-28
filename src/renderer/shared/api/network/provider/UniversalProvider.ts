import noop from 'lodash/noop';
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

const TIMEOUT = 3500;
const RECONNECT_DELAY = 3500;

class UniversalProvider {
  readonly #endpoints: string[] = [];
  #endpointIndex = 0;

  readonly #timeout: number = TIMEOUT;
  readonly #reconnectDelay: number = RECONNECT_DELAY;
  readonly #maxReconnectAttempts = 2;
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

  constructor(endpoints: string[], timeout = TIMEOUT) {
    this.#timeout = timeout;
    this.#endpoints = endpoints;
  }

  connect() {
    if (nonNullable(this.#socket)) return;

    this.#attemptToConnect();
  }

  disconnect() {
    if (nullable(this.#socket)) return;

    console.info(`Disconnecting from URL: ${this.#socket.url}`);

    this.#socket.removeEventListener('close', this.#closeHandler);
    this.#socket.removeEventListener('error', this.#errorHandler);
    this.#socket.removeEventListener('message', this.#messageHandler);

    if (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING) {
      this.#socket.close(1000, 'Internal disconnect');
    }

    this.#socket = null;
    this.#reconnectAttempts = 0;
    this.#clearReconnectTimer();
    this.#updateStatus({ type: 'close', event: null });
  }

  send(message: string) {
    if (nullable(this.#socket)) return;

    if (this.#socket.readyState === WebSocket.CONNECTING) {
      this.#messageQueue.push(message);
    } else if (this.#socket.readyState === WebSocket.OPEN) {
      this.#socket.send(message);
    } else {
      throw new Error('WebSocket is not connected or connecting');
    }
  }

  switch(_endpoint?: string) {}

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
    this.#clearReconnectTimer();

    this.#createWebSocket(this.#nextEndpoint)
      .then((socket) => {
        this.#socket = socket;

        this.#openHandler();

        this.#socket.addEventListener('close', this.#closeHandler);
        this.#socket.addEventListener('error', this.#errorHandler);
        this.#socket.addEventListener('message', this.#messageHandler);
      })
      .catch((error) => {
        console.error('WebSocket connection error: ', error);

        this.#attemptToReconnect();
      });
  }

  #createWebSocket(url: URL): Promise<WebSocket> {
    if (!url.origin.startsWith('ws://') && !url.origin.startsWith('wss://')) {
      throw new Error('Invalid WebSocket URL protocol');
    }

    this.#updateStatus({ type: 'connecting', uri: url.href });

    return new Promise((resolve, reject) => {
      let socket: WebSocket;
      let timeoutToken: ReturnType<typeof setTimeout> | undefined = undefined;

      try {
        // Failing URL cannot be caught via try_catch
        socket = new WebSocket(url);
      } catch {
        reject(new Error('WebSocket initialization failed'));
        return;
      }

      const initialCleanup = () => {
        clearTimeout(timeoutToken);
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('error', onError);
      };

      const forceSocketClose = () => {
        try {
          socket.addEventListener('error', noop, { once: true });
          socket.close(1000, 'Timeout disconnect');
        } catch {
          // skip error
        }
      };

      const onOpen = () => {
        initialCleanup();
        resolve(socket);
      };

      const onError = (event: Event | null) => {
        initialCleanup();

        if (event === null) {
          socket.close();
        }

        this.#updateStatus({ type: event ? 'error' : 'close', event: null });

        // Delay rejection for error cases to allow status propagation
        setTimeout(() => reject(new Error('Could not establish connection')), event ? 300 : 0);
      };

      timeoutToken = setTimeout(() => {
        initialCleanup();
        forceSocketClose();

        this.#updateStatus({ type: 'error', event: { type: 'timeout' } as Event });
        reject(new Error('Timeout disconnect'));
      }, this.#timeout);

      socket.addEventListener('open', onOpen);
      socket.addEventListener('error', onError);
    });
  }

  #clearReconnectTimer() {
    if (nullable(this.#reconnectTimer)) return;

    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }

  #attemptToReconnect() {
    if (this.#reconnectAttempts >= this.#maxReconnectAttempts) {
      console.info('Max reconnection attempts reached, switching the endpoint');

      this.disconnect();
      this.#endpointIndex++;
      this.#attemptToConnect();
    } else {
      const delay = this.#reconnectDelay * Math.pow(2, ++this.#reconnectAttempts - 1);

      this.#reconnectTimer = setTimeout(() => this.#attemptToConnect(), delay);
    }
  }

  #openHandler = () => {
    this.#updateStatus({ type: 'open', uri: this.#socket?.url ?? '' });
    this.#reconnectAttempts = 0;
    this.#flushMessageQueue();
  };

  #closeHandler = (event: CloseEvent | null = null) => {
    this.#updateStatus({ type: 'close', event });
    this.#attemptToReconnect();
  };

  #errorHandler = (event: Event | null = null) => {
    this.#updateStatus({ type: 'error', event });
    this.#attemptToReconnect();
  };

  #messageHandler = (event: MessageEvent) => {
    this.#events.emit('message', event.data);
  };

  #updateStatus(data: Status) {
    this.#status = data;
    this.#events.emit('status', data);
  }

  #flushMessageQueue() {
    for (const message of this.#messageQueue) {
      this.send(message);
    }

    this.#messageQueue = [];
  }

  get #nextEndpoint() {
    const nextEndpoint = this.#endpoints.at(this.#endpointIndex % this.#endpoints.length);

    return new URL(nextEndpoint ?? '');
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
 * @param chainId Chain ID
 * @param args RpcConfig
 *
 * @returns {Object}
 */
export function getUniversalProvider(chainId: ChainId, ...args: ConstructorParameters<typeof UniversalProvider>) {
  return ProvidersMap.get(chainId) ?? new UniversalProvider(...args);
}
