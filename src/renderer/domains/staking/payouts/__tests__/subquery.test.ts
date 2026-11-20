import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type RewardSource } from '../../types';
import { fetchNominatorEraValidators } from '../subquery';

type Variables = { offset: number; first: number };
type Handler = (variables: Variables) => unknown;

const indexer = vi.hoisted(() => ({ handlers: new Map<string, (variables: never) => unknown>() }));

vi.mock('graphql-request', () => ({
  GraphQLClient: class {
    constructor(private url: string) {}

    request(_query: string, variables: never) {
      const handler = indexer.handlers.get(this.url);
      if (!handler) return Promise.reject(new Error(`no handler for ${this.url}`));

      return Promise.resolve().then(() => handler(variables));
    }
  },
}));

const STASH = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const VALIDATOR = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

const RELAY: RewardSource = { url: 'https://relay.test', addressPrefix: 0 };
const ASSET_HUB: RewardSource = { url: 'https://asset-hub.test', addressPrefix: 0 };

const RELAY_CHAIN = '0xrelay';
const ASSET_HUB_CHAIN = '0xhub';

const ERA_FROM = 100;
const ERA_TO = 183;

/** The eras an indexer says it holds, oldest to newest. `null` — none at all. */
type Held = [from: number, to: number] | null;

const WHOLE_RANGE: Held = [0, ERA_TO];

function node(era: number, total = '1000') {
  return { era, address: toAddress(VALIDATOR, { prefix: 0 }), own: '0', total };
}

function page(
  nodes: ReturnType<typeof node>[],
  totalCount: number,
  held: Held,
  chain: string | null = ASSET_HUB_CHAIN,
) {
  return {
    indexedFrom: { nodes: held ? [{ era: held[0] }] : [] },
    indexedTo: { nodes: held ? [{ era: held[1] }] : [] },
    _metadata: chain ? { genesisHash: chain } : null,
    eraValidatorInfos: { totalCount, nodes },
  };
}

function serve(source: RewardSource, handler: Handler) {
  indexer.handlers.set(source.url, handler as (variables: never) => unknown);
}

/** Makes the source answer after every source that is not slowed down. */
function slow(handler: Handler): Handler {
  return async variables => {
    await new Promise(resolve => setTimeout(resolve, 10));

    return handler(variables);
  };
}

function fetchExposures(rewardSources: RewardSource[]) {
  return fetchNominatorEraValidators({ rewardSources, stash: STASH, eraFrom: ERA_FROM, eraTo: ERA_TO });
}

const exposure = (era: number, total = '1000') => ({ era, validator: VALIDATOR, own: '0', total });

