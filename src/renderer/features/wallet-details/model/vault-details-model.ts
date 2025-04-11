import { attach, createEffect, createEvent, createStore, sample } from 'effector';

import { chainsService } from '@/shared/api/network';
import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type ID,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { accounts } from '@/domains/network';
import { proxiesModel } from '@/features/proxies';

type AccountsCreatedParams = {
  walletId: ID;
  accounts: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[];
};
const shardsSelected = createEvent<VaultShardAccount[]>();
const shardsCleared = createEvent();
const accountsCreated = createEvent<AccountsCreatedParams>();

const keysRemoved = createEvent<(VaultChainAccount | VaultShardAccount)[]>();
const keysAdded = createEvent<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>();

const $shards = createStore<VaultShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);
const $keysToAdd = createStore<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>([]).reset(
  accountsCreated,
);

const createAccountsFx = attach({ effect: accounts.createAccounts });

const chainSetFx = createEffect((chainId: ChainId): Chain | undefined => {
  return chainsService.getChainById(chainId);
});

sample({
  clock: shardsSelected,
  target: $shards,
});

sample({
  clock: $shards,
  filter: shards => shards.length > 0,
  fn: shards => shards[0].chainId,
  target: chainSetFx,
});

sample({
  clock: chainSetFx.doneData,
  filter: (chain): chain is Chain => Boolean(chain),
  target: $chain,
});

sample({
  clock: keysAdded,
  filter: keys => keys.length > 0,
  target: $keysToAdd,
});

sample({
  clock: keysRemoved,
  filter: keys => keys.length > 0,
  target: accounts.deleteAccounts,
});

sample({
  // @ts-expect-error some types misalignment (no accountId)
  clock: accountsCreated,
  fn: ({ accounts, walletId }) => {
    return accounts.map(account => ({ ...account, walletId }));
  },
  target: createAccountsFx,
});

sample({
  clock: createAccountsFx.done,
  target: proxiesModel.findAllProxies,
});

export const vaultDetailsModel = {
  $shards,
  $chain,
  $keysToAdd,
  events: {
    shardsSelected,
    shardsCleared,
    keysRemoved,
    keysAdded,
    accountsCreated,
  },
};
