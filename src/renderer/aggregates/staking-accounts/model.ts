import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';
import { uniqBy } from 'lodash';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { accountService } from '@/domains/network';
import { type StakingMap, staking } from '@/entities/staking';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { stakingNetwork } from '@/aggregates/staking-network';
import { walletSelect } from '@/aggregates/wallet-select';

// --- Staking data subscription (absorbed from staking-model.ts) ---

type StakingParams = {
  chainId: ChainId | null;
  api: ApiPromise | null;
  accounts: AccountId[];
};

const reset = createEvent<void>();

const $stakingParams = createStore<StakingParams>({ chainId: null, api: null, accounts: [] }).reset(reset);

const $currentKey = createStore<ResourceRequestKey | null>(null).reset(reset);

const EMPTY_MAP: StakingMap = {};

const $stakingData = combine(staking.stakingResource.$cache, $stakingParams, (cache, params) =>
  params.chainId ? (cache[params.chainId] ?? EMPTY_MAP) : EMPTY_MAP,
);

const $isStakingLoading = combine(
  {
    stakingData: $stakingData,
    params: $stakingParams,
    hasKey: $currentKey.map(nonNullable),
  },
  ({ stakingData, params, hasKey }) => {
    if (params.accounts.length === 0) return false;
    if (!params.api || !params.chainId) return true;
    if (!hasKey) return true;
    if (Object.keys(stakingData).length === 0) return true;

    return false;
  },
);

// --- Account filtering (absorbed from Staking page) ---

const $accounts = combine(
  {
    selectedAccounts: walletSelect.$selectedAccounts,
    activeWallet: walletSelect.$selectedWallet,
    chain: stakingNetwork.$chain,
  },
  ({ selectedAccounts, activeWallet, chain }) => {
    if (!selectedAccounts.length || !chain) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);

    const filteredAccounts = selectedAccounts.filter((account, _, collection) => {
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      const hasManyAccounts = collection.length > 1;

      if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
        return false;
      }

      return accountService.isAccountAvailableOnChain(account, chain);
    });

    return uniqBy(filteredAccounts, 'accountId');
  },
);

const $accountIds = $accounts.map(accounts => accounts.map(a => a.accountId));

const $groupedAccounts = combine(
  {
    activeWallet: walletSelect.$selectedWallet,
    accounts: $accounts,
  },
  ({ activeWallet, accounts }) => {
    if (!activeWallet) return [];
    if (!walletUtils.isPolkadotVault(activeWallet)) return accounts;

    return accountUtils.getAccountsAndShardGroups(accounts);
  },
);

// --- Nominator selection ---

const toggleNominator = createEvent<{ id: AccountId; isAllSelected?: boolean }>();
const setSelectedNominators = createEvent<AccountId[]>();
const resetNominators = createEvent();

const $selectedNominators = createStore<AccountId[]>([])
  .on(setSelectedNominators, (_, ids) => ids)
  .on(toggleNominator, (state, { id, isAllSelected }) => {
    const isSelected = isAllSelected === undefined ? state.includes(id) : !isAllSelected;

    if (isSelected) {
      return state.filter(a => a !== id);
    }

    return state.concat(id);
  })
  .reset(resetNominators);

const $isMultipleSelected = $selectedNominators.map(n => n.length > 1);

// --- Auto-select nominators based on wallet type ---

sample({
  clock: [stakingNetwork.$selectedChainId, walletSelect.$selectedWallet],
  source: {
    activeWallet: walletSelect.$selectedWallet,
    accountIds: $accountIds,
  },
  fn: ({ activeWallet, accountIds }) => {
    if (!activeWallet) return [];

    const isMultisig = walletUtils.isAnyMultisig(activeWallet);
    const isNovaWallet = walletUtils.isNovaWallet(activeWallet);
    const isWalletConnect = walletUtils.isWalletConnect(activeWallet);
    const isPolkadotVault = walletUtils.isPolkadotVaultGroup(activeWallet);
    const isPolkadotExtension = walletUtils.isPolkadotExtension(activeWallet);
    const isTalismanExtension = walletUtils.isTalismanExtension(activeWallet);
    const isSubWalletExtension = walletUtils.isSubWalletExtension(activeWallet);
    const isProxied = walletUtils.isProxied(activeWallet);

    if (
      isMultisig ||
      isNovaWallet ||
      isWalletConnect ||
      isProxied ||
      isPolkadotExtension ||
      isTalismanExtension ||
      isSubWalletExtension ||
      (isPolkadotVault && accountIds.length === 1)
    ) {
      return [accountIds[0]!];
    }

    return [];
  },
  target: $selectedNominators,
});

// --- Staking data subscription management ---

const $derivedStakingParams = combine(
  {
    chainId: stakingNetwork.$selectedChainId,
    api: stakingNetwork.$api,
    accountIds: $accountIds,
  },
  ({ chainId, api, accountIds }) => ({
    chainId,
    api,
    accounts: accountIds,
  }),
);

sample({
  clock: $derivedStakingParams,
  target: $stakingParams,
});

sample({
  clock: $derivedStakingParams,
  filter: ({ chainId, api, accounts }) => nonNullable(chainId) && nonNullable(api) && accounts.length > 0,
  fn: ({ chainId, api, accounts }) => ({
    chainId: chainId!,
    api: api!,
    accounts,
  }),
  target: staking.stakingResource.subscribe,
});

sample({
  clock: $derivedStakingParams,
  filter: ({ chainId, api, accounts }) => nonNullable(chainId) && nonNullable(api) && accounts.length > 0,
  fn: ({ chainId, api, accounts }) =>
    staking.stakingResource.createKey({
      chainId: chainId!,
      api: api!,
      accounts,
    }),
  target: $currentKey,
});

sample({
  clock: reset,
  source: $currentKey,
  filter: nonNullable,
  target: staking.stakingResource.unsubscribe,
});

export const stakingAccounts = {
  $accounts,
  $accountIds,
  $groupedAccounts,

  $selectedNominators,
  $isMultipleSelected,
  toggleNominator,
  setSelectedNominators,
  resetNominators,

  $stakingData,
  $isStakingLoading,

  reset,
};
