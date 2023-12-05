import { createStore, createEvent, createEffect, sample } from 'effector';

import type { ShardAccount, Chain, ChainId } from '@shared/core';
import { chainsService } from '@entities/network';

const shardsSelected = createEvent<ShardAccount[]>();
const shardsCleared = createEvent();

const $shards = createStore<ShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);

const chainSetFx = createEffect((chainId: ChainId): Chain | undefined => {
  return chainsService.getChainById(chainId);
});

sample({
  clock: shardsSelected,
  target: $shards,
});

sample({
  clock: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards) => shards[0].chainId,
  target: chainSetFx,
});

sample({
  clock: chainSetFx.doneData,
  filter: (chain): chain is Chain => Boolean(chain),
  target: $chain,
});

export const vaultDetailsModel = {
  $shards,
  $chain,
  events: {
    shardsSelected,
    shardsCleared,
  },
};
