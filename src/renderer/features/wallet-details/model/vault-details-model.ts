import { attach, createEvent, createStore, sample } from 'effector';

import {
  AccountType,
  type Chain,
  CryptoType,
  type DraftAccount,
  type ID,
  KeyType,
  SigningType,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { groupShardedDerivations, nonNullable } from '@/shared/lib/utils';
import { accountSync, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
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
  filter: ({ shards, chains }) => shards.length > 0 && Object.keys(chains).length > 0,
  fn: ({ shards, chains }) => chains[shards[0].chainId],
  target: $chain,
});

sample({
  clock: keysAdded,
  source: networkModel.$chains,
  filter: (_, draftKeys) => draftKeys.length > 0,
  fn: (chains, draftKeys) => {
    const shardedKeyGroups = groupShardedDerivations(draftKeys);

    const derivationToGroupId = new Map<string, string>();
    for (const [_, keys] of Object.entries(shardedKeyGroups)) {
      const groupId = crypto.randomUUID();
      for (const key of keys) {
        derivationToGroupId.set(key.derivationPath, groupId);
      }
    }

    return draftKeys.map(key => {
      const isEthereumBased = networkUtils.isEthereumBased(chains[key.chainId].options);
      const groupId = derivationToGroupId.get(key.derivationPath);
      const isSharded = nonNullable(groupId);

      const account = {
        type: 'chain',
        name: key.derivationPath,
        keyType: KeyType.CUSTOM,
        chainId: key.chainId,
        accountType: isSharded ? AccountType.SHARD : AccountType.CHAIN,
        cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        derivationPath: key.derivationPath,
        ...(isSharded && { groupId }),
      };
      return account as DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>;
    });
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
