import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { keys, nonNullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DataCompleteness } from '../completeness';
import { AssetHubChains } from '../constants';
import {
  type MonthlyRewardRecord,
  type MonthlyRewards,
  type RewardSource,
  type RewardsMap,
  type StakingRewards,
} from '../types';

const ASSET_HUB_CHAIN_IDS = new Set(Object.values(AssetHubChains));

function isAssetHubChain(chain?: Chain | null): boolean {
  if (!chain) return false;
  return ASSET_HUB_CHAIN_IDS.has(chain.chainId);
}

function collectRewardSources(
  sourceChain: Chain | undefined,
  type: ExternalType,
  map: Map<string, RewardSource>,
): void {
  if (!sourceChain) return;
  const external = sourceChain.externalApi?.[type];
  if (!external) return;

  for (const item of external) {
    if (item.type !== 'subquery' || map.has(item.url)) continue;

    map.set(item.url, {
      url: item.url,
      addressPrefix: sourceChain.addressPrefix,
    });
  }
}

/**
 * How much of the chain graph is walked when looking for a chain's reward
 * sources.
 *
 * - `staking-chain` — the caller already knows `chain` is where the stake lives
 *   (a position's chain, the chain a claim landed on). Everything the chain
 *   itself and its relay can answer with is taken, with no question of whether
 *   the chain happens to be an Asset Hub.
 * - `chain-family` — `chain` comes from a plain chain list and may sit on either
 *   side of the staking migration, so the relation has to be derived rather
 *   than assumed.
 */
type RewardSourceScope = 'staking-chain' | 'chain-family';

/**
 * Every subquery endpoint that can answer for `chain`'s staking rewards.
 *
 * An Asset Hub needs more than one. Staking moved to the hub from its relay
 * chain, so rewards earned before the migration are only in the _relay's_
 * staking indexer, while what came after is served by the hub's own staking and
 * history indexers. Reading a single endpoint makes a stake look like it earned
 * nothing on one side of the migration date.
 *
 * The reverse walk — from a chain down to the Asset Hubs that name it as their
 * parent — is `chain-family` only. It exists because those callers iterate a
 * chain list and can hand us the _relay_, whose post-migration rewards now live
 * on its hub; a `staking-chain` caller already holds the hub itself, so walking
 * down from it would only pull in unrelated parachains.
 */
function collectChainRewardSources(
  chain: Chain,
  chainsMap: Record<ChainId, Chain>,
  scope: RewardSourceScope,
): RewardSource[] {
  const uniqueSources = new Map<string, RewardSource>();

  collectRewardSources(chain, ExternalType.STAKING, uniqueSources);

  if (scope === 'staking-chain' || isAssetHubChain(chain)) {
    collectRewardSources(chain, ExternalType.HISTORY, uniqueSources);

    if (chain.parentId) {
      collectRewardSources(chainsMap[chain.parentId], ExternalType.STAKING, uniqueSources);
    }
  }

  if (scope === 'chain-family') {
    for (const candidate of Object.values(chainsMap)) {
      if (candidate.parentId !== chain.chainId) continue;
      if (!isAssetHubChain(candidate)) continue;

      collectRewardSources(candidate, ExternalType.HISTORY, uniqueSources);
    }
  }

  return [...uniqueSources.values()];
}

export { collectChainRewardSources, collectRewardSources, isAssetHubChain };

/**
 * Pure helpers for callers that need reward sources for **several** chains at
 * once and therefore cannot go through the per-chain `useRewardSources` hook.
 */
export const rewardsService = { collectChainRewardSources, collectRewardSources, isAssetHubChain };

/**
 * Page size of a single indexer request. The query service caps a list asked
 * for without `first` at this size, silently — so every list is paged.
 */
const PAGE_SIZE = 100;
/**
 * Hard stop for paging payout records. A walk that runs into it is reported as
 * cut short.
 */
const MAX_RECORD_PAGES = 100;
/** Hard stop for paging all-time totals, one row per account. */
const MAX_TOTAL_PAGES = 20;
/**
 * How many blocks an indexer may trail the chain head and still count as caught
 * up.
 */
const MAX_INDEXER_LAG_BLOCKS = 100;
/**
 * How long an indexer may go without processing a block and still count as
 * running.
 */
const MAX_INDEXER_IDLE_MS = 60 * 60 * 1000;

/**
 * Where the indexer stands. Read with every request: an indexer that has not
 * reached the end of the period answers "no rows" for what it has not seen yet,
 * and that answer must not be read as "nothing was paid".
 */
