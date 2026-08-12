import { useMemo } from 'react';

import { type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { useActiveEra, useEraProgress, useEraThresholds } from '@/domains/staking';
import { useApi } from '@/entities/network';
import { ERA_DEPTH } from '../lib/constants';
import { planckToTokens } from '../lib/format';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Placeholder key for "no chain selected" — resolves to no api, hence no data. */
const NO_CHAIN: ChainId = '0x00';

export type MinStakeRow = {
  era: EraIndex;
  /** Entry threshold in planck, for exact/fiat rendering. */
  minStake: string;
  /** The same threshold in token units, for the plot and labels. */
  tokens: number;
  validatorCount: number;
  /**
   * When the era started, or `null` when it cannot be stated honestly — no
   * anchor yet, or eras shorter than a day (several eras then share a date and
   * any single label would be arbitrary; in practice Kusama's 6h eras).
   */
  dateMs: number | null;
  isActive: boolean;
};

type Result = {
  /** Oldest era first, the active era last. `undefined` until the read answers. */
  rows: MinStakeRow[] | undefined;
  pending: boolean;
};

/**
 * Entry thresholds of the past `ERA_DEPTH` completed eras plus the active one.
 * The active era's exposures are fixed at election, so its threshold is
 * readable — and leads the card — while the era is still running.
 */
export const useMinStakeRows = (chain: Chain | null, precision: number): Result => {
  const chainId = chain?.chainId ?? NO_CHAIN;
  const api = useApi(chainId);
  // Asset Hub carries neither `session` nor `babe`, so era timing is read off
  // the relay chain — the same pairing the rewards chart uses.
  const relayApi = useApi(chain?.parentId ?? chainId);

  const { data: activeEra } = useActiveEra({ chainId, api });
  const { data: progress } = useEraProgress({
    chainId,
    api,
    timelineApi: relayApi ?? api,
    chain,
    era: activeEra ?? null,
  });

  const { data: thresholds, pending } = useEraThresholds({
    chainId,
    api,
    era: activeEra ?? null,
    depth: ERA_DEPTH,
  });

  const rows = useMemo(() => {
    if (thresholds === undefined || activeEra === undefined) return undefined;

    const anchor =
      progress && progress.era === activeEra && progress.eraDurationMs >= DAY_MS
        ? { startMs: progress.eraStartMs, durationMs: progress.eraDurationMs }
        : null;

    return thresholds.map<MinStakeRow>((threshold) => ({
      era: threshold.era,
      minStake: threshold.minStake,
      tokens: planckToTokens(threshold.minStake, precision),
      validatorCount: threshold.validatorCount,
      dateMs: anchor ? anchor.startMs - (activeEra - threshold.era) * anchor.durationMs : null,
      isActive: threshold.era === activeEra,
    }));
  }, [thresholds, activeEra, progress, precision]);

  return { rows, pending: pending || rows === undefined };
};
