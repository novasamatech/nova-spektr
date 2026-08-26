import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain, type EraIndex } from '@/shared/core';
import { eraThresholds, useActiveEra, useEraAnchor, useEraThresholds } from '@/domains/staking';
import { useApi } from '@/entities/network';
import { NO_CHAIN } from '../lib/constants';
import { deriveEraDateMs } from '../lib/era';
import { planckToTokens } from '../lib/format';

export type MinStakeRow = {
  era: EraIndex;
  /** Entry threshold in planck, for exact/fiat rendering. */
  minStake: string;
  /** The same threshold in token units, for the plot and labels. */
  tokens: number;
  validatorCount: number;
  /**
   * When the era started, or `null` when honesty forbids a date — see
   * `deriveEraDateMs`.
   */
  dateMs: number | null;
  isActive: boolean;
};

type Result = {
  /**
   * Oldest era first, the active era last. `undefined` until the read answers —
   * or when it failed.
   */
  rows: MinStakeRow[] | undefined;
  /** Still waiting. `false` with `rows === undefined` means the read gave up. */
  pending: boolean;
};

/**
 * Entry thresholds of the past `depth` completed eras plus the active one. The
 * active era's exposures are fixed at election, so its threshold is readable —
 * and leads the card — while the era is still running.
 */
export const useMinStakeRows = (chain: Chain | null, precision: number, depth: number): Result => {
  const chainId = chain?.chainId ?? NO_CHAIN;
  const api = useApi(chainId);
  // Asset Hub carries neither `session` nor `babe`, so era timing is read off
  // the relay chain — the same pairing the rewards chart uses.
  const relayApi = useApi(chain?.parentId ?? chainId);

  const { data: activeEra } = useActiveEra({ chainId, api });
  const anchor = useEraAnchor({ chainId, api, timelineApi: relayApi ?? api, chain });

  const { data: thresholds, pending } = useEraThresholds({
    chainId,
    api,
    era: activeEra ?? null,
    depth,
  });
  const failedWindows = useUnit(eraThresholds.$failedWindows);
  const failed =
    api !== null &&
    activeEra !== undefined &&
    eraThresholds.eraThresholdsResource.createKey({ chainId, api, era: activeEra, depth }) in failedWindows;

  const rows = useMemo(() => {
    if (thresholds === undefined || activeEra === undefined) return undefined;

    return thresholds.map<MinStakeRow>((threshold) => ({
      era: threshold.era,
      minStake: threshold.minStake,
      tokens: planckToTokens(threshold.minStake, precision),
      validatorCount: threshold.validatorCount,
      dateMs: deriveEraDateMs(anchor, threshold.era),
      isActive: threshold.era === activeEra,
    }));
  }, [thresholds, activeEra, anchor, precision]);

  return { rows, pending: !failed && (pending || rows === undefined) };
};
