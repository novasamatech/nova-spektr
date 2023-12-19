import { createStore, createEvent, sample, combine, createApi, attach } from 'effector';

import type { Account, BaseAccount, ChainAccount, ShardAccount } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { shardsUtils } from '../lib/shards-utils';
import { selectorUtils } from '../lib/selector-utils';
import {
  RootTuple,
  SelectedStruct,
  RootToggleParams,
  ChainToggleParams,
  AccountToggleParams,
  ShardedToggleParams,
  ShardToggleParams,
} from '../lib/types';

export type Callbacks = {
  onConfirm: (shards: Account[]) => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const queryChanged = createEvent<string>();
const modalToggled = createEvent();
const shardsConfirmed = createEvent();

const allToggled = createEvent<boolean>();
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

const $shardsStructure = combine(
  {
    proceed: $isModalOpen,
    wallet: walletModel.$activeWallet,
    accounts: $filteredAccounts,
    chains: networkModel.$chains,
  },
  ({ proceed, wallet, accounts, chains }): RootTuple[] => {
    if (!proceed || !wallet) return [];

    const chainsMap = shardsUtils.getChainsMap(chains);

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

const $isAllChecked = combine($selectedStructure, (struct): boolean => {
  return Object.keys(struct).every((root) => {
    const { checked, total } = struct[Number(root)];

    return checked === total;
  });
});

const $isAllSemiChecked = combine($selectedStructure, (struct): boolean => {
  return Object.keys(struct).every((root) => {
    const { checked, total } = struct[Number(root)];

    return checked > 0 && checked !== total;
  });
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

sample({
  clock: allToggled,
  source: $selectedStructure,
  fn: (struct, params) => selectorUtils.getSelectedAll(struct, params),
  target: $selectedStructure,
});

sample({
  clock: rootToggled,
  source: $selectedStructure,
  fn: (struct, params) => selectorUtils.getSelectedRoot(struct, params),
  target: $selectedStructure,
});

sample({
  clock: chainToggled,
  source: $selectedStructure,
  fn: (struct, params) => selectorUtils.getSelectedChain(struct, params),
  target: $selectedStructure,
});

sample({
  clock: shardedToggled,
  source: $selectedStructure,
  fn: (struct, params) => selectorUtils.getSelectedSharded(struct, params),
  target: $selectedStructure,
});

sample({
  clock: shardToggled,
  source: $selectedStructure,
  fn: (struct, params) => selectorUtils.getSelectedShard(struct, params),
  target: $selectedStructure,
});

sample({
  clock: accountToggled,
  source: $selectedStructure,
  fn: (struct, params) => selectorUtils.getSelectedAccount(struct, params),
  target: $selectedStructure,
});

export const shardsModel = {
  $query,
  $isAccessDenied,
  $isModalOpen,
  $shardsStructure,
  $selectedStructure,
  $totalSelected,
  $isAllChecked,
  $isAllSemiChecked,
  events: {
    modalToggled,
    queryChanged,
    allToggled,
    rootToggled,
    chainToggled,
    shardedToggled,
    shardToggled,
    accountToggled,
    shardsConfirmed,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
