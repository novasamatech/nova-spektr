import { AsyncTaskPool } from './asyncTaskPool';

export { AsyncTaskPool };

export const substrateRpcPool = new AsyncTaskPool({
  /**
   * @see https://github.com/paritytech/polkadot-sdk/blob/49a68132882e58872411c5c0278b13a008b3682b/substrate/client/network/src/service.rs#L585
   */
  poolSize: 32,
  retryCount: 5,
  retryDelay: (retry) => 200 + retry * 50,
});
