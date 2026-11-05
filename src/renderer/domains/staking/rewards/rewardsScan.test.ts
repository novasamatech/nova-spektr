import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type RewardSource, type RewardsMap } from '../types';

import { fetchMonthlyRewards, fetchStakingRewards } from './service';

type Variables = { offset?: number; first?: number };
type Handler = (query: string, variables: Variables) => unknown;

const indexer = vi.hoisted(() => ({ handlers: new Map<string, (query: string, variables: never) => unknown>() }));

vi.mock('graphql-request', () => ({
  GraphQLClient: class {
    constructor(private url: string) {}

    request(query: string, variables: never) {
      const handler = indexer.handlers.get(this.url);
      if (!handler) return Promise.reject(new Error(`no handler for ${this.url}`));

      return Promise.resolve().then(() => handler(query, variables));
    }
  },
}));

const ALICE = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const BOB = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

const ALICE_ADDRESS = toAddress(ALICE, { prefix: 0 });
const BOB_ADDRESS = toAddress(BOB, { prefix: 0 });

const RELAY: RewardSource = { url: 'https://relay.test', addressPrefix: 0 };
const ASSET_HUB: RewardSource = { url: 'https://asset-hub.test', addressPrefix: 0 };

const SINCE = 1_700_000_000;
const BASE_MAP: RewardsMap = { [ALICE]: '0', [BOB]: '0' };

type IndexerStatus = {
  lastProcessedHeight: number | null;
  targetHeight: number | null;
  lastProcessedTimestamp: string | null;
} | null;

/** An indexer at the chain head, processing right now. */
const caughtUp = (): IndexerStatus => ({
  lastProcessedHeight: 5000,
  targetHeight: 5000,
  lastProcessedTimestamp: String(Date.now()),
});

/** An indexer far behind the chain head. */
const lagging = (): IndexerStatus => ({
  lastProcessedHeight: 1000,
  targetHeight: 5000,
  lastProcessedTimestamp: String(Date.now()),
});

function serve(source: RewardSource, handler: Handler) {
  indexer.handlers.set(source.url, handler as (query: string, variables: never) => unknown);
}

function down(source: RewardSource) {
  serve(source, () => {
    throw new Error('indexer down');
  });
}

function periodRewards(amounts: Record<string, string>, status: IndexerStatus = caughtUp()) {
  return {
    _metadata: status,
    accountRewards: {
      groupedAggregates: Object.entries(amounts).map(([address, amount]) => ({ keys: [address], sum: { amount } })),
    },
  };
}

type TotalRow = { id: string; amount: string };

function totalPage(nodes: TotalRow[], totalCount = nodes.length, status: IndexerStatus = caughtUp()) {
  return { _metadata: status, accumulatedRewards: { totalCount, nodes } };
}

function totalRewards(amounts: Record<string, string>) {
  return totalPage(Object.entries(amounts).map(([id, amount]) => ({ id, amount })));
}

function payout(id: string, address: string, amount: string, timestamp: number, blockNumber = 100) {
  return { id, address, amount, timestamp: String(timestamp), blockNumber, type: 'reward' };
}

type Payout = ReturnType<typeof payout>;

function monthlyPage(nodes: Payout[], totalCount = nodes.length, status: IndexerStatus = caughtUp()) {
  return { _metadata: status, accountRewards: { totalCount, nodes } };
}

function monthlyRewards(nodes: Payout[]) {
  return monthlyPage(nodes);
}

/** Serves `rows` page by page, the way the query service does. */
function paged<T>(rows: T[], toPage: (nodes: T[], totalCount: number) => unknown): Handler {
  return (_query, { offset = 0, first = rows.length }) => toPage(rows.slice(offset, offset + first), rows.length);
}

const manyPayouts = (count: number) =>
  Array.from({ length: count }, (_, index) => payout(`${index}-1`, ALICE_ADDRESS, '1', SINCE + index, index));

