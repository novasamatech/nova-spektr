import { combine, createEvent, createStore, sample, forward } from 'effector';

import { Account, AccountId, ChainAccount, ChainId, ShardAccount } from '@shared/core';
import { ChainData, ChainWithAccounts, RootData, SelectedAccounts, ShardedData } from '../lib/types';
import { selectShardsUtils } from '../lib/utils';

const $selectedAccounts = createStore<SelectedAccounts | null>(null);
const $rootData = createStore<RootData | null>(null);
const $chainData = createStore<ChainData | null>(null);
const $shardedData = createStore<ShardedData | null>(null);

type AccountToggledParams = {
  value: boolean;
  account: Account;
  chainId: ChainId;
  rootId: AccountId;
  shardGroupId?: string;
};
const accountToggled = createEvent<AccountToggledParams>();

type ChainToggledParams = {
  value: boolean;
  chainId: ChainId;
  rootId: AccountId;
  chainAccounts: Array<ChainAccount | ShardAccount[]>;
};
const chainToggled = createEvent<ChainToggledParams>();

type RootToggledParams = {
  value: boolean;
  rootId: AccountId;
  chainsWithAccounts: ChainWithAccounts[];
};
const rootToggled = createEvent<RootToggledParams>();

// const shardSelectorOpened = createEvent<SelectableShards | null>();

// const $shards = createStore<SelectableShards | null>(null);
const $query = createStore<string>('');
const searchChanged = createEvent<string>();

const $allShardsChecked = $selectedAccounts.map(
  (selectedAccounts) => !!selectedAccounts && Object.values(selectedAccounts).every((v) => v),
);
const $allShardsSemiChecked = combine(
  {
    allShardsChecked: $allShardsChecked,
    selectedAccounts: $selectedAccounts,
  },
  ({ allShardsChecked, selectedAccounts }) =>
    !allShardsChecked && !!selectedAccounts && Object.values(selectedAccounts).some((v) => v),
);

type SelectorOpenedParams = {
  accounts: Account[];
  activeAccounts: Account[];
};
const selectorOpened = createEvent<SelectorOpenedParams>();

forward({ from: searchChanged, to: $query });

sample({
  clock: selectorOpened,
  fn: ({ accounts, activeAccounts }) => selectShardsUtils.getSelectedAccounts(accounts, activeAccounts),
  target: $selectedAccounts,
});

sample({
  clock: selectorOpened,
  fn: ({ accounts, activeAccounts }) => selectShardsUtils.getChainsData(accounts, activeAccounts),
  target: $chainData,
});

sample({
  clock: selectorOpened,
  fn: ({ accounts, activeAccounts }) => selectShardsUtils.getRootData(accounts, activeAccounts),
  target: $rootData,
});

sample({
  clock: selectorOpened,
  fn: ({ accounts, activeAccounts }) => selectShardsUtils.getShardedData(accounts, activeAccounts),
  target: $shardedData,
});

// todo ACCOUNT SELECTED

sample({
  clock: accountToggled,
  source: $selectedAccounts,
  fn: (selectedAccounts, { value, account }) => {
    if (!selectedAccounts) return null;
    selectedAccounts[account.accountId] = value;

    return { ...selectedAccounts };
  },
  target: $selectedAccounts,
});

sample({
  clock: accountToggled,
  source: $chainData,
  fn: (chainData, { value, rootId, chainId }) => {
    if (!chainData) return null;
    const currentChain = chainData[`${rootId}_${chainId}`];
    value ? currentChain.checked++ : currentChain.checked--;

    return { ...chainData };
  },
  target: $chainData,
});

sample({
  clock: accountToggled,
  source: combine({
    chainData: $chainData,
    rootData: $rootData,
  }),
  fn: ({ chainData, rootData }, { value, rootId, chainId }) => {
    if (!chainData || !rootData) return null;
    const currentChain = { ...chainData[`${rootId}_${chainId}`] };

    const currentRoot = rootData[rootId];
    value ? (currentRoot.checked += currentChain.total) : (currentRoot.checked -= currentChain.total);

    return { ...rootData };
  },
  target: $rootData,
});

sample({
  clock: accountToggled,
  source: $shardedData,
  filter: (_, { shardGroupId }) => Boolean(shardGroupId),
  fn: (shardedData, { value, shardGroupId, chainId, account }) => {
    if (!shardedData) return null;
    const currentSharded = shardedData[`${chainId}_${shardGroupId}`];
    value ? currentSharded.checked++ : currentSharded.checked--;

    return { ...shardedData };
  },
  target: $chainData,
});

