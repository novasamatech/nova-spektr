import { createStore, createEvent, sample, combine, createApi, attach } from 'effector';

import type { AccountId, ChainId, Account, BaseAccount, ChainAccount, ShardAccount } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { shardsUtils } from '../lib/shards-utils';
import { RootTuple } from '../lib/types';

export type Callbacks = {
  onConfirm: (shards: Account[]) => void;
};

type RootToggleParams = { rootAccountId: AccountId; value: boolean };
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
const $selectedStructure = createStore<any>({});
const $totalSelected = createStore<number>(0);

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

sample({
  clock: modalToggled,
  source: $isModalOpen,
  fn: (isOpen) => !isOpen,
  target: $isModalOpen,
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
