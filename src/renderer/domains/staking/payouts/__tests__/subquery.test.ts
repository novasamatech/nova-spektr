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

const ERA_FROM = 100;
const ERA_TO = 183;

function node(era: number, total = '1000') {
  return { era, address: toAddress(VALIDATOR, { prefix: 0 }), own: '0', total };
}

function page(nodes: ReturnType<typeof node>[], totalCount: number, indexedTo: number | null) {
  return {
    indexedTo: { nodes: indexedTo === null ? [] : [{ era: indexedTo }] },
    eraValidatorInfos: { totalCount, nodes },
  };
}

function serve(source: RewardSource, handler: Handler) {
  indexer.handlers.set(source.url, handler as (variables: never) => unknown);
}

function fetchExposures(rewardSources: RewardSource[]) {
  return fetchNominatorEraValidators({ rewardSources, stash: STASH, eraFrom: ERA_FROM, eraTo: ERA_TO });
}

describe('domains/staking/payouts/subquery', () => {
  beforeEach(() => {
    indexer.handlers.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('should be complete when an indexer pages through everything and covers the range', async () => {
    serve(ASSET_HUB, () => page([node(150)], 1, ERA_TO + 1));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toEqual([{ era: 150, validator: VALIDATOR, own: '0', total: '1000' }]);
  });

  test('should not take an empty answer of an indexer behind the range as complete', async () => {
    serve(RELAY, () => page([], 0, 50));
    serve(ASSET_HUB, () => {
      throw new Error('indexer down');
    });

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result).toEqual({ exposures: [], completeness: 'partial' });
  });

  test('should stay partial when the only answering indexer is behind the range', async () => {
    serve(ASSET_HUB, () => page([node(150)], 1, 160));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toHaveLength(1);
  });

  test('should let an indexer covering the range answer for one that is behind it', async () => {
    serve(RELAY, () => page([], 0, 50));
    serve(ASSET_HUB, () => page([node(150)], 1, ERA_TO + 1));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toHaveLength(1);
  });

  test('should drop every row of an indexer that fails halfway through paging', async () => {
    serve(ASSET_HUB, ({ offset }) => {
      if (offset > 0) throw new Error('indexer down');

      return page([node(150)], 2, ERA_TO + 1);
    });
    serve(RELAY, () => page([], 0, 50));

    const result = await fetchExposures([ASSET_HUB, RELAY]);

    expect(result).toEqual({ exposures: [], completeness: 'partial' });
  });

  test('should drop a row two indexers disagree on, whatever order they answer in', async () => {
    serve(RELAY, () => page([node(150, '1000'), node(151)], 2, ERA_TO));
    serve(ASSET_HUB, () => page([node(150, '2000')], 1, ERA_TO));

    const forward = await fetchExposures([RELAY, ASSET_HUB]);
    const backward = await fetchExposures([ASSET_HUB, RELAY]);

    expect(forward.completeness).toEqual('partial');
    expect(forward.exposures.map(exposure => exposure.era)).toEqual([151]);
    expect(backward).toEqual(forward);
  });

  test('should merge agreeing indexers into a complete answer', async () => {
    serve(RELAY, () => page([node(150)], 1, ERA_TO));
    serve(ASSET_HUB, () => page([node(150), node(151)], 2, ERA_TO));

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures.map(exposure => exposure.era).sort()).toEqual([150, 151]);
  });

  test('should be partial when paging stops at the page limit before totalCount', async () => {
    serve(ASSET_HUB, ({ offset, first }) => page([node(offset)], first * 100, ERA_TO));

    const result = await fetchExposures([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
  });

  test('should be unavailable when no indexer answers', async () => {
    serve(RELAY, () => ({ unexpected: true }));
    serve(ASSET_HUB, () => {
      throw new Error('indexer down');
    });

    const result = await fetchExposures([RELAY, ASSET_HUB]);

    expect(result).toEqual({ exposures: [], completeness: 'unavailable' });
  });
});