const INDEXER_STATUS = `
    _metadata {
      lastProcessedHeight
      targetHeight
      lastProcessedTimestamp
    }
`;

const GET_TOTAL_REWARDS = `
  query Rewards($addresses: [String!]!, $first: Int!, $offset: Int!) {
    ${INDEXER_STATUS}
    accumulatedRewards(first: $first, offset: $offset, orderBy: ID_ASC, filter: { id: { in: $addresses } }) {
      totalCount
      nodes {
        id
        amount
      }
    }
  }
`;

const GET_PERIOD_REWARDS = `
  query RewardsForPeriod($addresses: [String!]!, $since: BigFloat!) {
    ${INDEXER_STATUS}
    accountRewards(filter: {
      address: { in: $addresses }
      timestamp: { greaterThanOrEqualTo: $since }
    }) {
      groupedAggregates(groupBy: ADDRESS) {
        keys
        sum { amount }
      }
    }
  }
`;

const GET_MONTHLY_REWARDS = `
  query MonthlyRewards($addresses: [String!]!, $since: BigFloat!, $first: Int!, $offset: Int!) {
    ${INDEXER_STATUS}
    accountRewards(
      first: $first
      offset: $offset
      filter: {
        address: { in: $addresses }
        timestamp: { greaterThanOrEqualTo: $since }
      }
      orderBy: [TIMESTAMP_ASC, ID_ASC]
    ) {
      totalCount
      nodes {
        id
        address
        amount
        timestamp
        blockNumber
        type
      }
    }
  }
`;

/** External schemas — validated at runtime, never trusted. */
const amountSchema = z.union([z.string().regex(/^-?\d+$/), z.number().int()]).transform(String);
const integerSchema = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]).transform(Number);

/**
 * Every field may be missing or `null` on some indexers — that is "unknown
 * where the indexer stands", which never counts as caught up.
 */
const indexerStatusSchema = z
  .object({
    lastProcessedHeight: z.number().int().nullish(),
    targetHeight: z.number().int().nullish(),
    lastProcessedTimestamp: integerSchema.nullish(),
  })
  .nullish();

type IndexerStatus = z.infer<typeof indexerStatusSchema>;

const totalRewardsSchema = z.object({
  _metadata: indexerStatusSchema,
  accumulatedRewards: z.object({
    totalCount: z.number().int().nonnegative(),
    nodes: z.array(z.object({ id: z.string().min(1), amount: amountSchema })),
  }),
});

const periodRewardsSchema = z.object({
  _metadata: indexerStatusSchema,
  accountRewards: z.object({
    groupedAggregates: z.array(z.object({ keys: z.array(z.string()), sum: z.object({ amount: amountSchema }) })),
  }),
});

const monthlyRewardsSchema = z.object({
  _metadata: indexerStatusSchema,
  accountRewards: z.object({
    totalCount: z.number().int().nonnegative(),
    nodes: z.array(
      z.object({
        id: z.string().min(1),
        address: z.string().min(1),
        amount: amountSchema,
        timestamp: integerSchema,
        blockNumber: integerSchema,
        type: z.string(),
      }),
    ),
  }),
});

/**
 * The indexer has processed the chain up to its head, recently. The period of
 * every reward query ends now, so that is what reaching its end means.
 */
function isCaughtUp(status: IndexerStatus, now: number): boolean {
  const height = status?.lastProcessedHeight;
  const target = status?.targetHeight;
  const processedAt = status?.lastProcessedTimestamp;
  if (!nonNullable(height) || !nonNullable(target) || !nonNullable(processedAt)) return false;

  return target - height <= MAX_INDEXER_LAG_BLOCKS && now - processedAt <= MAX_INDEXER_IDLE_MS;
}

/** What one source said, kept apart from every other source's answer. */
type SourceRead<T> = {
  value: T;
  /** Every row of the filtered set was read, from one consistent set. */
  paged: boolean;
  /** The indexer has reached the end of the period. */
  covers: boolean;
};

type Page<T> = { rows: T[]; totalCount: number; status: IndexerStatus };

/**
 * Pages through one indexer's list until `totalCount` is reached.
 *
 * Where the indexer stands and how many rows the set holds are fixed by the
 * first page: a count that moves while paging means rows were added or removed
 * under the scan, so the pages no longer form one set and the read is cut
 * short. Running into `maxPages` is cut short too. A page that cannot be read,
 * or an empty page before `totalCount`, makes the whole read unusable
 * (`null`).
 */
