import { nullable } from './functions';

/** Lifetime in ms — fixed, or decided per value once it is known. */
export type Ttl<T> = number | ((value: T) => number);

type CachedRecord<T> = {
  expires: number;
  value: T;
};

export const createCache = <K extends PropertyKey, T>({ now: getTs }: { now(): number }) => {
  const records: Map<K, CachedRecord<T>> = new Map();
  const requests: Map<K, Promise<CachedRecord<T>>> = new Map();

  const cache = {
    async get(key: K): Promise<T | null> {
      let record = records.get(key);
      if (nullable(record)) {
        try {
          record = await requests.get(key);
        } catch {
          // do nothing
        }
      }

      if (record) {
        const now = getTs();
        if (now > record.expires) {
          cache.delete(key);
          return null;
        }
      }

      return record?.value ?? null;
    },

    set(key: K, value: T, ttl: Ttl<T>) {
      const now = getTs();
      const record: CachedRecord<T> = {
        expires: now + (typeof ttl === 'function' ? ttl(value) : ttl),
        value,
      };
      records.set(key, record);
      return record;
    },

    setRequest(key: K, request: Promise<T>, ttl: Ttl<T>) {
      const chainedRequest = request
        .then((value) => cache.set(key, value, ttl))
        .finally(() => {
          requests.delete(key);
        });

      requests.set(key, chainedRequest);

      return chainedRequest;
    },

    async setAny(key: K, value: T | Promise<T>, ttl: Ttl<T>) {
      if (value instanceof Promise) {
        return cache.setRequest(key, value, ttl);
      } else {
        return cache.set(key, value, ttl);
      }
    },

    delete(key: K) {
      records.delete(key);
      requests.delete(key);
    },
  };

  return cache;
};