describe('domains/staking/payouts/subquery', () => {
  beforeEach(() => {
    indexer.handlers.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('should be complete when an indexer pages through everything and holds the whole range', async () => {
    serve(ASSET_HUB, () => page([node(150)], 1, [0, ERA_TO + 1]));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toEqual([exposure(150)]);
  });

  test('should say which indexer stands for which eras', async () => {
    serve(RELAY, () => page([node(120)], 1, [1, 140], RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150)], 1, [141, 200]));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.scan).toEqual({
      unit: 'era',
      sources: [
        {
          url: ASSET_HUB.url,
          chain: ASSET_HUB_CHAIN,
          status: 'complete',
          merged: true,
          range: { from: 141, to: 200 },
          upToDate: true,
        },
        {
          url: RELAY.url,
          chain: RELAY_CHAIN,
          status: 'complete',
          merged: true,
          range: { from: 1, to: 140 },
          upToDate: false,
        },
      ],
      missing: [],
      conflicts: [],
    });
  });

  test('should merge indexers holding different eras into a complete answer', async () => {
    serve(RELAY, () => page([node(120)], 1, [1, 140], RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150)], 1, [141, 200]));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toEqual([exposure(150), exposure(120)]);
  });

  test('should list the eras no indexer holds and stay partial', async () => {
    serve(RELAY, () => page([node(120)], 1, [1, 130], RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150)], 1, [141, 200]));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.scan.missing).toEqual([{ from: 131, to: 140 }]);
    expect(result.exposures).toEqual([exposure(150), exposure(120)]);
  });

  test('should not take an empty answer of an indexer behind the range as complete', async () => {
    serve(RELAY, () => page([], 0, [1, 50], RELAY_CHAIN));
    serve(ASSET_HUB, () => {
      throw new Error('indexer down');
    });

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.exposures).toEqual([]);
    expect(result.completeness).toEqual('partial');
    expect(result.scan.missing).toEqual([{ from: ERA_FROM, to: ERA_TO }]);
  });

  test('should stay partial when the only answering indexer is behind the range', async () => {
    serve(ASSET_HUB, () => page([node(150)], 1, [0, 160]));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toHaveLength(1);
    expect(result.scan.missing).toEqual([{ from: 161, to: ERA_TO }]);
  });

  test('should stay partial when the indexers start after the first era of the range', async () => {
    serve(ASSET_HUB, () => page([node(150)], 1, [120, ERA_TO]));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.scan.missing).toEqual([{ from: ERA_FROM, to: 119 }]);
  });

  test('should let an indexer holding the range answer for one that is behind it', async () => {
    serve(RELAY, () => page([], 0, [1, 50], RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150)], 1, [51, ERA_TO + 1]));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toHaveLength(1);
  });

  test('should use no row of an indexer that fails on its second page', async () => {
    serve(ASSET_HUB, ({ offset }) => {
      if (offset > 0) throw new Error('indexer down');

      return page([node(150)], 2, WHOLE_RANGE);
    });
    serve(RELAY, () => page([node(120)], 1, WHOLE_RANGE, RELAY_CHAIN));

    const result = await fetchExposures([ASSET_HUB, RELAY]);

    expect(result.exposures).toEqual([exposure(120)]);
    expect(result.completeness).toEqual('partial');
    expect(result.scan.sources).toEqual([
      expect.objectContaining({ url: ASSET_HUB.url, status: 'failed', merged: false, chain: ASSET_HUB_CHAIN }),
      expect.objectContaining({ url: RELAY.url, status: 'complete', merged: true }),
    ]);
  });

  test('should use no row of an indexer whose walk stops at the page limit before totalCount', async () => {
    serve(ASSET_HUB, ({ offset, first }) => page([node(offset)], first * 100, WHOLE_RANGE));
    serve(RELAY, () => page([node(120)], 1, WHOLE_RANGE, RELAY_CHAIN));

    const result = await fetchExposures([ASSET_HUB, RELAY]);

    expect(result.exposures).toEqual([exposure(120)]);
    expect(result.completeness).toEqual('partial');
    expect(result.scan.sources[0]).toEqual(
      expect.objectContaining({ url: ASSET_HUB.url, status: 'cut-short', merged: false }),
    );
  });

  test('should be unavailable when the only indexer stops at the page limit', async () => {
    serve(ASSET_HUB, ({ offset, first }) => page([node(offset)], first * 100, WHOLE_RANGE));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.exposures).toEqual([]);
    expect(result.completeness).toEqual('unavailable');
  });

  test('should use no row of an indexer whose set grows while it is being paged', async () => {
    // A row indexed mid-scan lands on a page already read: the count moves and
    // the later pages no longer line up with the earlier ones.
    serve(ASSET_HUB, ({ offset }) => page([node(150 + offset)], offset === 0 ? 2 : 3, WHOLE_RANGE));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.exposures).toEqual([]);
    expect(result.completeness).toEqual('unavailable');
    expect(result.scan.sources[0]?.status).toEqual('cut-short');
  });

  test('should use no row of an indexer that returns fewer rows than it announced', async () => {
    serve(ASSET_HUB, ({ offset }) => page(offset === 0 ? [node(150)] : [], 2, WHOLE_RANGE));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.exposures).toEqual([]);
    expect(result.scan.sources[0]?.status).toEqual('failed');
  });

  test('should judge the held eras by the first page, not by a later one', async () => {
    serve(ASSET_HUB, ({ offset }) => page([node(150 + offset)], 2, [0, offset === 0 ? ERA_TO - 1 : ERA_TO]));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toHaveLength(2);
  });

  test('should keep a row two indexers hold with the same figures once', async () => {
    serve(RELAY, () => page([node(150)], 1, WHOLE_RANGE, RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150), node(151)], 2, WHOLE_RANGE));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toEqual([exposure(151), exposure(150)]);
  });

  test('should report a row two indexers disagree on as a conflict and drop it', async () => {
    serve(RELAY, () => page([node(150, '1000'), node(151)], 2, WHOLE_RANGE, RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150, '2000')], 1, WHOLE_RANGE));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toEqual([exposure(151)]);
    expect(result.scan.conflicts).toEqual([`150-${VALIDATOR}`]);
  });

  test('should answer the same whichever indexer is listed first', async () => {
    serve(RELAY, () => page([node(150, '1000'), node(151), node(120)], 3, WHOLE_RANGE, RELAY_CHAIN));
    serve(ASSET_HUB, () => page([node(150, '2000'), node(160)], 2, WHOLE_RANGE));

    const forward = await fetchExposures([RELAY, ASSET_HUB]);
    const backward = await fetchExposures([ASSET_HUB, RELAY]);

    expect(backward).toEqual(forward);
  });

  test('should answer the same whichever indexer answers first', async () => {
    const relay: Handler = () => page([node(150, '1000'), node(151), node(120)], 3, WHOLE_RANGE, RELAY_CHAIN);
    const hub: Handler = () => page([node(150, '2000'), node(160)], 2, WHOLE_RANGE);

    serve(RELAY, slow(relay));
    serve(ASSET_HUB, hub);
    const hubFirst = await fetchExposures([RELAY, ASSET_HUB]);

    serve(RELAY, relay);
    serve(ASSET_HUB, slow(hub));
    const relayFirst = await fetchExposures([RELAY, ASSET_HUB]);

    expect(hubFirst.exposures).toEqual([exposure(160), exposure(151), exposure(120)]);
    expect(relayFirst).toEqual(hubFirst);
  });

  test('should be unavailable when no indexer answers', async () => {
    serve(RELAY, () => ({ unexpected: true }));
    serve(ASSET_HUB, () => {
      throw new Error('indexer down');
    });

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.exposures).toEqual([]);
    expect(result.completeness).toEqual('unavailable');
    expect(result.scan.sources.map(source => source.status)).toEqual(['failed', 'failed']);
  });

  test('should be unavailable when there is no indexer to ask', async () => {
    const result = await fetchExposures([]);

    expect(result.exposures).toEqual([]);
    expect(result.completeness).toEqual('unavailable');
  });
});
