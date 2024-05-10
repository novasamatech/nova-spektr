import { createStore, createEvent, createEffect, sample } from 'effector';

import { chainsService } from '@shared/api/network';
import { storageService } from '@shared/api/storage';
import { walletModel, accountUtils } from '@entities/wallet';
import { proxiesModel } from '@features/proxies';
import type {
  ShardAccount,
  Chain,
  ChainId,
  ChainAccount,
  ID,
  DraftAccount,
  AccountId,
  Wallet,
  Account,
} from '@shared/core';

type AccountsCreatedParams = {
  walletId: ID;
  rootAccountId: AccountId;
  accounts: DraftAccount<ChainAccount | ShardAccount>[];
};
const shardsSelected = createEvent<ShardAccount[]>();
const shardsCleared = createEvent();
const accountsCreated = createEvent<AccountsCreatedParams>();

const keysRemoved = createEvent<Array<ChainAccount | ShardAccount>>();
const keysAdded = createEvent<Array<DraftAccount<ChainAccount | ShardAccount>>>();

const $shards = createStore<ShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);
const $keysToAdd = createStore<Array<DraftAccount<ChainAccount | ShardAccount>>>([]).reset(accountsCreated);

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
  source: walletModel.$wallets,
  filter: (_, ids) => Boolean(ids),
  fn: (wallets, ids) => {
    const removeMap = ids!.reduce<Record<ID, boolean>>((acc, id) => ({ ...acc, [id]: true }), {});

    return wallets.map((wallet) => {
      const remainingAccounts = wallet.accounts.filter(({ id }) => !removeMap[id]);

      return { ...wallet, accounts: remainingAccounts } as Wallet;
    });
  },
  target: walletModel.$wallets,
});

sample({
  clock: removeKeysFx.doneData,
  target: proxiesModel.events.workerStarted,
});

sample({ clock: accountsCreated, target: createAccountsFx });

sample({
  clock: createAccountsFx.done,
  source: walletModel.$wallets,
  filter: (_, { result }) => Boolean(result),
  fn: (wallets, { params, result }) => {
    return wallets.map((wallet) => {
      if (wallet.id !== params.walletId) return wallet;

      return { ...wallet, accounts: [...wallet.accounts, ...result!] } as Wallet;
    });
  },
  target: walletModel.$wallets,
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
