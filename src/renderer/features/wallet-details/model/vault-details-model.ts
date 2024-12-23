import { createEffect, createEvent, createStore, sample } from 'effector';

import { chainsService } from '@/shared/api/network';
import {
  type Chain,
  type ChainAccount,
  type ChainId,
  type DraftAccount,
  type ID,
  type ShardAccount,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, networkDomain } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';

type AccountsCreatedParams = {
  walletId: ID;
  rootAccountId: AccountId;
  accounts: (DraftAccount<ChainAccount> | DraftAccount<ShardAccount>)[];
};
const shardsSelected = createEvent<ShardAccount[]>();
const shardsCleared = createEvent();
const accountsCreated = createEvent<AccountsCreatedParams>();

const keysRemoved = createEvent<(ChainAccount | ShardAccount)[]>();
const keysAdded = createEvent<(DraftAccount<ChainAccount> | DraftAccount<ShardAccount>)[]>();

const $shards = createStore<ShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);
const $keysToAdd = createStore<(DraftAccount<ChainAccount> | DraftAccount<ShardAccount>)[]>([]).reset(accountsCreated);

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

sample({
  clock: keysAdded,
  filter: (keys) => keys.length > 0,
  target: $keysToAdd,
});

sample({
  clock: keysRemoved,
  filter: (keys) => keys.length > 0,
  target: networkDomain.accounts.deleteAccounts,
});

sample({
  clock: accountsCreated,
  fn: ({ accounts, walletId, rootAccountId }) => {
    // @ts-expect-error some types missaligment (no accountId)
    const accountsToCreate: AnyAccount[] = accounts.map((account) =>
      accountUtils.isChainAccount(account) ? { ...account, baseId: rootAccountId, walletId } : { ...account, walletId },
    );

    return accountsToCreate;
  },
  target: networkDomain.accounts.createAccounts,
});

sample({
  clock: networkDomain.accounts.createAccounts.doneData,
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
