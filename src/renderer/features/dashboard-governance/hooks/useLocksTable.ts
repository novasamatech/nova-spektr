import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { useNotification } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { governanceUnlockFlow } from '@/features/governance-unlock-flow';
import { type GovernanceLockRow } from '../lib/buildLockRows';
import { type LockTotals, sumLockTotals } from '../lib/sumLockTotals';
import { BLOCK_REASON_HINT } from '../ui/LockActionCell';

import { useGovernanceLocks } from './useGovernanceLocks';

export type LockChainOption = { chainId: string; chainName: string; chainIcon: string };

export type LocksTableState = {
  /** Every row, claimable first — what the compact card shows. */
  rows: GovernanceLockRow[];
  /** `rows` after the full-screen filters. */
  visibleRows: GovernanceLockRow[];
  pending: boolean;
  fiatFlag: boolean;
  currency: CurrencyItem | null;
  /**
   * `null` while fiat is off or prices are not in — the strip then has nothing
   * to say.
   */
  totals: LockTotals | null;
  uniqueChains: LockChainOption[];
  chainFilter: string | null;
  setChainFilter: (chainId: string | null) => void;
  claimableOnly: boolean;
  setClaimableOnly: (value: boolean) => void;
  onUnlock: (row: GovernanceLockRow) => void;
};

/**
 * One table state for the Unlock Schedule card and its full-screen modal: both
 * read the same rows and dispatch the same click, and a filter set in the modal
 * is still in effect the next time it opens.
 */
export const useLocksTable = (accountIds: string[]): LocksTableState => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const unlockRequested = useUnit(governanceUnlockFlow.unlockRequested);
  const { rows, pending, fiatFlag, currency, getFreshClaim } = useGovernanceLocks(accountIds);

  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [claimableOnly, setClaimableOnly] = useState(false);

  const onUnlock = useCallback(
    (row: GovernanceLockRow) => {
      // The row's figures come from a periodic snapshot; re-run the schedule
      // against the live head so a just-ended referendum still gets its
      // `remove_vote` — and so the initiator is the one allowed to send it.
      const fresh = getFreshClaim(row);

      // The button promised a release the live head no longer backs: say so
      // rather than swallowing the click — the row catches up on the next snapshot.
      if (fresh.status === 'blocked') {
        toast.info(
          fresh.reason === 'nothing-claimable'
            ? t('dashboard.governanceLocks.toast.nothingClaimable')
            : t(BLOCK_REASON_HINT[fresh.reason]),
        );

        return;
      }

      unlockRequested({
        chain: row.chain,
        initiator: fresh.initiator,
        target: fresh.target,
        actions: fresh.actions,
        amount: fresh.amount,
      });
    },
    [getFreshClaim, unlockRequested, toast, t],
  );

  const uniqueChains = useMemo(() => {
    const seen = new Map<string, LockChainOption>();
    for (const row of rows) {
      if (!seen.has(row.chainId)) {
        seen.set(row.chainId, { chainId: row.chainId, chainName: row.chainName, chainIcon: row.chainIcon });
      }
    }

    return [...seen.values()];
  }, [rows]);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (chainFilter && row.chainId !== chainFilter) return false;
        if (claimableOnly && row.claimable.isZero()) return false;

        return true;
      }),
    [rows, chainFilter, claimableOnly],
  );

  const totals = useMemo(() => (fiatFlag && currency ? sumLockTotals(rows) : null), [rows, fiatFlag, currency]);

  return {
    rows,
    visibleRows,
    pending,
    fiatFlag,
    currency,
    totals,
    uniqueChains,
    chainFilter,
    setChainFilter,
    claimableOnly,
    setClaimableOnly,
    onUnlock,
  };
};
