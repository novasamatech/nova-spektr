import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRelaychainAsset, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { type EraValidatorMap, validators as validatorsStore } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { useStakingPositions } from '@/aggregates/staking-positions';
import { useVisibleDrafts } from '@/features/drafts';
import { type PositionRow, averageApy, calculateSharePercent, getAccessMode, getMultisigThreshold } from '../lib';

export type PositionRowsResult = {
  rows: PositionRow[];
  /** The first load has not finished — render skeletons, not an empty state. */
  pending: boolean;
  /** Drafts could not be read (backend down, or no permission). */
  draftsAvailable: boolean;
};

/**
 * The APY the row shows.
 *
 * An earning position is worth exactly what backs it, so its APY is the mean of
 * the validators that actually do. A position that earns nothing has no such
 * set, and the honest answer there is what it _would_ earn — the mean of what
 * it nominates. `null` when the chain reports no reward data at all.
 */
function derivePositionApy(
  activeValidators: AccountId[],
  nominations: AccountId[],
  eraValidators: EraValidatorMap | null,
): number | null {
  if (nullable(eraValidators)) return null;

  const source = activeValidators.length > 0 ? activeValidators : nominations;

  return averageApy(source.map((accountId) => eraValidators[accountId]?.apy));
}

/**
 * Every staking position of the dashboard's current account selection, as table
 * rows.
 *
 * Nothing here starts a subscription: `aggregates/staking-positions` already
 * drives every read this needs, so the widget only joins the caches it filled.
 */
export const usePositionRows = (accountIds: string[]): PositionRowsResult => {
  const { positions, pending } = useStakingPositions();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);
  const eraValidators = useUnit(validatorsStore.validatorsResource.$cache);
  const { drafts, available: draftsAvailable } = useVisibleDrafts();

  const selectedIds = useMemo(() => {
    if (accountIds.length === 0) return null;

    return new Set(accountIds.map((id) => toAccountId(id)));
  }, [accountIds]);

  const accountByAccountId = useMemo(() => {
    const map = new Map<AccountId, (typeof allAccounts)[number]>();

    for (const account of allAccounts) {
      // First writer wins: a wallet account is a better answer than a virtual
      // signatory placeholder created for the same key.
      if (!map.has(account.accountId)) {
        map.set(account.accountId, account);
      }
    }

    return map;
  }, [allAccounts]);

  const draftCountByKey = useMemo(() => {
    const counts = new Map<string, number>();
    if (!draftsAvailable) return counts;

    for (const draft of drafts) {
      if (nullable(draft.initiatorAccountId)) continue;

      const key = `${draft.chainId}-${draft.initiatorAccountId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  }, [drafts, draftsAvailable]);

  return useMemo(() => {
    const visible = positions.filter((position) => nullable(selectedIds) || selectedIds.has(position.accountId));

    // The share column is a share of what the user is looking at. Using the
    // aggregate's chain total instead would make the column add up to less than
    // 100% the moment the dashboard's account filter hides a position.
    const chainTotals = new Map<ChainId, BN>();
    for (const position of visible) {
      const current = chainTotals.get(position.chainId) ?? BN_ZERO;
      chainTotals.set(position.chainId, current.add(new BN(position.stake.total)));
    }

    const rows: PositionRow[] = [];

    for (const position of visible) {
      const chain = chains[position.chainId];
      if (nullable(chain)) continue;

      const asset = getRelaychainAsset(chain.assets);
      if (nullable(asset)) continue;

      const account = accountByAccountId.get(position.accountId) ?? null;
      const wallet = nonNullable(account) ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;
      const chainValidators = eraValidators[position.chainId] ?? null;

      rows.push({
        id: `${position.chainId}-${position.accountId}`,
        position,
        accountId: position.accountId,
        chain,
        asset,
        account,
        wallet,
        accessMode: getAccessMode(account, wallets),
        multisig: getMultisigThreshold(account),
        status: position.status,
        staked: position.stake.total,
        sharePercent: calculateSharePercent(
          position.stake.total,
          (chainTotals.get(position.chainId) ?? BN_ZERO).toString(),
        ),
        apy: derivePositionApy(position.activeValidators, position.nominations, chainValidators),
        activeValidatorCount: position.activeValidators.length,
        nominationCount: position.nominations.length,
        draftCount: draftCountByKey.get(`${position.chainId}-${position.accountId}`) ?? 0,
      });
    }

    return { rows, pending, draftsAvailable };
  }, [
    positions,
    selectedIds,
    chains,
    wallets,
    accountByAccountId,
    eraValidators,
    draftCountByKey,
    pending,
    draftsAvailable,
  ]);
};
