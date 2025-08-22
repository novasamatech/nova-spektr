import { createAsyncTaskPool } from '@/shared/lib/utils';

export const substrateRpcPool = createAsyncTaskPool({
  /**
   * @see https://github.com/paritytech/polkadot-sdk/blob/49a68132882e58872411c5c0278b13a008b3682b/substrate/client/network/src/service.rs#L585
   */
  poolSize: 31,
  retryCount: 5,
  retryDelay: (retry) => 50 + retry * 50,
});
