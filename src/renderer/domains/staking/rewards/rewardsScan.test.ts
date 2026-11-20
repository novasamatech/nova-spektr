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

/**
 * A second indexer of the Asset Hub chain — the same rewards behind another
 * address.
 */
const ASSET_HUB_MIRROR: RewardSource = { url: 'https://asset-hub-mirror.test', addressPrefix: 0 };

const RELAY_CHAIN = '0xrelay';
const ASSET_HUB_CHAIN = '0xhub';

/** The chain each test indexer says it indexes, unless a test says otherwise. */
const CHAIN_OF: Record<string, string> = {
  [RELAY.url]: RELAY_CHAIN,
  [ASSET_HUB.url]: ASSET_HUB_CHAIN,
  [ASSET_HUB_MIRROR.url]: ASSET_HUB_CHAIN,
};

const SINCE = 1_700_000_000;
const BASE_MAP: RewardsMap = { [ALICE]: '0', [BOB]: '0' };

type IndexerStatus = {
  genesisHash?: string | null;
  startHeight?: number | null;
  lastProcessedHeight: number | null;
  targetHeight: number | null;
  lastProcessedTimestamp: string | null;
} | null;

/** An indexer at the chain head, processing right now. */
const caughtUp = (): IndexerStatus => ({
  startHeight: 1,
  lastProcessedHeight: 5000,
  targetHeight: 5000,
  lastProcessedTimestamp: String(Date.now()),
});

/** An indexer far behind the chain head. */
const lagging = (): IndexerStatus => ({
  startHeight: 1,
  lastProcessedHeight: 1000,
  targetHeight: 5000,
  lastProcessedTimestamp: String(Date.now()),
});

/** An indexer at the chain head that does not say which chain it follows. */
const withoutChain = (): IndexerStatus => ({
  genesisHash: null,
  startHeight: 1,
  lastProcessedHeight: 5000,
  targetHeight: 5000,
  lastProcessedTimestamp: String(Date.now()),
});

/**
 * Serves the handler's answers as the source would: an answer that does not
 * name its chain itself is given the chain of the source.
 */
function serve(source: RewardSource, handler: Handler) {
  const declaring: Handler = async (query, variables) => {
    const response = await handler(query, variables);
    if (!isAnswer(response) || !response._metadata || response._metadata.genesisHash !== undefined) return response;

    return { ...response, _metadata: { ...response._metadata, genesisHash: CHAIN_OF[source.url] } };
  };

  indexer.handlers.set(source.url, declaring as (query: string, variables: never) => unknown);
}

function isAnswer(response: unknown): response is { _metadata?: IndexerStatus } {
  return typeof response === 'object' && response !== null;
}

