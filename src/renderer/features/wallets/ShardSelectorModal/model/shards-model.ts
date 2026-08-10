import { attach, combine, createApi, createEvent, createStore, sample } from 'effector';
import { cloneDeep } from 'lodash';

import { type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { selectorUtils } from '../lib/selector-utils';
import { shardsUtils } from '../lib/shards-utils';
import {
  type AccountToggleParams,
  type ChainToggleParams,
  type RootStruct,
  type RootToggleParams,
  type SelectableAccount,
  type SelectedStruct,
} from '../lib/types';

export type Callbacks = {
  onConfirm: (shards: AnyAccount[]) => void;
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

const $query = createStore<string>('');
const $isModalOpen = createStore<boolean>(false);
const $canGetStructure = createStore<boolean>(false);
const $selectedStructure = createStore<SelectedStruct>({});

sample({ clock: queryChanged, target: $query });

const $isAccessDenied = combine(walletSelect.$selectedWallet, (wallet): boolean => {
  return nullable(wallet) || !walletUtils.isPolkadotVault(wallet);
});

const $filteredAccounts = combine(
  {
    query: $query,
    wallet: walletSelect.$selectedWallet,
    chains: networkModel.$chains,
  },
  ({ query, wallet, chains }): SelectableAccount[] => {
    if (nullable(wallet) || !walletUtils.isPolkadotVault(wallet)) return [];

    return shardsUtils.getFilteredAccounts(wallet.accounts, chains, query);
  },
);

const $shardsStructure = combine(
  {
    proceed: $canGetStructure,
    wallet: walletSelect.$selectedWallet,
    accounts: $filteredAccounts,
    chains: networkModel.$chains,
  },
  ({ proceed, wallet, accounts, chains }): RootStruct | null => {
    if (!proceed || nullable(wallet) || !walletUtils.isPolkadotVault(wallet)) return null;

    return shardsUtils.getStructForVault(wallet.rootAccountId, wallet.name, accounts, chains);
  },
);

const $initSelectedStructure = combine(
  {
    proceed: $canGetStructure,
    wallet: walletSelect.$selectedWallet,
    chains: networkModel.$chains,
  },
  ({ proceed, wallet, chains }): SelectedStruct => {
    if (!proceed || nullable(wallet) || !walletUtils.isPolkadotVault(wallet)) return {};

    const filteredAccounts = shardsUtils.getFilteredAccounts(wallet.accounts, chains);
    return shardsUtils.getVaultChainsCounter(wallet.rootAccountId, chains, filteredAccounts);
  },
);

const $totalSelected = combine($selectedStructure, (selectedStructure): number => {
  return Object.values(selectedStructure).reduce((acc, rootData) => {
    return acc + rootData.checked;
  }, 0);
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
  wallet: Wallet | null;
};
sample({
  clock: shardsConfirmed,
  source: {
    struct: $selectedStructure,
    wallet: walletSelect.$selectedWallet,
  },
  filter: ({ wallet }) => Boolean(wallet),
  target: attach({
    source: $callbacks,
    effect: (state, { struct, wallet }: ConfirmParams) => {
      state?.onConfirm(shardsUtils.getSelectedShards(struct, wallet!.accounts));
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
  events: {
    modalToggled,
    queryChanged,
    allToggled,
    rootToggled,
    chainToggled,
    accountToggled,
    shardsConfirmed,
    structureRequested,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
