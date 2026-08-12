import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import {
  getNativeAsset,
  getRelaychainAsset,
  nonNullable,
  toAddress,
  toShortAddress,
  totalAmountBN,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts, useAccountsNames } from '@/domains/network';
import { type StakingPosition, AssetHubChains } from '@/domains/staking';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { useStakingPositions } from '@/aggregates/staking-positions';
import { splitBalanceByPurpose } from '../lib/balancePurpose';
import { hasBalanceRecords } from '../lib/balanceRecords';
import { buildRowFiat } from '../lib/rows';
import { type AccountRow } from '../lib/types';
import { getWalletTypeBucket } from '../lib/walletTypeBucket';

const stakingChainIds = new Set<string>(Object.values(AssetHubChains));

type Entry = { accountId: string; name: string; address: string };

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
 * joins the caches they fill. Sorting/filtering happen downstream; the output
 * order is merely stable (groupKey → chainId → assetId).
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
  // cannot key a memo. Serializing the (accountId, name) pairs to a string and
  // deriving the map from that string keeps `nameByAccountId` — and therefore
  // the rows array below — referentially stable across unrelated re-renders.
  const resolvedNamesKey = JSON.stringify(resolvedAccounts.map((account) => [account.accountId, account.name]));

  const nameByAccountId = useMemo(() => {
    const resolvedNames: [string, string][] = JSON.parse(resolvedNamesKey);
    const names = new Map<string, string>();

    // Contacts have no AnyAccount, their allEntries name is what the UI shows;
    // for wallet accounts the resolved name below overwrites the raw one.
    for (const entry of allEntries) {
      if (!names.has(entry.accountId)) {
        names.set(entry.accountId, entry.name);
      }
    }
    for (const [accountId, name] of resolvedNames) {
      names.set(accountId, name);
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
      if (totalAmountBN(balance).isZero()) continue;

      // Governance (conviction) locks can only exist on the chain's native asset.
      const isNativeAsset = asset.assetId === getNativeAsset(chain.assets).assetId;
      const stakingAsset = getRelaychainAsset(chain.assets);
      const isStakingCell =
        stakingChainIds.has(chain.chainId) && nonNullable(stakingAsset) && asset.assetId === stakingAsset.assetId;
      const position = positionByKey.get(`${balance.accountId}-${balance.chainId}`);
      // "—" while staking data is still loading: null, never 0
      const stakedActive = !isStakingCell || stakingPending ? null : new BN(position?.stake.active ?? '0');

      const split = splitBalanceByPurpose(balance, stakedActive, isNativeAsset);
      const price = asset.priceId && currency ? (prices[asset.priceId]?.[currency.coingeckoId]?.price ?? null) : null;
      const fiat = buildRowFiat(split, price, asset.precision);

      const account = accountByAccountId.get(balance.accountId) ?? null;
      const wallet = account ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;

      const displayAddress = toAddress(balance.accountId, { prefix: chain.addressPrefix });
      const shortAddress = toShortAddress(displayAddress, 6);

      rows.push({
        id: `${balance.accountId}-${balance.chainId}-${balance.assetId}`,
        accountId: balance.accountId,
        groupKey: balance.accountId,
        // Rendered group headers must use <NamedAccount title={row.displayName}> so the
        // displayed string and the searched string never diverge (search-patterns rule).
        displayName: nameByAccountId.get(balance.accountId) ?? shortAddress,
        displayAddress,
        shortAddress,
        wallet,
        walletTypeBucket: getWalletTypeBucket(wallet),
        chain,
        networkName: chain.parentId ? (chains[chain.parentId]?.name ?? chain.name) : chain.name,
        asset,
        split,
        totalBN: split.transferable
          .add(split.staked ?? BN_ZERO)
          .add(split.governance ?? BN_ZERO)
          .add(split.other),
        fiat,
      });
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
