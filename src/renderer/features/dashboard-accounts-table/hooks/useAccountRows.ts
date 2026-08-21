import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts, useAccountsNames } from '@/domains/network';
import { type StakingPosition, AssetHubChains } from '@/domains/staking';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { useStakingPositions } from '@/aggregates/staking-positions';
import { hasBalanceRecords } from '../lib/balanceRecords';
import { buildAccountRow } from '../lib/rows';
import { type AccountRow } from '../lib/types';

const stakingChainIds = new Set<string>(Object.values(AssetHubChains));

type Entry = { accountId: string; name: string };

export type AccountRowsResult = {
  rows: AccountRow[];
  /**
   * False until the balance store holds at least one record for the selection —
   * render a skeleton, never an empty table / zeros.
   */
  ready: boolean;
};

/**
 * The single join hook of the accounts table: every non-zero balance record of
 * the dashboard's selected accountIds, split by purpose and priced, as flat
 * rows. Nothing here starts a subscription — balance fetching is wired in the
 * feature's `index.ts`, staking tracking in `useTrackedContacts`; this only
 * joins the caches they fill and hands each record to `buildAccountRow`.
 * Sorting/filtering happen downstream; the output order is merely stable
 * (groupKey → chainId → assetId).
 */
export const useAccountRows = (accountIds: string[], allEntries: Entry[]): AccountRowsResult => {
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);
  const prices = useUnit(currencySelect.$assetsPrices);
  const currency = useUnit(currencySelect.$activeCurrency);
  const { positions, pending: stakingPending } = useStakingPositions();

  const selectedAccounts = useMemo(() => {
    const selected = new Set(accountIds);
    const byId = new Map<AccountId, AnyAccount>();

    for (const account of allAccounts) {
      if (!selected.has(account.accountId)) continue;
      // First writer wins: a wallet account is a better answer than a virtual
      // signatory placeholder created for the same key.
      if (!byId.has(account.accountId)) {
        byId.set(account.accountId, account);
      }
    }

    return [...byId.values()];
  }, [accountIds, allAccounts]);

  // No chain narrowing — rows span chains, so names resolve chain-agnostically,
  // same as the resolution NamedAccount runs per cell.
  const resolvedAccounts = useAccountsNames(selectedAccounts);

  // `useAccountsNames` maps to a fresh array every render, so its identity
  // cannot key a memo. The serialized (accountId, name) content below is the
  // dep on purpose — it keeps `nameByAccountId`, and therefore the rows array,
  // referentially stable across unrelated re-renders.
  const resolvedNamesKey = JSON.stringify(resolvedAccounts.map((account) => [account.accountId, account.name]));

  const nameByAccountId = useMemo(() => {
    const names = new Map<string, string>();

    // Contacts have no AnyAccount, their allEntries name is what the UI shows;
    // for wallet accounts the resolved name below overwrites the raw one.
    for (const entry of allEntries) {
      if (!names.has(entry.accountId)) {
        names.set(entry.accountId, entry.name);
      }
    }
    for (const account of resolvedAccounts) {
      names.set(account.accountId, account.name);
    }

    return names;
  }, [allEntries, resolvedNamesKey]);

  const accountByAccountId = useMemo(() => {
    const map = new Map<AccountId, AnyAccount>();
    for (const account of selectedAccounts) {
      map.set(account.accountId, account);
    }

    return map;
  }, [selectedAccounts]);

  const positionByKey = useMemo(() => {
    const map = new Map<string, StakingPosition>();
    for (const position of positions) {
      map.set(`${position.accountId}-${position.chainId}`, position);
    }

    return map;
  }, [positions]);

  return useMemo(() => {
    // Empty selection is an answer, not a pending state.
    if (accountIds.length === 0) return { rows: [], ready: true };

    const selectedIds = new Set(accountIds);
    const rows: AccountRow[] = [];

    for (const balance of Object.values(balanceMap)) {
      if (!selectedIds.has(balance.accountId)) continue;

      const chain = chains[balance.chainId];
      if (!chain) continue;

      const asset = chain.assets.find((chainAsset) => chainAsset.assetId === balance.assetId);
      if (!asset) continue;

      const stakingAsset = getRelaychainAsset(chain.assets);
      const isStakingCell =
        stakingChainIds.has(chain.chainId) && nonNullable(stakingAsset) && asset.assetId === stakingAsset.assetId;
      const position = positionByKey.get(`${balance.accountId}-${balance.chainId}`);
      const account = accountByAccountId.get(balance.accountId) ?? null;
      const wallet = account ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;
      const price = asset.priceId && currency ? (prices[asset.priceId]?.[currency.coingeckoId]?.price ?? null) : null;

      const row = buildAccountRow({
        balance,
        chain,
        networkChain: (chain.parentId ? chains[chain.parentId] : null) ?? chain,
        asset,
        displayName: nameByAccountId.get(balance.accountId) ?? null,
        wallet,
        isStakingCell,
        stakingPending,
        stakeActive: position?.stake.active ?? null,
        price,
      });

      if (row) rows.push(row);
    }

    rows.sort((a, b) => {
      if (a.groupKey !== b.groupKey) return a.groupKey.localeCompare(b.groupKey);
      if (a.chain.chainId !== b.chain.chainId) return a.chain.chainId.localeCompare(b.chain.chainId);

      return a.asset.assetId - b.asset.assetId;
    });

    return { rows, ready: hasBalanceRecords(balanceMap, accountIds) };
  }, [
    accountIds,
    balanceMap,
    chains,
    wallets,
    prices,
    currency,
    stakingPending,
    positionByKey,
    accountByAccountId,
    nameByAccountId,
  ]);
};
