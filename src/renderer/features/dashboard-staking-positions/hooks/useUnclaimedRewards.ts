import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { era as eraStore, useActiveEra, useRewardSources, useUnclaimedPayouts } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { type ExpiryUrgency, calculateExpiryDays, getExpiryUrgency } from '../lib';

export type UnclaimedRewards = {
  /** Unclaimed total in planck, `'0'` while unknown. */
  total: string;
  /** Days before the oldest payout falls out of history, `null` when unknown. */
  expiryDays: number | null;
  urgency: ExpiryUrgency | null;
  pending: boolean;
};

const EMPTY: UnclaimedRewards = { total: '0', expiryDays: null, urgency: null, pending: false };

/**
 * Unclaimed payouts of one stash, plus how urgently they need claiming.
 *
 * Deliberately per-stash rather than per-wallet: the underlying resource is a
 * ref-counted pool keyed by (chain, stash, era), so a table of rows asking for
 * their own payouts costs exactly one request each and shares anything already
 * in flight.
 */
export const useUnclaimedRewards = (chain: Chain | null, stash: AccountId | null): UnclaimedRewards => {
  const chains = useUnit(networkModel.$chains);
  const eraProgressCache = useUnit(eraStore.eraProgressResource.$cache);
  const api = useStoreMap({
    store: networkModel.$apis,
    keys: [chain?.chainId ?? null],
    fn: (apis, [chainId]) => (chainId ? (apis[chainId] ?? null) : null),
  });
  const { data: activeEra } = useActiveEra({ chainId: chain?.chainId, api });

  // Without an indexer the payout read falls back to scanning the whole history
  // depth on chain, per account — unaffordable for a table of rows.
  const rewardSources = useRewardSources(chain, chains);

  // A runtime constant, so reading it off the connected api costs nothing and
  // needs no subscription. Older runtimes may not carry it at all.
  const historyDepth = useMemo(() => {
    if (nullable(api)) return null;

    try {
      return stakingPallet.consts.historyDepth(api);
    } catch {
      return null;
    }
  }, [api]);

  const { data: payouts, pending } = useUnclaimedPayouts({
    chainId: chain?.chainId,
    api,
    stash,
    activeEra,
    historyDepth,
    rewardSources,
  });

  return useMemo(() => {
    if (nullable(chain) || nullable(payouts) || payouts.payouts.length === 0) {
      return { ...EMPTY, pending };
    }

    // `payouts` arrives newest first, so the last entry is the one about to
    // expire — the only one whose deadline is worth showing.
    const oldest = payouts.payouts.at(-1);
    const eraProgress = eraProgressCache[chain.chainId];

    const expiryDays =
      nonNullable(oldest) && nonNullable(activeEra) && nonNullable(historyDepth) && nonNullable(eraProgress)
        ? calculateExpiryDays({
            oldestEra: oldest.era,
            activeEra,
            historyDepth,
            eraDurationMs: eraProgress.eraDurationMs,
          })
        : null;

    return {
      total: payouts.total,
      expiryDays,
      urgency: nonNullable(expiryDays) ? getExpiryUrgency(expiryDays) : null,
      pending,
    };
  }, [chain, payouts, pending, activeEra, historyDepth, eraProgressCache]);
};
