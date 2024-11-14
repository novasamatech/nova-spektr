import { createEffect, createEvent, createStore, sample } from 'effector';

import { chainsService } from '@/shared/api/network';
import { storageService } from '@/shared/api/storage';
import {
  type Account,
  type AccountId,
  type Chain,
  type ChainAccount,
  type ChainId,
  type DraftAccount,
  type ID,
  type ShardAccount,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { nonNullable } from '@/shared/lib/utils';
import { accountUtils, walletModel } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';

type AccountsCreatedParams = {
  walletId: ID;
  rootAccountId: AccountId;
  accounts: DraftAccount<ChainAccount | ShardAccount>[];
};
const shardsSelected = createEvent<ShardAccount[]>();
const shardsCleared = createEvent();
const accountsCreated = createEvent<AccountsCreatedParams>();

const keysRemoved = createEvent<(ChainAccount | ShardAccount)[]>();
const keysAdded = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();

const $shards = createStore<ShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);
const $keysToAdd = createStore<DraftAccount<ChainAccount | ShardAccount>[]>([]).reset(accountsCreated);

const chainSetFx = createEffect((chainId: ChainId): Chain | undefined => {
  return chainsService.getChainById(chainId);
});

const removeKeysFx = createEffect((ids: ID[]): Promise<ID[] | undefined> => {
  return storageService.accounts.deleteAll(ids);
});

const createAccountsFx = createEffect(
  ({ walletId, rootAccountId, accounts }: AccountsCreatedParams): Promise<Account[] | undefined> => {
    const accountsToCreate = accounts.map((account) => ({
      ...account,
      ...(accountUtils.isChainAccount(account) && { baseId: rootAccountId }),
      walletId,
    }));

    return storageService.accounts.createAll(accountsToCreate as (ChainAccount | ShardAccount)[]);
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
  source: walletModel.$allWallets,
  filter: (_, ids) => nonNullable(ids),
  fn: (wallets, ids) => {
    const removeMap = ids!.reduce<Record<ID, boolean>>((acc, id) => ({ ...acc, [id]: true }), {});

    return wallets.map((wallet) => {
      return {
        walletId: wallet.id,
        accounts: wallet.accounts.filter(({ id }) => !removeMap[id]),
      };
    });
  },
  target: series(walletModel.events.updateAccounts),
});

sample({
  clock: removeKeysFx.doneData,
  target: proxiesModel.events.workerStarted,
});

sample({ clock: accountsCreated, target: createAccountsFx });

sample({
  clock: createAccountsFx.done,
  source: walletModel.$allWallets,
  filter: (_, { result }) => nonNullable(result),
  fn: (wallets, { params, result }) => {
    const wallet = wallets.find((w) => w.id === params.walletId);

    return {
      walletId: params.walletId,
      accounts: wallet ? [...wallet.accounts, ...result!] : result!,
    };
  },
  target: walletModel.events.updateAccounts,
});

sample({
  clock: createAccountsFx.doneData,
  target: proxiesModel.events.workerStarted,
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
