import { type StoreWritable, createEffect, createEvent, createStore, is, restore, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { type DataStream, createStream } from './createStream';
import { series } from './series';

// type CacheAdapter<Value, Draft = Value> = {
//   read(): Promise<Value>;
//   write(value: Draft): Promise<Value>;
//   ttl: number;
// };

type Resource<Params, State, Response> = {
  read(params: Params): Response;
  map(response: Response, callback: (value: State) => void): Promise<void>;
};

type Config<State, Params, Response> = {
  store: NoInfer<State | StoreWritable<State>>;
  resource: Resource<Params, State, Response>;
  write(state: State, result: State, params: Params): State;
};

export const createTransport = <Params, State, Response>({
  store,
  resource,
  write,
}: Config<State, Params, Response>) => {
  const $store = is.store(store) ? store : createStore(store);
  const changePending = createEvent<boolean>();
  const pushToStore = createEvent<{ result: State; params: Params }>();
  const $pending = restore(changePending, false);

  const requestFx = createEffect((params: Params) => {
    const stream = createStream<State>();
    stream.on('opened', () => changePending(true));
    stream.on('paused', () => changePending(false));
    stream.on('closed', () => changePending(false));
    return resource.read(params);
  });

  const mapFx = createEffect(({ params, response }: { params: Params; response: Response }) => {
    const bounded = scopeBind(pushToStore);
    return resource.map(response, result => bounded({ result, params }));
  });

  sample({
    clock: requestFx.done,
    fn({ params, result: response }) {
      return { params, response };
    },
    target: mapFx,
  });

  sample({
    clock: pushToStore,
    source: $store,
    fn(state, { params, result }) {
      return write(state, result, params);
    },
    target: $store,
  });

  return {
    $: readonly($store),
    $pending,
    request: requestFx,
  };
};

// resource

type SubscribeParams<Params, State> = {
  key(params: Params): string;
  subscribe: (params: Params, stream: DataStream<State>) => VoidFunction;
};

const createSubscriptionResource = <Params, Value>({
  key,
  subscribe,
}: SubscribeParams<Params, Value>): Resource<Params, Value, DataStream<Value>> => {
  const streams = new Map<string, DataStream<Value>>();

  return {
    read(params) {
      const k = key(params);
      let stream = streams.get(k);
      if (!stream) {
        stream = createStream();
        streams.set(k, stream);
      }

      stream.open();
      const unsubscribe = subscribe(params, stream);
      stream.on('closed', unsubscribe);

      return {
        ...stream,
        stop: () => {
          streams.delete(k);
          stream.close();
        },
      };
    },
    async map(stream, callback) {
      for await (const result of stream) {
        callback(result);
      }
    },
  };
};

type FetchParams<Params, State> = {
  key(params: Params): string;
  request(params: Params): State | Promise<State>;
};

const createFetchResource = <Params, Value>({
  key,
  request,
}: FetchParams<Params, Value>): Resource<Params, Value, Promise<Value>> => {
  const requests = new Map<string, Promise<Value>>();

  return {
    async read(params) {
      const k = key(params);
      let promise = requests.get(k);
      if (!promise) {
        const r = request(params);
        promise = (r instanceof Promise ? r : Promise.resolve(r)).finally(() => requests.delete(k));
      }

      return promise;
    },
    map(response, callback) {
      return response.then(result => {
        callback(result);
      });
    },
  };
};

// test

const subscribeResource = createSubscriptionResource<{ test: 1 }, number[]>({
  key: ({ test }) => test.toString(),
  subscribe({ test }, stream) {
    stream.resume();
    stream.push([test]);
    stream.pause();

    return () => {
      // unsubscribe
    };
  },
});

const { request: subscribe } = createTransport({
  store: [],
  resource: subscribeResource,
  write(state, result) {
    return [...state, ...result];
  },
});

const fetchResource = createFetchResource<{ test: 1 }, number[]>({
  key: ({ test }) => test.toString(),
  request({ test }) {
    return Promise.resolve([test]);
  },
});

const { request } = createTransport({
  store: [],
  resource: fetchResource,
  write(state, result) {
    return [...state, ...result];
  },
});

const handle = createEvent<number[]>();
sample({
  clock: subscribe.doneData,
  target: series(handle),
});
sample({
  clock: request.doneData,
  target: handle,
});
