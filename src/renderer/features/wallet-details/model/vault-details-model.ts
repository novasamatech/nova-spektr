import { createEffect, createEvent, createStore, sample } from 'effector';

import { chainsService } from '@/shared/api/network';
import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type ID,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';

type AccountsCreatedParams = {
  walletId: ID;
  rootAccountId: AccountId;
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
  clock: accountsCreated,
  fn: ({ accounts, walletId, rootAccountId }) => {
    // @ts-expect-error some types missaligment (no accountId)
    const accountsToCreate: AnyAccount[] = accounts.map(account =>
      accountUtils.isVaultChainAccount(account)
        ? { ...account, baseAccountId: rootAccountId, walletId }
        : { ...account, walletId },
    );

    return accountsToCreate;
  },
  target: accounts.createAccounts,
});

sample({
  clock: accounts.createAccounts.done,
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