describe('domains/staking/rewards/service · fetchStakingRewards', () => {
  beforeEach(() => {
    indexer.handlers.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const fetchPeriod = (rewardSources: RewardSource[]) =>
    fetchStakingRewards({ accounts: [ALICE, BOB], rewardSources, baseMap: BASE_MAP, since: SINCE });

  test('should sum every source into a complete answer when all of them answer', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250', [BOB_ADDRESS]: '40' }));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: { [ALICE]: '350', [BOB]: '40' }, completeness: 'complete' });
  });

  test('should be complete with zeroes when every source answers that nothing was earned', async () => {
    serve(RELAY, () => periodRewards({}));
    serve(ASSET_HUB, () => periodRewards({}));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: BASE_MAP, completeness: 'complete' });
  });

  test('should be partial when one source is down, keeping what the other one answered', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    down(ASSET_HUB);

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should take an answer of an unexpected shape as no answer', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => ({ unexpected: true }));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should add nothing of a source whose answer cannot be read in full', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [BOB_ADDRESS]: '40', [ALICE_ADDRESS]: 'not-a-number' }));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should be unavailable when every source is down', async () => {
    down(RELAY);
    down(ASSET_HUB);

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: BASE_MAP, completeness: 'unavailable' });
  });

  test('should be unavailable when there is no source to ask', async () => {
    const result = await fetchPeriod([]);

    expect(result).toEqual({ rewards: BASE_MAP, completeness: 'unavailable' });
  });

  test('should be complete when there is no account to ask about', async () => {
    const result = await fetchStakingRewards({ accounts: [], rewardSources: [RELAY], baseMap: {}, since: SINCE });

    expect(result).toEqual({ rewards: {}, completeness: 'complete' });
  });

  test('should be partial when an indexer has not reached the end of the period', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250' }, lagging()));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: { [ALICE]: '350', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should take an indexer that does not say where it stands as not caught up', async () => {
    serve(RELAY, () =>
      periodRewards(
        { [ALICE_ADDRESS]: '100' },
        { lastProcessedHeight: null, targetHeight: 5000, lastProcessedTimestamp: null },
      ),
    );
    serve(ASSET_HUB, () => periodRewards({}, null));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toEqual({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  describe('all-time totals', () => {
    const fetchTotal = (rewardSources: RewardSource[]) =>
      fetchStakingRewards({ accounts: [ALICE, BOB], rewardSources, baseMap: BASE_MAP });

    test('should sum every source into a complete answer when all of them answer', async () => {
      serve(RELAY, () => totalRewards({ [ALICE_ADDRESS]: '1000' }));
      serve(ASSET_HUB, () => totalRewards({ [ALICE_ADDRESS]: '500', [BOB_ADDRESS]: '7' }));

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toEqual({ rewards: { [ALICE]: '1500', [BOB]: '7' }, completeness: 'complete' });
    });

    test('should be partial when one source is down', async () => {
      down(RELAY);
      serve(ASSET_HUB, () => totalRewards({ [ALICE_ADDRESS]: '500' }));

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toEqual({ rewards: { [ALICE]: '500', [BOB]: '0' }, completeness: 'partial' });
    });

    test('should page through every account before calling the sum complete', async () => {
      const rows = Array.from({ length: 150 }, (_, index) => ({ id: `account-${index}`, amount: '1' }));
      rows[0] = { id: ALICE_ADDRESS, amount: '500' };
      rows[149] = { id: BOB_ADDRESS, amount: '7' };
      serve(
        ASSET_HUB,
        paged(rows, (nodes, totalCount) => totalPage(nodes, totalCount)),
      );

      const result = await fetchTotal([ASSET_HUB]);

      expect(result.completeness).toEqual('complete');
      expect(result.rewards[ALICE]).toEqual('500');
      expect(result.rewards[BOB]).toEqual('7');
    });

    test('should add nothing of an indexer that promised more rows than it delivered', async () => {
      serve(RELAY, () => totalRewards({ [ALICE_ADDRESS]: '1000' }));
      serve(ASSET_HUB, (_query, { offset = 0 }) =>
        totalPage(offset === 0 ? [{ id: BOB_ADDRESS, amount: '7' }] : [], 2),
      );

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toEqual({ rewards: { [ALICE]: '1000', [BOB]: '0' }, completeness: 'partial' });
    });

    test('should be partial when paging stops at the page limit before totalCount', async () => {
      serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
        totalPage(
          Array.from({ length: first }, (_, index) => ({ id: `account-${offset + index}`, amount: '1' })),
          1_000_000,
        ),
      );

      const result = await fetchTotal([ASSET_HUB]);

      expect(result.completeness).toEqual('partial');
    });

    test('should be unavailable when every source is down', async () => {
      down(RELAY);
      down(ASSET_HUB);

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toEqual({ rewards: BASE_MAP, completeness: 'unavailable' });
    });
  });
});

describe('domains/staking/rewards/service · fetchMonthlyRewards', () => {
  beforeEach(() => {
    indexer.handlers.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const fetchMonthly = (rewardSources: RewardSource[]) =>
    fetchMonthlyRewards({ accounts: [ALICE], rewardSources, since: SINCE });

  const relayPayout = payout('1-1', ALICE_ADDRESS, '100', SINCE + 10);
  const hubPayout = payout('2-1', ALICE_ADDRESS, '250', SINCE + 20);

  test('should return the records of every source as a complete answer', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.records).toEqual([
      { id: '1-1', address: ALICE_ADDRESS, amount: '100', timestamp: SINCE + 10, blockNumber: 100, type: 'reward' },
      { id: '2-1', address: ALICE_ADDRESS, amount: '250', timestamp: SINCE + 20, blockNumber: 100, type: 'reward' },
    ]);
  });

  test('should be partial when one source is down, keeping the records of the other', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    down(ASSET_HUB);

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1']);
  });

  test('should take an answer of an unexpected shape as no answer', async () => {
    serve(RELAY, () => ({ accountRewards: { nodes: [{ id: '1-1' }] } }));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['2-1']);
  });

  test('should page through every record before calling the list complete', async () => {
    const payouts = manyPayouts(250);
    serve(ASSET_HUB, paged(payouts, monthlyPage));

    const result = await fetchMonthly([ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.records).toHaveLength(250);
  });

  test('should drop every row of an indexer that promised more rows than it delivered', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, (_query, { offset = 0 }) => monthlyPage(offset === 0 ? [hubPayout] : [], 2));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1']);
  });

  test('should be partial when paging stops at the page limit before totalCount', async () => {
    serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
      monthlyPage(
        Array.from({ length: first }, (_, index) =>
          payout(`${offset + index}-1`, ALICE_ADDRESS, '1', SINCE + offset + index),
        ),
        1_000_000,
      ),
    );

    const result = await fetchMonthly([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.length).toBeGreaterThan(0);
  });

  test('should be partial when the set grows while it is being paged', async () => {
    const payouts = manyPayouts(150);
    serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
      monthlyPage(payouts.slice(offset, offset + first), offset === 0 ? 150 : 151),
    );

    const result = await fetchMonthly([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
  });

  test('should be partial when an indexer has not reached the end of the period', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyPage([hubPayout], 1, lagging()));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1', '2-1']);
  });

  test('should list a payout two indexers both hold once', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout, hubPayout]));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.records.map(record => record.id)).toEqual(['1-1', '2-1']);
  });

  test('should drop a payout two indexers disagree on, whatever order they answer in', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout, { ...hubPayout, amount: '999' }]));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));

    const forward = await fetchMonthly([RELAY, ASSET_HUB]);
    const backward = await fetchMonthly([ASSET_HUB, RELAY]);

    expect(forward.completeness).toEqual('partial');
    expect(forward.records.map(record => record.id)).toEqual(['1-1']);
    expect(backward).toEqual(forward);
  });

  test('should keep two payouts of different chains that happen to share an id', async () => {
    // Ids are built from the block number, and two chains reach the same one.
    serve(RELAY, () => monthlyRewards([payout('7-1', ALICE_ADDRESS, '100', SINCE + 10, 7)]));
    serve(ASSET_HUB, () => monthlyRewards([payout('7-1', ALICE_ADDRESS, '100', SINCE + 90_000, 7)]));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.records).toHaveLength(2);
  });

  test('should be unavailable when every source is down', async () => {
    down(RELAY);
    down(ASSET_HUB);

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result).toEqual({ records: [], completeness: 'unavailable' });
  });

  test('should be unavailable when there is no source to ask', async () => {
    const result = await fetchMonthly([]);

    expect(result).toEqual({ records: [], completeness: 'unavailable' });
  });

  test('should be complete when there is no account to ask about', async () => {
    const result = await fetchMonthlyRewards({ accounts: [], rewardSources: [RELAY], since: SINCE });

    expect(result).toEqual({ records: [], completeness: 'complete' });
  });
});
