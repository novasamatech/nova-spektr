import { createStore, createEvent, sample, combine, createApi, attach } from 'effector';

import type { AccountId, ChainId, Account, BaseAccount, ChainAccount, ShardAccount, ID } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { shardsUtils } from '../lib/shards-utils';
import { RootTuple, SelectedStruct } from '../lib/types';

export type Callbacks = {
  onConfirm: (shards: Account[]) => void;
};

type RootToggleParams = { root: ID; value: boolean };
type ChainToggleParams = RootToggleParams & { chainId: ChainId };
type AccountToggleParams = ChainToggleParams & { accountId: AccountId };
type ShardedToggleParams = ChainToggleParams & { index: number };
type ShardToggleParams = ShardedToggleParams & { accountId: AccountId };

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const queryChanged = createEvent<string>();
const modalToggled = createEvent();
const shardsConfirmed = createEvent();

const rootToggled = createEvent<RootToggleParams>();
const chainToggled = createEvent<ChainToggleParams>();
const accountToggled = createEvent<AccountToggleParams>();
const shardedToggled = createEvent<ShardedToggleParams>();
const shardToggled = createEvent<ShardToggleParams>();

const $query = createStore<string>('');
const $isModalOpen = createStore<boolean>(false);
const $selectedStructure = createStore<SelectedStruct>({});

sample({ clock: queryChanged, target: $query });

const $isAccessDenied = combine(walletModel.$activeWallet, (wallet): boolean => {
  return !walletUtils.isPolkadotVault(wallet) && !walletUtils.isMultiShard(wallet);
});

const $filteredAccounts = combine(
  {
    query: $query,
    accounts: walletModel.$activeAccounts,
    chains: networkModel.$chains,
  },
  ({ query, accounts, chains }): Account[] => {
    return shardsUtils.getFilteredAccounts(accounts, chains, query);
  },
);

const $walletStructure = combine(
  {
    proceed: $isModalOpen,
    wallet: walletModel.$activeWallet,
    accounts: $filteredAccounts,
    chains: networkModel.$chains,
  },
  ({ proceed, wallet, accounts, chains }): RootTuple[] => {
    if (!proceed || !wallet) return [];

    const chainsMap = shardsUtils.getChainsAccountsMap(chains);

    return walletUtils.isPolkadotVault(wallet)
      ? shardsUtils.getStructForVault(accounts as Array<BaseAccount | ChainAccount | ShardAccount>, chainsMap)
      : shardsUtils.getStructForMultishard(accounts as Array<BaseAccount | ChainAccount>, chainsMap);
  },
);

const $totalSelected = combine($selectedStructure, (selectedStructure): number => {
  return Object.values(selectedStructure).reduce((acc, rootData) => {
    return acc + rootData.checked;
  }, 0);
});

sample({
  clock: modalToggled,
  source: $isModalOpen,
  fn: (isOpen) => !isOpen,
  target: $isModalOpen,
});

sample({
  clock: modalToggled,
  source: {
    isModalOpen: $isModalOpen,
    accounts: walletModel.$activeAccounts,
    wallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
  },
  filter: ({ isModalOpen }) => isModalOpen,
  fn: ({ chains, wallet, accounts }) => {
    return walletUtils.isPolkadotVault(wallet)
      ? shardsUtils.getVaultChainsCounter(chains, accounts as Array<BaseAccount | ChainAccount | ShardAccount>)
      : shardsUtils.getMultishardtChainsCounter(chains, accounts as Array<BaseAccount | ChainAccount>);
  },
  target: $selectedStructure,
});

sample({
  clock: shardsConfirmed,
  source: walletModel.$activeAccounts,
  target: attach({
    source: $callbacks,
    effect: (state, accounts: Account[]) => {
      console.log('CHECK');
      state?.onConfirm(accounts);
    },
  }),
});

// sample({
//   clock: rootToggled,
//   source: $selectedStructure,
//   fn: () => {
//     console.log('123');
//   },
//   target: $selectedStructure,
// });
//
sample({
  clock: chainToggled,
  source: $selectedStructure,
  fn: (struct, { root, chainId, value }) => {
    Object.keys(struct[root][chainId].accounts).forEach((accountId) => {
      struct[root][chainId].accounts[accountId as AccountId] = value;
    });

    // TODO: must be tested
    Object.entries(struct[root][chainId].sharded).forEach(([key, group]) => {
      const { total, checked, ...rest } = group;
      group.checked = value ? total : 0;

      Object.keys(rest).forEach((accountId) => {
        group[accountId as AccountId] = value;
      });
    });

    struct[root].checked += value
      ? struct[root][chainId].total - struct[root][chainId].checked
      : -1 * struct[root][chainId].checked;
    struct[root][chainId].checked = value ? struct[root][chainId].total : 0;

    return { ...struct };
  },
  target: $selectedStructure,
});
//
// sample({
//   clock: shardedToggled,
//   source: $selectedStructure,
//   fn: () => {
//     console.log('123');
//   },
//   target: $selectedStructure,
// });
//
// sample({
//   clock: shardToggled,
//   source: $selectedStructure,
//   fn: () => {
//     console.log('123');
//   },
//   target: $selectedStructure,
// });

sample({
  clock: accountToggled,
  source: $selectedStructure,
  fn: (struct, { root, chainId, accountId, value }) => {
    struct[root][chainId].accounts[accountId] = value;
    struct[root][chainId].checked += value ? 1 : -1;
    struct[root].checked += value ? 1 : -1;

    return { ...struct };
  },
  target: $selectedStructure,
});

export const shardsModel = {
  $query,
  $isAccessDenied,
  $isModalOpen,
  $walletStructure,
  $selectedStructure,
  $totalSelected,
  events: {
    modalToggled,
    queryChanged,
    rootToggled,
    chainToggled,
    shardedToggled,
    shardToggled,
    accountToggled,
    shardsConfirmed,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
