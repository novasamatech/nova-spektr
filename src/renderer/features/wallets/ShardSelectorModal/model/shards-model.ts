import { createStore, createEvent, sample, combine, createApi, attach } from 'effector';
import { cloneDeep } from 'lodash';

import type { Account } from '@shared/core';
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
const structureRequested = createEvent<boolean>();

const allToggled = createEvent<boolean>();
const rootToggled = createEvent<RootToggleParams>();
const chainToggled = createEvent<ChainToggleParams>();
const accountToggled = createEvent<AccountToggleParams>();
const shardedToggled = createEvent<ShardedToggleParams>();
const shardToggled = createEvent<ShardToggleParams>();

const $query = createStore<string>('');
const $isModalOpen = createStore<boolean>(false);
const $canGetStructure = createStore<boolean>(false);
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
    proceed: $canGetStructure,
    wallet: walletModel.$activeWallet,
    accounts: $filteredAccounts,
    chains: networkModel.$chains,
  },
  ({ proceed, wallet, accounts, chains }): RootTuple[] => {
    if (!proceed || !wallet) return [];

    const chainsMap = shardsUtils.getChainsMap(chains);

    if (walletUtils.isPolkadotVault(wallet)) {
      return shardsUtils.getStructForVault(accounts, chainsMap);
    }
    if (walletUtils.isMultiShard(wallet)) {
      return shardsUtils.getStructForMultishard(accounts, chainsMap);
    }

    return [];
  },
);

const $initSelectedStructure = combine(
  {
    proceed: $canGetStructure,
    wallet: walletModel.$activeWallet,
    accounts: walletModel.$activeAccounts,
    chains: networkModel.$chains,
  },
  ({ proceed, wallet, accounts, chains }): SelectedStruct => {
    if (!proceed || !wallet) return {};

    const filteredAccounts = shardsUtils.getFilteredAccounts(accounts, chains);

    if (walletUtils.isPolkadotVault(wallet)) {
      return shardsUtils.getVaultChainsCounter(chains, filteredAccounts);
    }
    if (walletUtils.isMultiShard(wallet)) {
      return shardsUtils.getMultishardtChainsCounter(chains, filteredAccounts);
    }

    return {};
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

const $isAllSemiChecked = combine($selectedStructure, (selectedStructure): boolean => {
  const { checked, total } = Object.values(selectedStructure).reduce<Record<'checked' | 'total', number>>(
    (acc, rootData) => {
      acc.checked += rootData.checked;
      acc.total += rootData.total;

      return acc;
    },
    { checked: 0, total: 0 },
  );

  return checked > 0 && checked !== total;
});

sample({
  clock: [modalToggled, shardsConfirmed],
  source: $isModalOpen,
  fn: (isOpen) => !isOpen,
  target: $isModalOpen,
});

sample({
  clock: modalToggled,
  fn: () => '',
  target: $query,
});

type ConfirmParams = {
  struct: SelectedStruct;
  accounts: Account[];
};
sample({
  clock: shardsConfirmed,
  source: {
    struct: $selectedStructure,
    accounts: walletModel.$activeAccounts,
  },
  target: attach({
    source: $callbacks,
    effect: (state, { struct, accounts }: ConfirmParams) => {
      state?.onConfirm(shardsUtils.getSelectedShards(struct, accounts));
    },
  }),
});

sample({
  source: $initSelectedStructure,
  fn: (struct) => cloneDeep(struct),
  target: $selectedStructure,
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

sample({
  clock: structureRequested,
  target: $canGetStructure,
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
    structureRequested,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
