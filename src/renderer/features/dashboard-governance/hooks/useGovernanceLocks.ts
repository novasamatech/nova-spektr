import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type ClaimAction } from '@/shared/api/governance';
import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { getRoundedValue, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { useAssetsPrices } from '@/domains/price';
import { claimScheduleService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { collectClaimable } from '../lib/collectClaimable';
import { type UnlockBlockReason, resolveUnlockAccount } from '../lib/resolveUnlockAccount';

import { KUSAMA_AH_CHAIN_ID, POLKADOT_AH_CHAIN_ID } from './constants';
import { type ChainGovernanceData, useChainGovernanceData } from './useChainGovernanceData';

const DAY_MS = 86_400_000;

export type GovernanceLockRow = {
  key: string;
  accountId: AccountId;
  chainId: ChainId;
  chain: Chain;
  chainName: string;
  chainIcon: string;
  symbol: string;
  precision: number;
  /**
   * The wallet that signs — the initiator's wallet; `null` when nothing local
   * signs.
   */
  wallet: Wallet | null;
  locked: BN;
  lockedFiat: string | null;
  claimable: BN;
  claimableFiat: string | null;
  claimableActions: ClaimAction[];
  pending: BN;
  /** Estimated ms timestamp of the next pending release; `null` when unknown. */
  nextUnlockAtMs: number | null;
  /** Days until `nextUnlockAtMs`, rounded and floored at 0; `null` when unknown. */
  daysUntilNextUnlock: number | null;
  delegated: BN;
  delegatedFiat: string | null;
  tracks: string[];
  initiator: AnyAccount | null;
  target: AccountId;
  blockReason: UnlockBlockReason | null;
  /** Sorting helpers */
  claimableNum: number;
  lockedNum: number;
};

export type FreshClaim = { actions: ClaimAction[]; amount: BN; initiator: AnyAccount; target: AccountId } | null;

type ToFiat = (amount: string, precision: number, priceId: string) => string | null;

function buildRows(
  data: ChainGovernanceData | null,
  chain: Chain | undefined,
  allAccounts: AnyAccount[],
  wallets: Wallet[],
  toFiat: ToFiat | null,
  now: number,
): GovernanceLockRow[] {
  if (!data || !chain) return [];

  const rows: GovernanceLockRow[] = [];

  for (const [rawId, summary] of Object.entries(data.locksByAccount)) {
    if (summary.maxLock.isZero()) continue;

    const accountId = toAccountId(rawId);
    const candidates = allAccounts.filter((account) => account.accountId === accountId);
    const { initiator, target, reason } = resolveUnlockAccount({
      lockedAccountId: accountId,
      candidates,
      chain,
      allAccounts,
      actions: summary.claimableActions,
    });
    const wallet = initiator ? (wallets.find((w) => w.id === initiator.walletId) ?? null) : null;

    const fiat = (value: BN) => (toFiat ? toFiat(value.toString(), data.precision, data.priceId) : null);
    const nextUnlockAtMs =
      summary.nextUnlockBlock !== null && data.blockTimeMs !== null && data.currentBlock !== null
        ? now + (summary.nextUnlockBlock - data.currentBlock) * data.blockTimeMs
        : null;
    const daysUntilNextUnlock =
      nextUnlockAtMs !== null ? Math.max(0, Math.round((nextUnlockAtMs - now) / DAY_MS)) : null;

    rows.push({
      key: `${data.chainId}:${accountId}`,
      accountId,
      chainId: data.chainId,
      chain,
      chainName: data.chainName,
      chainIcon: data.icon.colored,
      symbol: data.symbol,
      precision: data.precision,
      wallet,
      locked: summary.maxLock,
      lockedFiat: fiat(summary.maxLock),
      claimable: summary.claimable,
      claimableFiat: summary.claimable.isZero() ? null : fiat(summary.claimable),
      claimableActions: summary.claimableActions,
      pending: summary.pending,
      nextUnlockAtMs,
      daysUntilNextUnlock,
      delegated: summary.delegated,
      delegatedFiat: summary.delegated.isZero() ? null : fiat(summary.delegated),
      tracks: summary.tracks,
      initiator,
      target,
      blockReason: reason,
      claimableNum: Number(summary.claimable.toString()),
      lockedNum: Number(summary.maxLock.toString()),
    });
  }

  return rows;
}

export const useGovernanceLocks = (accountIds: string[]) => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);
  const chains = useUnit(networkModel.$chains);
  const allAccounts = useUnit(walletModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);

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

    return [
      ...buildRows(polkadot, chains[POLKADOT_AH_CHAIN_ID], allAccounts, wallets, toFiat, now),
      ...buildRows(kusama, chains[KUSAMA_AH_CHAIN_ID], allAccounts, wallets, toFiat, now),
    ].sort((a, b) => b.claimable.cmp(a.claimable) || b.locked.cmp(a.locked));
  }, [polkadot, kusama, chains, allAccounts, wallets, fiatFlag, prices, currency]);

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
        if (!row.initiator || row.claimableActions.length === 0) return null;

        return {
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
      if (actions.length === 0) return null;

      // The initiator on the row was resolved against the snapshot's actions. A
      // remove_vote that appeared since is origin-bound, so a permissionless
      // payer would no longer be allowed to send it — resolve again on the
      // fresh actions.
      const { initiator, target } = resolveUnlockAccount({
        lockedAccountId: row.accountId,
        candidates: allAccounts.filter((account) => account.accountId === row.accountId),
        chain: row.chain,
        allAccounts,
        actions,
      });
      if (!initiator) return null;

      return { actions, amount, initiator, target };
    },
    [polkadot, kusama, allAccounts],
  );

  const pending =
    accountIds.length > 0 &&
    ((polkadot === null && kusama === null) || (polkadot?.pending ?? false) || (kusama?.pending ?? false));

  return { rows, pending, fiatFlag: Boolean(fiatFlag), currency, getFreshClaim };
};
