import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { keys, nonNullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../constants';
import { type ChainSourceMeta, type SourceWalk, emptyScan, mergeChainScans, walkSourcePages } from '../source-scan';
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
 * What the indexer says about itself: the chain it indexes, the blocks of it it
 * has processed, and where the chain's head is. Read with every request.
 *
 * An indexer that has not reached the end of the period answers "no rows" for
 * what it has not seen yet, and that answer must not be read as "nothing was
 * paid". The chain is what tells two sources' rewards apart: a reward is an
 * event of exactly one chain.
 */
const INDEXER_STATUS = `
    _metadata {
      genesisHash
      startHeight
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
    genesisHash: z.string().min(1).nullish(),
    startHeight: z.number().int().nullish(),
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

/**
 * What a source declares about itself. One that does not say which chain it
 * indexes, or which blocks it has processed, declares nothing on that point —
 * it is never guessed.
 */
function toSourceMeta(status: IndexerStatus, now: number): ChainSourceMeta {
  const from = status?.startHeight;
  const to = status?.lastProcessedHeight;

  return {
    chain: status?.genesisHash ?? null,
    range: nonNullable(from) && nonNullable(to) ? { from, to } : null,
    upToDate: isCaughtUp(status, now),
  };
}

type FetchStakingRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  baseMap: RewardsMap;
  since?: number;
};

/** One account's reward total as one source holds it. */
type AccountTotal = { accountId: AccountId; amount: string };

/**
 * One row per account: a source's own rows for the same account are its own to
 * add up.
 */
function sumByAccount(rows: { address: string; amount: string }[]): AccountTotal[] {
  const sums = new Map<AccountId, BN>();
  for (const { address, amount } of rows) {
    const accountId = toAccountId(address);
    sums.set(accountId, (sums.get(accountId) ?? new BN(0)).add(new BN(amount)));
  }

  return [...sums].map(([accountId, amount]) => ({ accountId, amount: amount.toString() }));
}

/**
 * What one source holds for the accounts, read on its own. Totals are handed
 * over only when the source was read in full.
 */
async function readSourceTotals(
  { url, addressPrefix }: RewardSource,
  accounts: AccountId[],
  since: number | undefined,
): Promise<SourceWalk<AccountTotal, ChainSourceMeta>> {
  try {
    const client = new GraphQLClient(url);
    const addresses = accounts.map(accountId => toAddress(accountId, { prefix: addressPrefix }));

    if (since !== undefined) {
      // One aggregate row per account, not a paged list.
      const response = await client.request(GET_PERIOD_REWARDS, { addresses, since: since.toString() });
      const parsed = periodRewardsSchema.safeParse(response);
      if (!parsed.success) {
        console.error('Staking: unexpected accountRewards shape from', url, parsed.error);

        return { status: 'failed', meta: null };
      }

      const rows = parsed.data.accountRewards.groupedAggregates.flatMap(({ keys: groupKeys, sum }) => {
        const address = groupKeys[0];

        return address ? [{ address, amount: sum.amount }] : [];
      });

      return { status: 'complete', rows: sumByAccount(rows), meta: toSourceMeta(parsed.data._metadata, Date.now()) };
    }

    const walk = await walkSourcePages(url, MAX_TOTAL_PAGES, async offset => {
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
        meta: toSourceMeta(parsed.data._metadata, Date.now()),
      };
    });

    return walk.status === 'complete' ? { ...walk, rows: sumByAccount(walk.rows) } : walk;
  } catch (error) {
    console.error('Staking: rewards request failed for', url, error);

    return { status: 'failed', meta: null };
  }
}

/**
 * Rewards of the accounts — all-time, or since `since` — over every configured
 * source, how far the figure can be trusted, and where it came from.
 *
 * Each source is read on its own and only a source read in full is used: one
 * that fails, or whose walk is cut short, contributes nothing.
 *
 * A source's total is an aggregate — there are no payouts in it to tell apart —
 * so totals are added together only across sources that say they index
 * different chains: a reward is an event of exactly one chain, and those totals
 * cannot count the same one twice. Sources of the same chain hold the same
 * rewards: a total they agree on is counted once, one they disagree on is a
 * conflict and is left out of the figure. A source that does not say which
 * chain it indexes is not added to another source's total at all.
 *
 * The figure is `complete` only when every source is in it, has indexed up to
 * now, and none of them disagree; otherwise it is a lower bound (`partial`),
 * and with no source in it it says nothing (`unavailable`) — the zeroes of
 * `baseMap` are then placeholders, not "earned nothing".
 */
export const fetchStakingRewards = async ({
  accounts,
  rewardSources,
  baseMap,
  since,
}: FetchStakingRewardsParams): Promise<StakingRewards> => {
  if (accounts.length === 0) return { rewards: baseMap, completeness: 'complete', scan: emptyScan('block') };

  const sources = await Promise.all(
    rewardSources.map(async source => ({ url: source.url, walk: await readSourceTotals(source, accounts, since) })),
  );

  const { records, completeness, scan } = mergeChainScans({
    sources,
    getId: total => total.accountId,
    isSame: (a, b) => a.amount === b.amount,
  });

  const sums = new Map<AccountId, BN>();
  for (const accountId of keys(baseMap)) {
    const value = baseMap[accountId];
    if (value !== undefined) {
      sums.set(accountId, new BN(value));
    }
  }

  // Every total left here belongs to a different chain, or to another account.
  for (const { accountId, amount } of records) {
    sums.set(accountId, (sums.get(accountId) ?? new BN(0)).add(new BN(amount)));
  }

  const rewards: RewardsMap = { ...baseMap };
  for (const [accountId, amount] of sums) {
    rewards[accountId] = amount.toString();
  }

  return { rewards, completeness, scan };
};

type FetchMonthlyRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since: number;
};

async function readSourceRecords(
  { url, addressPrefix }: RewardSource,
  accounts: AccountId[],
  since: number,
): Promise<SourceWalk<MonthlyRewardRecord, ChainSourceMeta>> {
  try {
    const client = new GraphQLClient(url);
    const addresses = accounts.map(accountId => toAddress(accountId, { prefix: addressPrefix }));

    return await walkSourcePages(url, MAX_RECORD_PAGES, async offset => {
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

      return { rows: nodes, totalCount, meta: toSourceMeta(parsed.data._metadata, Date.now()) };
    });
  } catch (error) {
    console.error('Staking: monthly rewards request failed for', url, error);

    return { status: 'failed', meta: null };
  }
}

/** Two sources of one chain hold the same payout only when every field agrees. */
function isSamePayout(a: MonthlyRewardRecord, b: MonthlyRewardRecord): boolean {
  return (
    a.address === b.address &&
    a.amount === b.amount &&
    a.type === b.type &&
    a.blockNumber === b.blockNumber &&
    a.timestamp === b.timestamp
  );
}

/**
 * Every payout the accounts received since `since`, from every configured
 * source, whether the list is whole, and where it came from.
 *
 * Each source is read on its own and only a source read in full is used. A
 * payout is identified by the chain its source says it indexes and by the
 * record id within that chain — the id alone is built from the block number,
 * and two chains reach the same one. A payout two sources of one chain both
 * hold is listed once; one they disagree about is a conflict and is dropped
 * instead of either winning. A source that does not say which chain it indexes
 * is not listed next to another source's payouts at all.
 *
 * The list is `complete` only when every source is in it, has indexed up to
 * now, and no two disagree; otherwise the payouts in it are real but some may
 * be missing (`partial`). `unavailable` — no source is in it; an empty list
 * then says nothing about what was paid.
 */
export const fetchMonthlyRewards = async ({
  accounts,
  rewardSources,
  since,
}: FetchMonthlyRewardsParams): Promise<MonthlyRewards> => {
  if (accounts.length === 0) return { records: [], completeness: 'complete', scan: emptyScan('block') };

  const sources = await Promise.all(
    rewardSources.map(async source => ({ url: source.url, walk: await readSourceRecords(source, accounts, since) })),
  );

  const { records, completeness, scan } = mergeChainScans({
    sources,
    getId: record => record.id,
    isSame: isSamePayout,
  });

  // Oldest first, and never in the order the sources were listed in.
  records.sort((a, b) => a.timestamp - b.timestamp || a.blockNumber - b.blockNumber || a.id.localeCompare(b.id));

  return { records, completeness, scan };
};
