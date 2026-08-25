import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { getRelaychainAsset, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { type EraValidatorMap, type StakingPosition, validators as validatorsStore } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { useStakingPositions } from '@/aggregates/staking-positions';
import { useVisibleDrafts } from '@/features/drafts';
import { type PositionRow, averageApy, calculateSharePercent, getMultisigThreshold, getPositionAccess } from '../lib';

import { useDraftPolicy } from './useDraftPolicy';
import { useSignerAccountIds } from './useSignerAccountIds';

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
 * A validator earns its own APY — the commission-adjusted figure the era
 * pipeline already computed for it; `null` while it is not elected. An earning
 * nominator position is worth exactly what backs it, so its APY is the mean of
 * the validators that actually do. A nominator position that earns nothing has
 * no such set, and the honest answer there is what it _would_ earn — the mean
 * of what it nominates. `null` when the chain reports no reward data at all.
 */
function derivePositionApy(position: StakingPosition, eraValidators: EraValidatorMap | null): number | null {
  if (nullable(eraValidators)) return null;

  if (position.kind === 'validator') {
    return eraValidators[position.stake.stash]?.apy ?? null;
  }

  const source = position.activeValidators.length > 0 ? position.activeValidators : position.nominations;

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

  // One set for the whole table: `getPositionAccess` runs per row and would
  // otherwise rebuild it every time.
  const signerAccountIds = useSignerAccountIds();

  // Same reasoning for the draft rule, which additionally has to be asked of
  // every chain the table can show — a proxy edge exists on one network and not
  // on another, so the answer is per (address, chain), not per address. Only
  // the chains the user is actually looking at: the account filter is applied
  // first, so a filtered-out network costs nothing.
  const visiblePositions = useMemo(
    () => positions.filter((position) => nullable(selectedIds) || selectedIds.has(position.accountId)),
    [positions, selectedIds],
  );
  const positionChainIds = useMemo(
    () => [...new Set(visiblePositions.map((position) => position.chainId))],
    [visiblePositions],
  );
  const draftPolicy = useDraftPolicy(positionChainIds);

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
    const visible = visiblePositions;

    // The share column is a share of what the user is looking at. Using the
    // aggregate's chain total instead would make the column add up to less than
    // 100% the moment the dashboard's account filter hides a position.
    const chainTotals = new Map<ChainId, BN>();
    for (const position of visible) {
      const current = chainTotals.get(position.chainId) ?? BN_ZERO;
      chainTotals.set(position.chainId, current.add(new BN(position.stake.active)));
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
        access: getPositionAccess({
          account,
          accountId: position.accountId,
          chainId: position.chainId,
          wallets,
          signerAccountIds,
          draftPolicy,
        }),
        multisig: getMultisigThreshold(account),
        status: position.status,
        staked: position.stake.active,
        sharePercent: calculateSharePercent(
          position.stake.active,
          (chainTotals.get(position.chainId) ?? BN_ZERO).toString(),
        ),
        apy: derivePositionApy(position, chainValidators),
        activeValidatorCount: position.activeValidators.length,
        nominationCount: position.nominations.length,
        draftCount: draftCountByKey.get(`${position.chainId}-${position.accountId}`) ?? 0,
      });
    }

    return { rows, pending, draftsAvailable };
  }, [
    visiblePositions,
    chains,
    wallets,
    signerAccountIds,
    draftPolicy,
    accountByAccountId,
    eraValidators,
    draftCountByKey,
    pending,
    draftsAvailable,
  ]);
};
