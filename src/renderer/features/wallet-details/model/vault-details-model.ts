import { attach, createEvent, createStore, sample } from 'effector';

import { type Chain, type DraftAccount, type ID, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { accountSync, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { polkadotVaultService } from '@/features/polkadot-vault-wallet';
import { type DerivationKeyDraft } from '@/features/wallets';

type AccountsCreatedParams = {
  walletId: ID;
  accounts: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[];
};
const shardsSelected = createEvent<VaultShardAccount[]>();
const shardsCleared = createEvent();
const accountsCreated = createEvent<AccountsCreatedParams>();

const keysRemoved = createEvent<(VaultChainAccount | VaultShardAccount)[]>();
const keysAdded = createEvent<DerivationKeyDraft[]>();

const $shards = createStore<VaultShardAccount[]>([]).reset(shardsCleared);
const $chain = createStore<Chain>({} as Chain).reset(shardsCleared);
const $keysToAdd = createStore<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>([]).reset(
  accountsCreated,
);

const createAccountsFx = attach({ effect: accounts.createAccounts });

sample({
  clock: shardsSelected,
  target: $shards,
});

sample({
  source: {
    shards: $shards,
    chains: networkModel.$chains,
  },
  filter: ({ shards, chains }) =>
    shards.length > 0 && Object.keys(chains).length > 0 && nonNullable(chains[shards[0].chainId]),
  fn: ({ shards, chains }) => chains[shards[0].chainId],
  target: $chain,
});

sample({
  clock: keysAdded,
  source: networkModel.$chains,
  filter: (_, draftKeys) => draftKeys.length > 0,
  fn: (chains, draftKeys) => {
    return polkadotVaultService.populateDraftAccounts(draftKeys, chains);
  },
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
  target: accountSync.syncAccounts,
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
