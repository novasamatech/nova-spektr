import { type StoreWritable, createEffect, createEvent, createStore, is, restore, sample } from 'effector';
import { readonly } from 'patronum';

import { type StorageService } from '@/shared/api/storage/service/storageService';

import { type DataStream } from './createStream';

// transport

type Config<Params, State, Response> = {
  state: NoInfer<State | StoreWritable<State>>;
  resources: Resource<Params, Response>[];
  write(state: State, r: { params: Params; result: Response }): State;
};

export const createTransport = <Params, State, Response>({
  state,
  resources,
  write,
}: Config<Params, State, Response>) => {
  const $store = is.store(state) ? state : createStore(state);
  const changePending = createEvent<boolean>();
  const $pending = restore(changePending, false);

  const requestFx = createEffect(async (params: Params) => {
    for (const resource of resources) {
      const response = await resource.read(params);
      if (response !== false) {
        return response;
      }
    }
    return false;
  });

  const requestDone = requestFx.done.filterMap(({ params, result }) => {
    if (result !== false) {
      return { params, result };
    }
  });

  sample({
    clock: requestDone,
    source: $store,
    fn: write,
    target: $store,
  });

  return {
    $: readonly($store),
    $pending,
    request: requestFx,
  };
};

// resource

type Resource<Params, Response> = {
  read(params: Params): Promise<Response | false>;
  write?(response: Response): void;
  subscribe(params: Params): DataStream<Response>;
};

type FetchParams<Params, Response> = {
  cacheKey?(params: Params): string;
  cacheTtl?: number;
  fn(params: Params): Response | Promise<Response>;
};

const createFetchResource = <Params, Response>({
  cacheKey,
  cacheTtl,
  fn,
}: FetchParams<Params, Response>): Resource<Params, Response> => {
  const cache = new Map<string, { response: Response; until: number }>();

  return {
    async read(params) {
      if (cacheKey && cacheTtl) {
        const key = cacheKey(params);
        const cachedResponse = cache.get(key);
        if (cachedResponse) {
          if (cachedResponse.until < Date.now()) {
            return cachedResponse.response;
          } else {
            cache.delete(key);
          }
        }
      }

      const response = await fn(params);
      if (cacheKey && cacheTtl) {
        const key = cacheKey(params);
        cache.set(key, { response, until: Date.now() + cacheTtl });
      }
      return response;
    },
  };
};

type DbParams<Data extends { id: any }> = {
  storage: StorageService<Data, any>;
};

const createDbResource = <Params, Data extends { id: any }>({ storage }: DbParams<Data>): Resource<any, Data[]> => {
  return {
    async read() {
      return storage.readAll();
    },
  };
};

// test

type Params = { chainId: string };
type Account = {
  chainId: string;
};

const fetchResource = createFetchResource<Params, Account[]>({
  cacheTtl: 60 * 1000,
  cacheKey(params) {
    return params.chainId;
  },
  fn(params) {
    return [{ chainId: params.chainId }];
  },
});

const { $, request } = createTransport<Params, Record<string, Account[]>, Account[]>({
  state: {},
  resources: [fetchResource],
  write(state, { params, result }) {
    const prev = state[params.chainId];
    return {
      ...state,
      [params.chainId]: prev.concat(result),
    };
  },
});
