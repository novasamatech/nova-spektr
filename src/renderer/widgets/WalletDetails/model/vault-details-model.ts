import { createStore, createEvent, createEffect, sample } from 'effector';

import type { ShardAccount, Chain, ChainId, ChainAccount, ID } from '@shared/core';
import { chainsService } from '@entities/network';
import { storageService } from '@shared/api/storage';
import { walletModel } from '@entities/wallet';

const shardsSelected = createEvent<ShardAccount[]>();
const shardsCleared = createEvent();
const keysRemoved = createEvent<Array<ChainAccount | ShardAccount>>();
const keysAdded = createEvent<Array<ChainAccount | ShardAccount>>();

const $shards = createStore<ShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);

const chainSetFx = createEffect((chainId: ChainId): Chain | undefined => {
  return chainsService.getChainById(chainId);
});

const removeKeysFx = createEffect((ids: ID[]): Promise<ID[] | undefined> => {
  return storageService.accounts.deleteAll(ids);
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

sample({
  clock: keysRemoved,
  filter: (keys) => keys.length > 0,
  fn: (keys) => keys.map((key) => key.id),
  target: removeKeysFx,
});

sample({
  clock: removeKeysFx.doneData,
  source: walletModel.$accounts,
  filter: (_, ids): ids is number[] => Boolean(ids),
  fn: (accounts, ids) => {
    const idsMap = ids!.reduce<Record<ID, boolean>>((acc, id) => ({ ...acc, [id]: true }), {});

    return accounts.filter((account) => !idsMap[account.id]);
  },
  target: walletModel.$accounts,
});

export const vaultDetailsModel = {
  $shards,
  $chain,
  events: {
    shardsSelected,
    shardsCleared,
    keysRemoved,
    keysAdded,
  },
};
