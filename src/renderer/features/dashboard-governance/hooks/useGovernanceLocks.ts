import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type ClaimAction } from '@/shared/api/governance';
import { getRoundedValue } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { useAssetsPrices } from '@/domains/price';
import { claimScheduleService, votingService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { walletSelect } from '@/aggregates/wallet-select';
import { type GovernanceLockRow, type ToFiat, buildLockRows, compareLockRows } from '../lib/buildLockRows';
import { collectClaimable } from '../lib/collectClaimable';
import { type UnlockBlockReason, resolveUnlockAccount } from '../lib/resolveUnlockAccount';

import { KUSAMA_AH_CHAIN_ID, POLKADOT_AH_CHAIN_ID } from './constants';
import { useChainGovernanceData } from './useChainGovernanceData';

export type { GovernanceLockRow } from '../lib/buildLockRows';

/**
 * The release re-derived at the moment of the click, or why there is none:
 * `nothing-claimable` when the lock was released (or re-held) since the row was
 * drawn, otherwise the block reason the fresh actions ran into.
 */
export type FreshClaim =
  | { status: 'ready'; actions: ClaimAction[]; amount: BN; initiator: AnyAccount; target: AccountId }
  | { status: 'blocked'; reason: UnlockBlockReason | 'nothing-claimable' };

export const useGovernanceLocks = (accountIds: string[]) => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);
  const chains = useUnit(networkModel.$chains);
  const allAccounts = useUnit(walletModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);

  const polkadot = useChainGovernanceData(POLKADOT_AH_CHAIN_ID, accountIds);
  const kusama = useChainGovernanceData(KUSAMA_AH_CHAIN_ID, accountIds);

  const rows = useMemo(() => {
    const toFiat: ToFiat | null =
      fiatFlag && prices && currency
        ? (amount, precision, priceId) => {
            const price = prices[priceId]?.[currency.coingeckoId];
            return price ? getRoundedValue(amount, price.price, precision) : null;
          }
        : null;
    const now = Date.now();
    const shared = { allAccounts, wallets, toFiat, now, preferredWalletId: selectedWalletId };

    return [
      ...buildLockRows({ data: polkadot, chain: chains[POLKADOT_AH_CHAIN_ID], ...shared }),
      ...buildLockRows({ data: kusama, chain: chains[KUSAMA_AH_CHAIN_ID], ...shared }),
    ].sort(compareLockRows);
  }, [polkadot, kusama, chains, allAccounts, wallets, selectedWalletId, fiatFlag, prices, currency]);

  /**
   * Re-runs the claim schedule for one row against the live head. The row's
   * figures come from a 5-minute block snapshot; a referendum that ended since
   * may have added a required remove_vote.
   */
  const getFreshClaim = useCallback(
    (row: GovernanceLockRow): FreshClaim => {
      const data = row.chainId === POLKADOT_AH_CHAIN_ID ? polkadot : kusama;
      const votingByTrack = data?.votingMap[row.accountId];

      // Nothing live to re-run against: sign exactly what the row shows.
      if (!data?.scheduleInputs || data.liveBlock === null || !votingByTrack) {
        if (row.claimableActions.length === 0) return { status: 'blocked', reason: 'nothing-claimable' };
        if (!row.initiator) return { status: 'blocked', reason: row.blockReason ?? 'no-signer' };

        return {
          status: 'ready',
          actions: row.claimableActions,
          amount: row.claimable,
          initiator: row.initiator,
          target: row.target,
        };
      }

      const schedule = claimScheduleService.estimateClaimSchedule({
        currentBlockNumber: data.liveBlock,
        referendums: data.scheduleInputs.referendums,
        tracks: data.tracks,
        trackLocks: data.scheduleInputs.trackLocks[row.accountId] ?? {},
        votingByTrack,
        undecidingTimeout: data.scheduleInputs.undecidingTimeout,
        voteLockingPeriod: data.scheduleInputs.voteLockingPeriod,
      });

      const { actions, amount } = collectClaimable(schedule);
      if (actions.length === 0) return { status: 'blocked', reason: 'nothing-claimable' };

      // The initiator on the row was resolved against the snapshot's actions. A
      // remove_vote that appeared since is origin-bound, so a permissionless
      // payer would no longer be allowed to send it — resolve again on the
      // fresh actions.
      const { initiator, target, reason } = resolveUnlockAccount({
        lockedAccountId: row.accountId,
        candidates: allAccounts.filter((account) => account.accountId === row.accountId),
        chain: row.chain,
        allAccounts,
        actions,
        preferredWalletId: selectedWalletId,
      });
      if (!initiator) return { status: 'blocked', reason: reason ?? 'no-signer' };

      return { status: 'ready', actions, amount, initiator, target };
    },
    [polkadot, kusama, allAccounts, selectedWalletId],
  );

  /**
   * Whether the row's account still delegates on the live voting data. The rows
   * are derived from that same data, so this only differs from the row for a
   * click that lands right after a revoke elsewhere.
   */
  const hasLiveDelegation = useCallback(
    (row: GovernanceLockRow): boolean => {
      const data = row.chainId === POLKADOT_AH_CHAIN_ID ? polkadot : kusama;
      const votingByTrack = data?.votingMap[row.accountId];
      if (!votingByTrack) return row.delegations.length > 0;

      return Object.values(votingByTrack).some((voting) => votingService.isDelegating(voting));
    },
    [polkadot, kusama],
  );

  const pending =
    accountIds.length > 0 &&
    ((polkadot === null && kusama === null) || (polkadot?.pending ?? false) || (kusama?.pending ?? false));

  return { rows, pending, fiatFlag: Boolean(fiatFlag), currency, getFreshClaim, hasLiveDelegation };
};
