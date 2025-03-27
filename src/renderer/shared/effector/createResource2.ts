import Dexie from 'dexie';

import Promise = Dexie.Promise;
import { type Effect } from 'effector';

import { type DataStream } from './createResource';

const localhostAdapter = <Value>({ key, ttl }: { key: string; ttl: number }): CacheAdapter<Value> => {
  return {
    read(): Promise<Value> {},
    write(value: Value): Promise<Value> {},
    ttl,
  };
};

type CacheAdapter<Value, Draft = Value> = {
  read(): Promise<Value>;
  write(value: Draft): Promise<Value>;
  ttl: number;
};

type Resource<Params, Value> = {
  read(params: Params, stream: DataStream<Value>): VoidFunction;
};


type Transport<Value, Draft, Params> = {
  request: Effect<Params, Value>;
};

type Config<Value, Draft, Params> = {
  resource: Resource<Params, Value>;
  cache: CacheAdapter<Value, Draft>;
};

const createTransport = <Value, Draft, Params>(config: Config<Value, Draft, Params>) => {};


const createFetchResource = <Params, Value>({ request,  }: { request: (params: Params; abort: AbortSignal) => Promise<Value> }): Resource<Params, Value> => {
  return  {
    read(params: Params, stream: DataStream<Value>): VoidFunction {
      const abor
    }
  }
}
