import { createStore, createEvent, createEffect, sample } from 'effector';

import { chainsService } from '@shared/api/network';
import { storageService } from '@shared/api/storage';
import { walletModel, accountUtils } from '@entities/wallet';
import type { ShardAccount, Chain, ChainId, ChainAccount, ID, DraftAccount, Account, AccountId } from '@shared/core';
import { proxiesModel } from '@features/proxies';

type AccountsCreatedParams = {
  walletId: ID;
  rootAccountId: AccountId;
  accounts: DraftAccount<ChainAccount | ShardAccount>[];
};
const shardsSelected = createEvent<ShardAccount[]>();
const shardsCleared = createEvent();
const accountsCreated = createEvent<AccountsCreatedParams>();

const keysRemoved = createEvent<Array<ChainAccount | ShardAccount>>();
const keysAdded = createEvent<DraftAccount<ChainAccount>[]>();

const $shards = createStore<ShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);
const $keysToAdd = createStore<DraftAccount<ChainAccount>[]>([]).reset(accountsCreated);

const chainSetFx = createEffect((chainId: ChainId): Chain | undefined => {
  return chainsService.getChainById(chainId);
});

const removeKeysFx = createEffect((ids: ID[]): Promise<ID[] | undefined> => {
  return storageService.accounts.deleteAll(ids);
});

const createAccountsFx = createEffect(
  async ({ walletId, rootAccountId, accounts }: AccountsCreatedParams): Promise<Account[] | undefined> => {
    const accountsToCreate = accounts.map((account) => ({
      ...account,
      ...(accountUtils.isChainAccount(account) && { baseId: rootAccountId }),
      walletId,
    }));

    return storageService.accounts.createAll(accountsToCreate as Account[]);
  },
);

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
  clock: keysAdded,
  filter: (keys) => keys.length > 0,
  target: $keysToAdd,
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

sample({ clock: removeKeysFx.doneData, target: proxiesModel.events.workerStarted });

sample({ clock: accountsCreated, target: createAccountsFx });

sample({
  clock: createAccountsFx.doneData,
  source: walletModel.$accounts,
  filter: (_, newAccounts) => Boolean(newAccounts),
  fn: (accounts, newAccounts) => accounts.concat(newAccounts!),
  target: walletModel.$accounts,
});

sample({ clock: createAccountsFx.doneData, target: proxiesModel.events.workerStarted });

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
