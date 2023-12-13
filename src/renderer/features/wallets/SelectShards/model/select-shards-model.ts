import { combine, createEvent, createStore, sample, createEffect, forward } from 'effector';

import { SelectableAccount, SelectableShards } from '../lib/types';
import { selectShardsUtils } from '@features/wallets/SelectShards/lib/utils';
import { AccountId, ChainId } from '@shared/core';

const shardSelectorOpened = createEvent<SelectableShards | null>();

const $shards = createStore<SelectableShards | null>(null);
const $query = createStore<string>('').reset(shardSelectorOpened);

const $searchedShards = combine(
  {
    shards: $shards,
    query: $query,
  },
  ({ shards, query }) => {
    if (!shards) return null;

    return selectShardsUtils.searchShards(shards, query);
  },
);
const $allShardsChecked = $searchedShards.map(
  (shards) => !!shards && shards.rootAccounts.every((r) => r.isSelected && r.chains.every((c) => c.isSelected)),
);

const $allShardsSemiChecked = combine(
  {
    allShardsChecked: $allShardsChecked,
    searchedShards: $searchedShards,
  },
  ({ allShardsChecked, searchedShards }) =>
    !allShardsChecked &&
    !!searchedShards &&
    searchedShards.rootAccounts.some((r) => r.isSelected || r.selectedAmount > 0),
);

type RootSelectedParams = {
  value: boolean;
  accountId: AccountId;
};
type ChainSelectedParams = {
  value: boolean;
  chainId: ChainId;
  accountId: AccountId;
};
type AccountSelectedParams = {
  value: boolean;
  account: SelectableAccount;
};
const rootSelected = createEvent<RootSelectedParams>();
const chainSelected = createEvent<ChainSelectedParams>();
const accountSelected = createEvent<AccountSelectedParams>();
const searchChanged = createEvent<string>();

type Shards = {
  shards: SelectableShards | null;
};
const selectRootFx = createEffect(
  ({ value, accountId, shards }: RootSelectedParams & Shards): SelectableShards | null => {
    const root = shards?.rootAccounts.find((r) => r.accountId === accountId);
    if (!root) return null;

    root.isSelected = value;
    root.selectedAmount = value ? root.chains.length : 0;
    root.chains.forEach((c) => {
      c.isSelected = value;
      c.selectedAmount = value ? c.accounts.length : 0;
      c.accounts.forEach((a) => (a.isSelected = value));
    });

    return shards;
  },
);

const selectChainFx = createEffect(
  ({ value, chainId, accountId, shards }: ChainSelectedParams & Shards): SelectableShards | null => {
    const root = shards?.rootAccounts.find((r) => r.accountId === accountId);
    const chain = root?.chains.find((c) => c.chainId === chainId);
    if (!root || !chain) return null;

    chain.isSelected = value;
    chain.accounts.forEach((a) => (a.isSelected = value));
    chain.selectedAmount = value ? chain.accounts.length : 0;

    root.selectedAmount = root.chains.reduce((acc, chain) => acc + chain.selectedAmount, 0);

    return shards;
  },
);

const selectAccountFx = createEffect(
  ({ value, account, shards }: AccountSelectedParams & Shards): SelectableShards | null => {
    const root = shards?.rootAccounts.find((root) => root.id === account.baseId);
    const chain = root?.chains.find((chain) => chain.chainId === account.chainId);

    if (!root || !chain) return null;
    account.isSelected = value;

    const selectedAccounts = chain.accounts.filter((a) => a.isSelected);
    chain.isSelected = selectedAccounts.length === chain.accounts.length;
    chain.selectedAmount = selectedAccounts.length;

    root.selectedAmount = root.chains.reduce((acc, c) => acc + c.selectedAmount, 0);

    return shards;
  },
);

sample({
  clock: rootSelected,
  source: $shards,
  fn: (shards, rootSelectedParams) => ({ shards, ...rootSelectedParams }),
  target: selectRootFx,
});

sample({
  clock: chainSelected,
  source: $shards,
  fn: (shards, chainSelectedParams) => ({ shards, ...chainSelectedParams }),
  target: selectChainFx,
});

sample({
  clock: accountSelected,
  source: $shards,
  fn: (shards, accountSelectedParams) => ({ shards, ...accountSelectedParams }),
  target: selectAccountFx,
});

forward({ from: shardSelectorOpened, to: $shards });

forward({ from: searchChanged, to: $query });

export const selectShardsModel = {
  $searchedShards,
  $allShardsChecked,
  $allShardsSemiChecked,
  $query,
  events: {
    searchChanged,
    shardSelectorOpened,
    rootSelected,
    chainSelected,
    accountSelected,
  },
};
