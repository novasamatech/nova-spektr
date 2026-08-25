import { type ChainId } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';

type StakingStorage = typeof stakingPallet.storage;

/**
 * The era-scoped reads the dashboard repeats for every account of the
 * selection: exposure pages per validator, the era's overview walk, the era's
 * reward points. Everything else on the pallet passes straight through.
 */
export type EraStorage = Pick<StakingStorage, 'erasStakersPaged' | 'erasStakersOverview' | 'erasRewardPoints'>;

type Loader<T> = () => Promise<T>;

/**
 * Memo bounds are memory budgets, not correctness limits - an evicted entry is
 * simply read again.
 *
 * - Pages: one entry per (era, validator); a page set is the validator's whole
 *   nominator list (~512 entries). 600 covers one era's elected set on
 *   Polkadot.
 * - Overviews: one entry per era, ~600 entries each. The unclaimed-payout scan
 *   walks up to `historyDepth` eras (84 on Polkadot and Kusama) in one burst,
 *   so the bound has to exceed that or a single stash evicts its own working
 *   set while the reads are still in flight.
 * - Reward points: one entry per era, one number per elected validator.
 */
const PAGED_MEMO_MAX_ENTRIES = 600;
const OVERVIEW_MEMO_MAX_ENTRIES = 128;
const POINTS_MEMO_MAX_ENTRIES = 128;

/**
 * A bounded promise memo. Sharing the promise rather than the value means two
 * callers asking for the same key while the read is in flight join one request;
 * a failed read is dropped so the next caller retries.
 */
function createPromiseMemo<T>(max: number) {
  const entries = new Map<string, Promise<T>>();

  return (key: string, load: Loader<T>): Promise<T> => {
    const existing = entries.get(key);
    if (existing) {
      // Re-insert so the least recently used key is the first to be evicted.
      entries.delete(key);
      entries.set(key, existing);

      return existing;
    }

    const promise = load().catch((error: unknown) => {
      // Only drop our own entry: the key may have been evicted and re-read by
      // a newer caller in the meantime, and that read must stay.
      if (entries.get(key) === promise) {
        entries.delete(key);
      }
      throw error;
    });

    entries.set(key, promise);

    while (entries.size > max) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;

      entries.delete(oldest);
    }

    return promise;
  };
}

/**
 * Memoised era reads for one chain - **for eras that are over, plus the active
 * era's exposures**.
 *
 * Exposures and overviews are written once, when the era starts, and never
 * change. Reward points accumulate while the era runs and freeze when it ends,
 * so callers must only ask this for `era < activeEra` - the payout scan does,
 * and nothing else reads points through here. The dashboard's selection spans
 * many accounts that nominate the same validators, and the unclaimed-payout
 * scan walks the same past eras for every one of them: without the memo,
 * widening the selection from one account to fifty re-read the same pages fifty
 * times over.
 *
 * Bounds are memory budgets, not correctness limits. An exposure page set is a
 * validator's whole nominator list (~512 entries); an overview is one entry per
 * elected validator (~600 on Polkadot).
 */
function createEraStorage(): EraStorage {
  const { storage } = stakingPallet;

  const pagedMemo = createPromiseMemo<Awaited<ReturnType<StakingStorage['erasStakersPaged']>>>(PAGED_MEMO_MAX_ENTRIES);
  const overviewMemo =
    createPromiseMemo<Awaited<ReturnType<StakingStorage['erasStakersOverview']>>>(OVERVIEW_MEMO_MAX_ENTRIES);
  const pointsMemo =
    createPromiseMemo<Awaited<ReturnType<StakingStorage['erasRewardPoints']>>>(POINTS_MEMO_MAX_ENTRIES);

  return {
    erasStakersPaged: (api, era, validator) =>
      pagedMemo(`${era}_${validator}`, () => storage.erasStakersPaged(api, era, validator)),
    erasStakersOverview: (api, era) => overviewMemo(String(era), () => storage.erasStakersOverview(api, era)),
    erasRewardPoints: (api, era) => pointsMemo(String(era), () => storage.erasRewardPoints(api, era)),
  };
}

const eraStorageByChain = new Map<ChainId, EraStorage>();

/** The chain's memoised era reads; created on first use, kept for the session. */
export function getEraStorage(chainId: ChainId): EraStorage {
  let eraStorage = eraStorageByChain.get(chainId);
  if (!eraStorage) {
    eraStorage = createEraStorage();
    eraStorageByChain.set(chainId, eraStorage);
  }

  return eraStorage;
}

/** Drops every chain's memo - for tests that reuse a chain id across cases. */
export const __test = {
  OVERVIEW_MEMO_MAX_ENTRIES,
  reset() {
    eraStorageByChain.clear();
  },
};