async function readPages<T>(
  url: string,
  maxPages: number,
  requestPage: (offset: number) => Promise<Page<T> | null>,
): Promise<SourceRead<T[]> | null> {
  const rows: T[] = [];
  let expectedCount: number | null = null;
  let covers = false;
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await requestPage(offset);
    if (!result) return null;

    if (expectedCount === null) {
      expectedCount = result.totalCount;
      covers = isCaughtUp(result.status, Date.now());
    } else if (result.totalCount !== expectedCount) {
      return { value: rows, paged: false, covers };
    }

    rows.push(...result.rows);
    offset += result.rows.length;
    if (offset >= expectedCount) return { value: rows, paged: true, covers };

    if (result.rows.length === 0) {
      console.error('Staking: indexer returned fewer reward rows than it promised', url);

      return null;
    }
  }

  return { value: rows, paged: false, covers };
}

/**
 * How far an answer merged from several sources can be trusted. The sources
 * hold different slices of the same history (before and after the staking
 * migration), so one that did not answer, was cut short or has not reached the
 * end of the period leaves a hole nobody else fills.
 */
function mergedCompleteness(answers: readonly (SourceRead<unknown> | null)[], hasConflicts: boolean): DataCompleteness {
  const answered = answers.filter(nonNullable);
  if (answered.length === 0) return 'unavailable';

  const complete =
    answered.length === answers.length && !hasConflicts && answered.every(answer => answer.paged && answer.covers);

  return complete ? 'complete' : 'partial';
}

type FetchStakingRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  baseMap: RewardsMap;
  since?: number;
};

/**
 * What one source holds for the accounts. `null` — the source did not answer,
 * or its answer could not be read in full; nothing of it is used.
 */
async function fetchSourceRewards(
  { url, addressPrefix }: RewardSource,
  accounts: AccountId[],
  since: number | undefined,
): Promise<SourceRead<Map<AccountId, BN>> | null> {
  try {
    const client = new GraphQLClient(url);
    const addresses = accounts.map(accountId => toAddress(accountId, { prefix: addressPrefix }));

    const sumByAccount = (rows: { address: string; amount: string }[]) => {
      const sums = new Map<AccountId, BN>();
      for (const { address, amount } of rows) {
        const accountId = toAccountId(address);
        sums.set(accountId, (sums.get(accountId) ?? new BN(0)).add(new BN(amount)));
      }

      return sums;
    };

    if (since !== undefined) {
      // One aggregate row per account, not a paged list.
      const response = await client.request(GET_PERIOD_REWARDS, { addresses, since: since.toString() });
      const parsed = periodRewardsSchema.safeParse(response);
      if (!parsed.success) {
        console.error('Staking: unexpected accountRewards shape from', url, parsed.error);

        return null;
      }

      const rows = parsed.data.accountRewards.groupedAggregates.flatMap(({ keys: groupKeys, sum }) => {
        const address = groupKeys[0];

        return address ? [{ address, amount: sum.amount }] : [];
      });

      return { value: sumByAccount(rows), paged: true, covers: isCaughtUp(parsed.data._metadata, Date.now()) };
    }

    const read = await readPages(url, MAX_TOTAL_PAGES, async offset => {
      const response = await client.request(GET_TOTAL_REWARDS, { addresses, first: PAGE_SIZE, offset });
      const parsed = totalRewardsSchema.safeParse(response);
      if (!parsed.success) {
        console.error('Staking: unexpected accumulatedRewards shape from', url, parsed.error);

        return null;
      }

      const { totalCount, nodes } = parsed.data.accumulatedRewards;

      return {
        rows: nodes.map(({ id, amount }) => ({ address: id, amount })),
        totalCount,
        status: parsed.data._metadata,
      };
    });
    if (!read) return null;

    return { ...read, value: sumByAccount(read.value) };
  } catch (error) {
    console.error('Staking: rewards request failed for', url, error);

    return null;
  }
}

/**
 * Rewards of the accounts — all-time, or since `since` — summed over every
 * configured source, and how far the sum can be trusted.
 *
 * Each source is read on its own and only its whole answer is added: a source
 * that fails contributes nothing. The sum is `complete` only when every source
 * answered in full and has indexed up to now; otherwise it is a lower bound
 * (`partial`), and with no source answering it says nothing (`unavailable`) —
 * the zeroes of `baseMap` are then placeholders, not "earned nothing".
 */
