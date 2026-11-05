import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type RewardSource } from '../../types';
import { buildShares, fetchEraExposureShares } from '../subquery';

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

const ourNominator = '0x01' as AccountId;
const ourValidator = '0x02' as AccountId;

const byAddress = new Map<string, AccountId>([
  ['NominatorAddr', ourNominator],
  ['ValidatorAddr', ourValidator],
]);

describe('domains/staking/era-rewards/subquery', () => {
  test('should pick our nominator line out of others', () => {
    const shares = buildShares(
      { address: 'ForeignValidator', own: '500', others: [{ who: 'NominatorAddr', value: '100' }] },
      byAddress,
    );

    expect(shares).toEqual({ [ourNominator]: '100' });
  });

  test('should add the own line when the row validator is our stash', () => {
    const shares = buildShares(
      { address: 'ValidatorAddr', own: '500', others: [{ who: 'Someone', value: '9' }] },
      byAddress,
    );

    expect(shares).toEqual({ [ourValidator]: '500' });
  });

  test('should carry both our nominator share and our validator own line on one row', () => {
    const shares = buildShares(
      { address: 'ValidatorAddr', own: '500', others: [{ who: 'NominatorAddr', value: '100' }] },
      byAddress,
    );

    expect(shares).toEqual({ [ourNominator]: '100', [ourValidator]: '500' });
  });

  test('should not add an own line for a foreign validator', () => {
    const shares = buildShares({ address: 'ForeignValidator', own: '500', others: null }, byAddress);

    expect(shares).toEqual({});
  });
});

const STASH = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const VALIDATOR = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

const RELAY: RewardSource = { url: 'https://relay.test', addressPrefix: 0 };
const ASSET_HUB: RewardSource = { url: 'https://asset-hub.test', addressPrefix: 0 };

const ERA_FROM = 100;
const ERA_TO = 129;

function node(era: number, { total = '1000', share = '100' }: { total?: string; share?: string } = {}) {
  return {
    era,
    address: toAddress(VALIDATOR, { prefix: 0 }),
    own: '0',
    total,
    others: [{ who: toAddress(STASH, { prefix: 0 }), value: share }],
  };
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

function fetchShares(rewardSources: RewardSource[]) {
  return fetchEraExposureShares({ rewardSources, stashes: [STASH], eraFrom: ERA_FROM, eraTo: ERA_TO });
}

describe('domains/staking/era-rewards/subquery · fetchEraExposureShares', () => {
  beforeEach(() => {
    indexer.handlers.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('should be complete when an indexer pages through everything and covers the range', async () => {
    serve(ASSET_HUB, () => page([node(120)], 1, ERA_TO + 1));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toEqual([
      { era: 120, validator: VALIDATOR, own: '0', total: '1000', shares: { [STASH]: '100' } },
    ]);
  });

  test('should walk every page of an indexer before calling the answer complete', async () => {
    serve(ASSET_HUB, ({ offset }) => page([node(ERA_FROM + offset)], 3, ERA_TO));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures.map(exposure => exposure.era).sort()).toEqual([100, 101, 102]);
  });

  test('should drop every row of an indexer that fails halfway through paging', async () => {
    serve(ASSET_HUB, ({ offset }) => {
      if (offset > 1) throw new Error('indexer down');

      return page([node(120 + offset)], 5, ERA_TO + 1);
    });
    serve(RELAY, () => page([], 0, 50));

    const result = await fetchShares([ASSET_HUB, RELAY]);

    expect(result).toEqual({ exposures: [], completeness: 'partial' });
  });

  test('should keep the rows of the indexers that answered when another one fails', async () => {
    serve(ASSET_HUB, () => page([node(120)], 1, ERA_TO));
    serve(RELAY, () => {
      throw new Error('indexer down');
    });

    const result = await fetchShares([ASSET_HUB, RELAY]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures.map(exposure => exposure.era)).toEqual([120]);
  });

  test('should be partial when the set grows while it is being paged', async () => {
    // A row indexed mid-scan lands on a page already read: the count moves and
    // the later pages no longer line up with the earlier ones.
    serve(ASSET_HUB, ({ offset }) => page([node(120 + offset)], offset === 0 ? 2 : 3, ERA_TO));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
  });

  test('should judge coverage by the first page, not by a later one', async () => {
    serve(ASSET_HUB, ({ offset }) => page([node(120 + offset)], 2, offset === 0 ? ERA_TO - 1 : ERA_TO));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toHaveLength(2);
  });

  test('should be partial when paging stops at the page limit before totalCount', async () => {
    serve(ASSET_HUB, ({ offset, first }) => page([node(offset)], first * 1000, ERA_TO));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures.length).toBeGreaterThan(0);
  });

  test('should be partial when an indexer returns fewer rows than it promised', async () => {
    serve(ASSET_HUB, ({ offset }) => page(offset === 0 ? [node(120)] : [], 2, ERA_TO));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toHaveLength(1);
  });

  test('should drop a row two indexers disagree on, whatever order they answer in', async () => {
    serve(RELAY, () => page([node(120, { total: '1000' }), node(121)], 2, ERA_TO));
    serve(ASSET_HUB, () => page([node(120, { total: '2000' })], 1, ERA_TO));

    const forward = await fetchShares([RELAY, ASSET_HUB]);
    const backward = await fetchShares([ASSET_HUB, RELAY]);

    expect(forward.completeness).toEqual('partial');
    expect(forward.exposures.map(exposure => exposure.era)).toEqual([121]);
    expect(backward).toEqual(forward);
  });

  test('should drop a row whose stash share differs between indexers', async () => {
    serve(RELAY, () => page([node(120, { share: '100' })], 1, ERA_TO));
    serve(ASSET_HUB, () => page([node(120, { share: '900' })], 1, ERA_TO));

    const result = await fetchShares([RELAY, ASSET_HUB]);

    expect(result).toEqual({ exposures: [], completeness: 'partial' });
  });

  test('should merge agreeing indexers into a complete answer', async () => {
    serve(RELAY, () => page([node(120)], 1, ERA_TO));
    serve(ASSET_HUB, () => page([node(120), node(121)], 2, ERA_TO));

    const result = await fetchShares([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures.map(exposure => exposure.era).sort()).toEqual([120, 121]);
  });

  test('should let an indexer covering the range answer for one that is behind it', async () => {
    serve(RELAY, () => page([], 0, 50));
    serve(ASSET_HUB, () => page([node(120)], 1, ERA_TO + 1));

    const result = await fetchShares([RELAY, ASSET_HUB]);

    expect(result.completeness).toEqual('complete');
    expect(result.exposures).toHaveLength(1);
  });

  test('should stay partial when the only answering indexer is behind the range', async () => {
    serve(ASSET_HUB, () => page([node(110)], 1, 115));

    const result = await fetchShares([ASSET_HUB]);

    expect(result.completeness).toEqual('partial');
    expect(result.exposures).toHaveLength(1);
  });

  test('should be unavailable when no indexer answers', async () => {
    serve(RELAY, () => ({ unexpected: true }));
    serve(ASSET_HUB, () => {
      throw new Error('indexer down');
    });

    const result = await fetchShares([RELAY, ASSET_HUB]);

    expect(result).toEqual({ exposures: [], completeness: 'unavailable' });
  });

  test('should be unavailable when there is no indexer to ask', async () => {
    const result = await fetchShares([]);

    expect(result).toEqual({ exposures: [], completeness: 'unavailable' });
  });
});