// todo CHAIN SELECTED

sample({
  clock: chainToggled,
  source: $selectedAccounts,
  fn: (selectedAccounts, { value, chainAccounts }) => {
    if (!selectedAccounts) return null;
    chainAccounts.forEach((a) => {
      if (Array.isArray(a)) {
        a.forEach((shard) => (selectedAccounts[shard.accountId] = value));
      } else {
        selectedAccounts[a.accountId] = value;
      }
    });

    return { ...selectedAccounts };
  },
  target: $selectedAccounts,
});

sample({
  clock: chainToggled,
  source: $chainData,
  fn: (chainData, { value, chainId, rootId }) => {
    if (!chainData) return null;
    const currentChain = chainData[`${rootId}_${chainId}`];
    currentChain.checked = value ? currentChain.total : 0;

    return { ...chainData };
  },
  target: $chainData,
});

sample({
  clock: chainToggled,
  source: combine({
    chainData: $chainData,
    rootData: $rootData,
  }),
  fn: ({ rootData, chainData }, { value, chainId, rootId }) => {
    if (!rootData || !chainData) return null;
    const currentChain = { ...chainData[`${rootId}_${chainId}`] };

    const currentRoot = rootData[rootId];
    value ? (currentRoot.checked += currentChain.total) : (currentRoot.checked -= currentChain.total);

    return { ...rootData };
  },
  target: $rootData,
});

sample({
  clock: chainToggled,
  source: $shardedData,
  fn: (shardedData, { value, chainId }) => {
    if (!shardedData) return null;
    for (let shardedDataKey in shardedData) {
      if (shardedDataKey.includes(chainId)) {
        // @ts-ignore
        shardedData[shardedDataKey].checked = value ? shardedData[shardedDataKey].total : 0;
      }
    }

    return { ...shardedData };
  },
  target: $shardedData,
});

// todo ROOT SELECTED

sample({
  clock: rootToggled,
  source: $selectedAccounts,
  fn: (selectedAccounts, { value, chainsWithAccounts }) => {
    if (!selectedAccounts) return null;
    const newSelectedAccounts = { ...selectedAccounts };
    chainsWithAccounts.forEach(([_, chainAccounts]) => {
      chainAccounts.forEach((a) => {
        if (Array.isArray(a)) {
          a.forEach((shard) => (newSelectedAccounts[shard.accountId] = value));
        } else {
          newSelectedAccounts[a.accountId] = value;
        }
      });
    });

    return newSelectedAccounts;
  },
  target: $selectedAccounts,
});

sample({
  clock: rootToggled,
  source: $shardedData,
  fn: (shardedData, { value, chainsWithAccounts }) => {
    if (!shardedData) return null;
    chainsWithAccounts.forEach(([chain]) => {
      for (let shardedDataKey in shardedData) {
        if (shardedDataKey.includes(chain.chainId)) {
          // @ts-ignore
          shardedData[shardedDataKey].checked = value ? shardedData[shardedDataKey].total : 0;
        }
      }
    });

    return { ...shardedData };
  },
  target: $shardedData,
});

sample({
  clock: rootToggled,
  source: $chainData,
  fn: (chainData, { value, rootId, chainsWithAccounts }) => {
    if (!chainData) return null;
    const newChainData = { ...chainData };
    chainsWithAccounts.forEach(([chain, chainAccounts]) => {
      newChainData[`${rootId}_${chain.chainId}`].checked = value ? newChainData[`${rootId}_${chain.chainId}`].total : 0;
    });

    return newChainData;
  },
  target: $chainData,
});

sample({
  clock: rootToggled,
  source: $rootData,
  fn: (rootData, { value, rootId }) => {
    if (!rootData) return null;
    const newRootData = { ...rootData };
    newRootData[rootId].checked = value ? newRootData[rootId].total : 0;

    return newRootData;
  },
  target: $rootData,
});

export const selectShardsModel = {
  $selectedAccounts,
  $rootData,
  $chainData,
  $query,
  $allShardsSemiChecked,
  $allShardsChecked,
  events: {
    accountToggled,
    searchChanged,
    selectorOpened,
    chainToggled,
    rootToggled,
  },
};
