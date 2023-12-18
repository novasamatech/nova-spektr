import type { BaseAccount, ChainAccount, ShardAccount, ChainId } from '@shared/core';

export type RootTuple = [BaseAccount, ChainTuple[]];
export type ChainTuple = [ChainId, Array<ChainAccount | ShardAccount[]>];

export type ChainsMap<T> = {
  [chainId: ChainId]: {
    [key: string]: Array<T>;
  };
};