/** Makes the source answer after every source that is not slowed down. */
function slow(handler: Handler): Handler {
  return async (query, variables) => {
    await new Promise(resolve => setTimeout(resolve, 10));

    return handler(query, variables);
  };
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

    expect(result).toMatchObject({ rewards: { [ALICE]: '350', [BOB]: '40' }, completeness: 'complete' });
  });

  test('should be complete with zeroes when every source answers that nothing was earned', async () => {
    serve(RELAY, () => periodRewards({}));
    serve(ASSET_HUB, () => periodRewards({}));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: BASE_MAP, completeness: 'complete' });
  });

  test('should be partial when one source is down, keeping what the other one answered', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    down(ASSET_HUB);

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should take an answer of an unexpected shape as no answer', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => ({ unexpected: true }));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should add nothing of a source whose answer cannot be read in full', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [BOB_ADDRESS]: '40', [ALICE_ADDRESS]: 'not-a-number' }));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should be unavailable when every source is down', async () => {
    down(RELAY);
    down(ASSET_HUB);

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: BASE_MAP, completeness: 'unavailable' });
  });

  test('should be unavailable when there is no source to ask', async () => {
    const result = await fetchPeriod([]);

    expect(result).toMatchObject({ rewards: BASE_MAP, completeness: 'unavailable' });
  });

  test('should be complete when there is no account to ask about', async () => {
    const result = await fetchStakingRewards({ accounts: [], rewardSources: [RELAY], baseMap: {}, since: SINCE });

    expect(result).toMatchObject({ rewards: {}, completeness: 'complete' });
  });

  test('should be partial when an indexer has not reached the end of the period', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250' }, lagging()));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '350', [BOB]: '0' }, completeness: 'partial' });
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

    expect(result).toMatchObject({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
  });

  test('should say which chain and blocks every source stands for', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250' }, lagging()));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result.scan).toEqual({
      unit: 'block',
      sources: [
        {
          url: ASSET_HUB.url,
          chain: ASSET_HUB_CHAIN,
          status: 'complete',
          merged: true,
          range: { from: 1, to: 1000 },
          upToDate: false,
        },
        {
          url: RELAY.url,
          chain: RELAY_CHAIN,
          status: 'complete',
          merged: true,
          range: { from: 1, to: 5000 },
          upToDate: true,
        },
      ],
      missing: [],
      conflicts: [],
    });
  });

  test('should count a total two sources of one chain agree on once', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250', [BOB_ADDRESS]: '40' }));
    serve(ASSET_HUB_MIRROR, () => periodRewards({ [ALICE_ADDRESS]: '250', [BOB_ADDRESS]: '40' }));

    const result = await fetchPeriod([RELAY, ASSET_HUB, ASSET_HUB_MIRROR]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '350', [BOB]: '40' }, completeness: 'complete' });
  });

  test('should report a total two sources of one chain disagree on as a conflict and leave it out', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250', [BOB_ADDRESS]: '40' }));
    serve(ASSET_HUB_MIRROR, () => periodRewards({ [ALICE_ADDRESS]: '999', [BOB_ADDRESS]: '40' }));

    const result = await fetchPeriod([RELAY, ASSET_HUB, ASSET_HUB_MIRROR]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '100', [BOB]: '40' }, completeness: 'partial' });
    expect(result.scan.conflicts).toEqual([`${ASSET_HUB_CHAIN}:${ALICE}`]);
  });

  test('should not add a source that does not name its chain to another source', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250' }, withoutChain()));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '100', [BOB]: '0' }, completeness: 'partial' });
    expect(result.scan.sources[0]).toEqual(
      expect.objectContaining({ url: ASSET_HUB.url, chain: null, status: 'complete', merged: false }),
    );
  });

  test('should present no figure when no source names its chain', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }, withoutChain()));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250' }, withoutChain()));

    const result = await fetchPeriod([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ rewards: BASE_MAP, completeness: 'unavailable' });
  });

  test('should take the only source as it is even when it does not name its chain', async () => {
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250' }, withoutChain()));

    const result = await fetchPeriod([ASSET_HUB]);

    expect(result).toMatchObject({ rewards: { [ALICE]: '250', [BOB]: '0' }, completeness: 'complete' });
  });

  test('should answer the same whichever source is listed first', async () => {
    serve(RELAY, () => periodRewards({ [ALICE_ADDRESS]: '100' }));
    serve(ASSET_HUB, () => periodRewards({ [ALICE_ADDRESS]: '250', [BOB_ADDRESS]: '40' }));
    serve(ASSET_HUB_MIRROR, () => periodRewards({ [ALICE_ADDRESS]: '999', [BOB_ADDRESS]: '40' }));

    const forward = await fetchPeriod([RELAY, ASSET_HUB, ASSET_HUB_MIRROR]);
    const backward = await fetchPeriod([ASSET_HUB_MIRROR, ASSET_HUB, RELAY]);

    expect(backward).toEqual(forward);
  });

  test('should answer the same whichever source answers first', async () => {
    const relay: Handler = () => periodRewards({ [ALICE_ADDRESS]: '100' });
    const hub: Handler = () => periodRewards({ [ALICE_ADDRESS]: '250', [BOB_ADDRESS]: '40' });
    const mirror: Handler = () => periodRewards({ [ALICE_ADDRESS]: '999', [BOB_ADDRESS]: '40' });
    const sources = [RELAY, ASSET_HUB, ASSET_HUB_MIRROR];

    serve(RELAY, relay);
    serve(ASSET_HUB, slow(hub));
    serve(ASSET_HUB_MIRROR, mirror);
    const hubLast = await fetchPeriod(sources);

    serve(RELAY, slow(relay));
    serve(ASSET_HUB, hub);
    serve(ASSET_HUB_MIRROR, slow(mirror));
    const hubFirst = await fetchPeriod(sources);

    expect(hubLast.rewards).toEqual({ [ALICE]: '100', [BOB]: '40' });
    expect(hubFirst).toEqual(hubLast);
  });

  describe('all-time totals', () => {
    const fetchTotal = (rewardSources: RewardSource[]) =>
      fetchStakingRewards({ accounts: [ALICE, BOB], rewardSources, baseMap: BASE_MAP });

    test('should sum every source into a complete answer when all of them answer', async () => {
      serve(RELAY, () => totalRewards({ [ALICE_ADDRESS]: '1000' }));
      serve(ASSET_HUB, () => totalRewards({ [ALICE_ADDRESS]: '500', [BOB_ADDRESS]: '7' }));

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toMatchObject({ rewards: { [ALICE]: '1500', [BOB]: '7' }, completeness: 'complete' });
    });

    test('should be partial when one source is down', async () => {
      down(RELAY);
      serve(ASSET_HUB, () => totalRewards({ [ALICE_ADDRESS]: '500' }));

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toMatchObject({ rewards: { [ALICE]: '500', [BOB]: '0' }, completeness: 'partial' });
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

      expect(result).toMatchObject({ rewards: { [ALICE]: '1000', [BOB]: '0' }, completeness: 'partial' });
    });

    test('should add nothing of an indexer that fails on its second page', async () => {
      serve(RELAY, () => totalRewards({ [ALICE_ADDRESS]: '1000' }));
      serve(ASSET_HUB, (_query, { offset = 0 }) => {
        if (offset > 0) throw new Error('indexer down');

        return totalPage([{ id: ALICE_ADDRESS, amount: '500' }], 2);
      });

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toMatchObject({ rewards: { [ALICE]: '1000', [BOB]: '0' }, completeness: 'partial' });
      expect(result.scan.sources).toEqual([
        expect.objectContaining({ url: ASSET_HUB.url, status: 'failed', merged: false, chain: ASSET_HUB_CHAIN }),
        expect.objectContaining({ url: RELAY.url, status: 'complete', merged: true }),
      ]);
    });

    test('should add nothing of an indexer whose walk stops at the page limit before totalCount', async () => {
      serve(RELAY, () => totalRewards({ [ALICE_ADDRESS]: '1000' }));
      serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
        totalPage(
          Array.from({ length: first }, (_, index) => ({
            id: offset + index === 0 ? ALICE_ADDRESS : `account-${offset + index}`,
            amount: '1',
          })),
          1_000_000,
        ),
      );

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toMatchObject({ rewards: { [ALICE]: '1000', [BOB]: '0' }, completeness: 'partial' });
      expect(result.scan.sources[0]).toEqual(
        expect.objectContaining({ url: ASSET_HUB.url, status: 'cut-short', merged: false }),
      );
    });

    test('should be unavailable when the only indexer stops at the page limit', async () => {
      serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
        totalPage(
          Array.from({ length: first }, (_, index) => ({ id: `account-${offset + index}`, amount: '1' })),
          1_000_000,
        ),
      );

      const result = await fetchTotal([ASSET_HUB]);

      expect(result).toMatchObject({ rewards: BASE_MAP, completeness: 'unavailable' });
    });

    test('should be unavailable when every source is down', async () => {
      down(RELAY);
      down(ASSET_HUB);

      const result = await fetchTotal([RELAY, ASSET_HUB]);

      expect(result).toMatchObject({ rewards: BASE_MAP, completeness: 'unavailable' });
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

  test('should use no row of an indexer that fails on its second page', async () => {
    const payouts = manyPayouts(150);
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) => {
      if (offset > 0) throw new Error('indexer down');

      return monthlyPage(payouts.slice(offset, offset + first), payouts.length);
    });

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1']);
    expect(result.scan.sources).toEqual([
      expect.objectContaining({ url: ASSET_HUB.url, status: 'failed', merged: false, chain: ASSET_HUB_CHAIN }),
      expect.objectContaining({ url: RELAY.url, status: 'complete', merged: true }),
    ]);
  });

  test('should use no row of an indexer whose walk stops at the page limit before totalCount', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
      monthlyPage(
        Array.from({ length: first }, (_, index) =>
          payout(`${offset + index}-9`, ALICE_ADDRESS, '1', SINCE + offset + index),
        ),
        1_000_000,
      ),
    );

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1']);
    expect(result.scan.sources[0]).toEqual(
      expect.objectContaining({ url: ASSET_HUB.url, status: 'cut-short', merged: false }),
    );
  });

  test('should use no row of an indexer whose set grows while it is being paged', async () => {
    const payouts = manyPayouts(150);
    serve(ASSET_HUB, (_query, { offset = 0, first = 1 }) =>
      monthlyPage(payouts.slice(offset, offset + first), offset === 0 ? 150 : 151),
    );

    const result = await fetchMonthly([ASSET_HUB]);

    expect(result).toMatchObject({ records: [], completeness: 'unavailable' });
    expect(result.scan.sources[0]?.status).toEqual('cut-short');
  });

  test('should be partial when an indexer has not reached the end of the period', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyPage([hubPayout], 1, lagging()));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1', '2-1']);
  });

  test('should list a payout two indexers of one chain both hold once', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));
    serve(ASSET_HUB_MIRROR, () => monthlyRewards([hubPayout]));

    const result = await fetchMonthly([RELAY, ASSET_HUB, ASSET_HUB_MIRROR]);

    expect(result.completeness).toEqual('complete');
    expect(result.records.map(record => record.id)).toEqual(['1-1', '2-1']);
  });

  test('should report a payout two indexers of one chain disagree on as a conflict and drop it', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));
    serve(ASSET_HUB_MIRROR, () => monthlyRewards([{ ...hubPayout, amount: '999' }]));

    const result = await fetchMonthly([RELAY, ASSET_HUB, ASSET_HUB_MIRROR]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1']);
    expect(result.scan.conflicts).toEqual([`${ASSET_HUB_CHAIN}:2-1`]);
  });

  test('should take the same id at another block or time as a conflict, not as a second payout', async () => {
    serve(ASSET_HUB, () => monthlyRewards([hubPayout]));
    serve(ASSET_HUB_MIRROR, () => monthlyRewards([{ ...hubPayout, timestamp: String(SINCE + 21) }]));

    const result = await fetchMonthly([ASSET_HUB, ASSET_HUB_MIRROR]);

    expect(result.completeness).toEqual('partial');
    expect(result.records).toEqual([]);
    expect(result.scan.conflicts).toEqual([`${ASSET_HUB_CHAIN}:2-1`]);
  });

  test('should keep two payouts of different chains that share an id, a block and a time', async () => {
    // Ids are built from the block number, and two chains reach the same one.
    serve(RELAY, () => monthlyRewards([payout('7-1', ALICE_ADDRESS, '100', SINCE + 10, 7)]));
    serve(ASSET_HUB, () => monthlyRewards([payout('7-1', ALICE_ADDRESS, '100', SINCE + 10, 7)]));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.records).toHaveLength(2);
  });

  test('should not list the payouts of a source that does not name its chain next to another source', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyPage([hubPayout], 1, withoutChain()));

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.records.map(record => record.id)).toEqual(['1-1']);
    expect(result.scan.sources[0]).toEqual(
      expect.objectContaining({ url: ASSET_HUB.url, chain: null, status: 'complete', merged: false }),
    );
  });

  test('should answer the same whichever source is listed first', async () => {
    serve(RELAY, () => monthlyRewards([relayPayout]));
    serve(ASSET_HUB, () => monthlyRewards([hubPayout, payout('3-1', ALICE_ADDRESS, '5', SINCE + 30)]));
    serve(ASSET_HUB_MIRROR, () => monthlyRewards([{ ...hubPayout, amount: '999' }]));

    const forward = await fetchMonthly([RELAY, ASSET_HUB, ASSET_HUB_MIRROR]);
    const backward = await fetchMonthly([ASSET_HUB_MIRROR, ASSET_HUB, RELAY]);

    expect(backward).toEqual(forward);
  });

  test('should answer the same whichever source answers first', async () => {
    const relay: Handler = () => monthlyRewards([relayPayout]);
    const hub: Handler = () => monthlyRewards([hubPayout, payout('3-1', ALICE_ADDRESS, '5', SINCE + 30)]);
    const mirror: Handler = () => monthlyRewards([{ ...hubPayout, amount: '999' }]);
    const sources = [RELAY, ASSET_HUB, ASSET_HUB_MIRROR];

    serve(RELAY, relay);
    serve(ASSET_HUB, slow(hub));
    serve(ASSET_HUB_MIRROR, mirror);
    const hubLast = await fetchMonthly(sources);

    serve(RELAY, slow(relay));
    serve(ASSET_HUB, hub);
    serve(ASSET_HUB_MIRROR, slow(mirror));
    const hubFirst = await fetchMonthly(sources);

    expect(hubLast.records.map(record => record.id)).toEqual(['1-1', '3-1']);
    expect(hubFirst).toEqual(hubLast);
  });

  test('should be unavailable when every source is down', async () => {
    down(RELAY);
    down(ASSET_HUB);

    const result = await fetchMonthly([RELAY, ASSET_HUB]);

    expect(result).toMatchObject({ records: [], completeness: 'unavailable' });
  });

  test('should be unavailable when there is no source to ask', async () => {
    const result = await fetchMonthly([]);

    expect(result).toMatchObject({ records: [], completeness: 'unavailable' });
  });

  test('should be complete when there is no account to ask about', async () => {
    const result = await fetchMonthlyRewards({ accounts: [], rewardSources: [RELAY], since: SINCE });

    expect(result).toMatchObject({ records: [], completeness: 'complete' });
  });
});
