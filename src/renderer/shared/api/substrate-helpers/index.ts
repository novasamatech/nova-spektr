import { AsyncTaskPool } from './asyncTaskPool';

export const substrateRpcPool = new AsyncTaskPool({
  /**
   * @see https://github.com/paritytech/substrate/blob/master/client/executor/wasmtime/src/runtime.rs#L380
   */
  poolSize: 32,
  retryCount: 5,
  retryDelay: (retry) => 200 + retry * 50,
});