export const fetchStakingRewards = async ({
  accounts,
  rewardSources,
  baseMap,
  since,
}: FetchStakingRewardsParams): Promise<StakingRewards> => {
  if (accounts.length === 0) return { rewards: baseMap, completeness: 'complete' };
  if (rewardSources.length === 0) return { rewards: baseMap, completeness: 'unavailable' };

  const answers = await Promise.all(rewardSources.map(source => fetchSourceRewards(source, accounts, since)));

  const sums = new Map<AccountId, BN>();
  for (const accountId of keys(baseMap)) {
    const value = baseMap[accountId];
    if (value !== undefined) {
      sums.set(accountId, new BN(value));
    }
  }

  // Safe to add up: every source is a different indexer (deduplicated by URL),
  // each indexes one chain, and a payout is an event of exactly one chain.
  for (const answer of answers.filter(nonNullable)) {
    for (const [accountId, amount] of answer.value) {
      sums.set(accountId, (sums.get(accountId) ?? new BN(0)).add(amount));
    }
  }

  const rewards: RewardsMap = { ...baseMap };
  for (const [accountId, amount] of sums) {
    rewards[accountId] = amount.toString();
  }

  return { rewards, completeness: mergedCompleteness(answers, false) };
};

type FetchMonthlyRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since: number;
};

async function fetchSourceRecords(
  { url, addressPrefix }: RewardSource,
  accounts: AccountId[],
  since: number,
): Promise<SourceRead<MonthlyRewardRecord[]> | null> {
  try {
    const client = new GraphQLClient(url);
    const addresses = accounts.map(accountId => toAddress(accountId, { prefix: addressPrefix }));

    return await readPages(url, MAX_RECORD_PAGES, async offset => {
      const response = await client.request(GET_MONTHLY_REWARDS, {
        addresses,
        since: since.toString(),
        first: PAGE_SIZE,
        offset,
      });
      const parsed = monthlyRewardsSchema.safeParse(response);
      if (!parsed.success) {
        console.error('Staking: unexpected accountRewards shape from', url, parsed.error);

        return null;
      }

      const { totalCount, nodes } = parsed.data.accountRewards;

      return { rows: nodes, totalCount, status: parsed.data._metadata };
    });
  } catch (error) {
    console.error('Staking: monthly rewards request failed for', url, error);

    return null;
  }
}

/**
 * Identity of one payout across indexers. The record id alone is not enough: it
 * is built from the block number, and two chains' block numbers coincide — the
 * same payout read twice carries the same id, block and time.
 */
function payoutKey({ id, blockNumber, timestamp }: MonthlyRewardRecord): string {
  return `${id}@${blockNumber}:${timestamp}`;
}

function isSamePayout(a: MonthlyRewardRecord, b: MonthlyRewardRecord): boolean {
  return a.address === b.address && a.amount === b.amount && a.type === b.type;
}

/**
 * Every payout the accounts received since `since`, from every configured
 * source, and whether the list is whole.
 *
 * Each source is read on its own: one that fails contributes no rows. A payout
 * two sources both hold is listed once; one they disagree about is dropped
 * instead of either silently winning. The list is `complete` only when every
 * source answered in full, has indexed up to now, and no two disagree;
 * otherwise the payouts in it are real but some may be missing (`partial`).
 * `unavailable` — no source answered; an empty list then says nothing about
 * what was paid.
 */
export const fetchMonthlyRewards = async ({
  accounts,
  rewardSources,
  since,
}: FetchMonthlyRewardsParams): Promise<MonthlyRewards> => {
  if (accounts.length === 0) return { records: [], completeness: 'complete' };
  if (rewardSources.length === 0) return { records: [], completeness: 'unavailable' };

  const answers = await Promise.all(rewardSources.map(source => fetchSourceRecords(source, accounts, since)));

  const merged = new Map<string, MonthlyRewardRecord>();
  const conflicts = new Set<string>();

  for (const answer of answers.filter(nonNullable)) {
    for (const record of answer.value) {
      const key = payoutKey(record);
      const known = merged.get(key);

      if (known && !isSamePayout(known, record)) {
        conflicts.add(key);
      }
      merged.set(key, record);
    }
  }

  for (const key of conflicts) {
    merged.delete(key);
  }

  const records = [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);

  return { records, completeness: mergedCompleteness(answers, conflicts.size > 0) };
};
