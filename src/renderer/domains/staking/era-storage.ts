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
      entries.delete(key);
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
 * Memoised era reads for one chain.
 *
 * An era's exposures, overviews and reward points are written once, when the
 * era starts, and never change - so every read below is safe to share across
 * callers and across time. The dashboard's selection spans many accounts that
 * nominate the same validators, and the unclaimed-payout scan walks the same
 * past eras for every one of them: without the memo, widening the selection
 * from one account to fifty re-read the same pages fifty times over.
 *
 * Bounds are memory budgets, not correctness limits. An exposure page set is a
 * validator's whole nominator list (~512 entries); an overview is one entry per
 * elected validator (~600 on Polkadot).
 */
function createEraStorage(): EraStorage {
  const { storage } = stakingPallet;

  const pagedMemo = createPromiseMemo<Awaited<ReturnType<StakingStorage['erasStakersPaged']>>>(600);
  const overviewMemo = createPromiseMemo<Awaited<ReturnType<StakingStorage['erasStakersOverview']>>>(32);
  const pointsMemo = createPromiseMemo<Awaited<ReturnType<StakingStorage['erasRewardPoints']>>>(128);

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
