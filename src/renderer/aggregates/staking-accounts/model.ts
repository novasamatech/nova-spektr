import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';
import { uniqBy } from 'lodash';

import { type ChainId, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { accountService } from '@/domains/network';
import { type StakingMap, staking } from '@/domains/staking';
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

/**
 * What the user has explicitly ticked. Never read directly - the accounts it
 * names may not exist yet, or any more.
 */
const $pickedNominators = createStore<AccountId[]>([])
  .on(setSelectedNominators, (_, ids) => ids)
  .on(toggleNominator, (state, { id, isAllSelected }) => {
    const isSelected = isAllSelected === undefined ? state.includes(id) : !isAllSelected;

    if (isSelected) {
      return state.filter(a => a !== id);
    }

    return state.concat(id);
  })
  .reset(resetNominators);

/**
 * The accounts the actions actually operate on.
 *
 * Derived rather than sampled on purpose. `$accountIds` fills in
 * asynchronously: the wallet's accounts come from storage and the chain from
 * the network config. The previous version auto-selected in a `sample` clocked
 * on wallet and chain changes only, and both of those fire while `$accountIds`
 * is still empty, so the selection was computed as `[]` and nothing ever
 * recomputed it once the accounts arrived.
 *
 * On a single-account wallet that was terminal: the row carries no checkbox,
 * because there is nothing to choose between, so the user could not select
 * anything and every staking action stayed disabled behind "Select accounts".
 *
 * As a derived value it simply recomputes whenever the account list does.
 */
const $selectedNominators = combine(
  { picked: $pickedNominators, accountIds: $accountIds, activeWallet: walletSelect.$selectedWallet },
  ({ picked, accountIds, activeWallet }) => {
    const available = new Set(accountIds);
    const stillValid = picked.filter(id => available.has(id));

    // An explicit pick wins as long as it still exists on this wallet and chain.
    if (stillValid.length > 0) return stillValid;

    return getDefaultSelection(activeWallet, accountIds);
  },
);

/**
 * Which accounts to act on when the user has picked none.
 *
 * A single account is selected whatever the wallet type: there is nothing to
 * choose between, so leaving it unselected only disables the page. Wallet types
 * that expose exactly one signing account also take the first one when several
 * accounts are listed. A multishard vault is the one case left unselected: the
 * user genuinely has to say which shards to act on, and the rows carry
 * checkboxes for exactly that.
 */
export function getDefaultSelection(activeWallet: Wallet | null, accountIds: AccountId[]): AccountId[] {
  const [first] = accountIds;
  if (!activeWallet || !first) return [];

  if (accountIds.length === 1) return [first];

  const isSingleAccountWallet =
    walletUtils.isAnyMultisig(activeWallet) ||
    walletUtils.isNovaWallet(activeWallet) ||
    walletUtils.isWalletConnect(activeWallet) ||
    walletUtils.isProxied(activeWallet) ||
    walletUtils.isPolkadotExtension(activeWallet) ||
    walletUtils.isTalismanExtension(activeWallet) ||
    walletUtils.isSubWalletExtension(activeWallet);

  return isSingleAccountWallet ? [first] : [];
}

const $isMultipleSelected = $selectedNominators.map(n => n.length > 1);

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
