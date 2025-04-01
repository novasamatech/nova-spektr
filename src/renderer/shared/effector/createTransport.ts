import { type StoreWritable, createEffect, createEvent, createStore, is, restore, sample, scopeBind } from 'effector';
import mitt from 'mitt';
import { readonly } from 'patronum';

import { type DataStream, createStream } from './createStream';
import { series } from './series';

// transport

type Config<State, Params, Response> = {
  state: NoInfer<State | StoreWritable<State>>;
  resource: Resource<Params, State, Response>;
  write(state: State, result: State, params: Params): State;
  store?: StoreAdapter<NoInfer<State>>;
};

export const createTransport = <Params, State, Response>({
  state,
  resource,
  write,
}: Config<State, Params, Response>) => {
  const $store = is.store(state) ? state : createStore(state);
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

type Resource<Params, State, Response> = {
  read(params: Params): Response;
  map(response: Response, callback: (value: State) => void): Promise<void>;
};

// subscription

type SubscribeParams<Params, State> = {
  key(params: Params): string;
  subscribe: (params: Params, stream: DataStream<State>) => VoidFunction;
};

const createDynamicResource = <Params, Value>({
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
      stream.on('closed', () => {
        streams.delete(k);
        unsubscribe();
      });

      return stream;
    },
    async map(stream, callback) {
      for await (const result of stream) {
        callback(result);
      }
    },
  };
};

// fetch

type FetchParams<Params, State> = {
  key(params: Params): string;
  request(params: Params): State | Promise<State>;
};

const createStaticResource = <Params, Value>({
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

// store adapter

type StoreAdapter<Value, Draft = Value> = {
  read(): Promise<Value>;
  create(value: Draft): Promise<Value>;
  update(value: Value): Promise<Value>;
  delete(value: Value): Promise<Value>;
};

type LocalStorageStoreParams<Value> = {
  key: string;
  fallback: Value;
  update(state: Value, result: Value): Value;
  delete(state: Value, result: Value): Promise<Value>;
};

const localStorageStore = <Value>(params: LocalStorageStoreParams<Value>): StoreAdapter<Value> => {
  const read = () => {
    try {
      const json = localStorage.getItem(params.key);
      if (json) {
        return JSON.parse(json);
      }
      return params.fallback;
    } catch {
      return params.fallback;
    }
  };

  const create = (value: Value) => {
    const json = JSON.stringify(value);
    localStorage.setItem(params.key, json);
    return Promise.resolve(value);
  };

  const update = async (value: Value) => {
    const prev = await read();
    return create(params.update(prev, value));
  };

  const deleteValue = async (value: Value) => {
    const prev = await read();
    const updated = await params.delete(prev, value);
    return update(updated);
  };

  return {
    read,
    create,
    update,
    delete: deleteValue,
  };
};

// test

const events = mitt<{ data: number[] }>();
const localStorageStore = localStorageStore<number[]>({ key: 'store' });

const subscribeResource = createDynamicResource<{ test: 1 }, number[]>({
  key: ({ test }) => test.toString(),
  subscribe(_params, stream) {
    const fn = (data: number[]) => {
      stream.resume();
      stream.push(data);
      stream.pause();
    };

    events.on('data', fn);

    return () => {
      events.off('data', fn);
    };
  },
});

const { $: $subscriptionStore, request: subscribe } = createTransport({
  state: [],
  resource: subscribeResource,
  store: localStorageStore,
  write(state, result) {
    return [...state, ...result];
  },
});

const fetchResource = createStaticResource<{ test: 1 }, number[]>({
  key: ({ test }) => test.toString(),
  request({ test }) {
    return Promise.resolve([test]);
  },
});

const { $: $fetchStore, request } = createTransport({
  state: [],
  resource: fetchResource,
  store: localStorageStore,
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
