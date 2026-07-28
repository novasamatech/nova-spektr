import { type ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { BN } from '@polkadot/util';

import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../../constants';
import { type ExposureOverviewMap } from '../../exposures/types';
import { validatorsService } from '../service';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    consts: {
      maxExposurePageSize: vi.fn(),
      slashDeferDuration: vi.fn(),
      sessionsPerEra: vi.fn(),
      maxNominations: vi.fn(),
    },
    storage: {
      erasStakersOverview: vi.fn(),
      erasValidatorPrefs: vi.fn(),
      erasRewardPoints: vi.fn(),
      erasTotalStake: vi.fn(),
      erasValidatorReward: vi.fn(),
      unappliedSlashKeys: vi.fn(),
      slashingSpans: vi.fn(),
      nominators: vi.fn(),
    },
  },
}));

const consts = vi.mocked(stakingPallet.consts);
const storage = vi.mocked(stakingPallet.storage);

const registry = new TypeRegistry();
const u32 = (value: number) => registry.createType('u32', value);

const alice = '0x01' as AccountId;
const bob = '0x02' as AccountId;

const CHAIN_ID = AssetHubChains.POLKADOT_AH;
const ERA = 100;

// 10% pool reward rate: 1000 minted per 24h era against 3_652_500 staked.
const TOTAL_STAKED = 3_652_500;
const VALIDATOR_STAKE = String(TOTAL_STAKED / 2);

const mockApi = (withReward = true): ApiPromise =>
  ({
    call: {
      inflation: withReward
        ? { experimentalIssuancePredictionInfo: vi.fn().mockResolvedValue({ toJSON: () => ({ nextMint: ['1000'] }) }) }
        : undefined,
    },
    query: {},
    genesisHash: { toHex: () => CHAIN_ID },
  }) as unknown as ApiPromise;

type OverviewInput = { total?: string; own?: string; nominatorCount?: number; pageCount?: number };

const overviews = (entries: [AccountId, OverviewInput][]): ExposureOverviewMap => {
  const result: ExposureOverviewMap = {};
  for (const [accountId, overview] of entries) {
    result[accountId] = {
      total: overview.total ?? VALIDATOR_STAKE,
      own: overview.own ?? '100',
      nominatorCount: overview.nominatorCount ?? 1,
      pageCount: overview.pageCount ?? 1,
    };
  }

  return result;
};

const prefs = (commission: number, blocked = false) => ({ commission: new BN(commission), blocked });

const getEraValidators = (params: { api?: ApiPromise; timelineApi?: ApiPromise; overviews: ExposureOverviewMap }) => {
  return validatorsService.getEraValidators({
    api: params.api ?? mockApi(),
    chainId: CHAIN_ID,
    era: ERA,
    timelineApi: params.timelineApi,
    overviews: params.overviews,
  });
};

describe('validatorsService.getEraValidators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.maxExposurePageSize.mockReturnValue(512);
    consts.slashDeferDuration.mockReturnValue(27);
    consts.sessionsPerEra.mockReturnValue(6);
    storage.erasValidatorPrefs.mockResolvedValue([]);
    storage.erasRewardPoints.mockResolvedValue({ total: 0, individual: [] });
    storage.unappliedSlashKeys.mockResolvedValue([]);
    storage.slashingSpans.mockResolvedValue([]);
    storage.erasTotalStake.mockResolvedValue(new BN(TOTAL_STAKED));
    storage.erasValidatorReward.mockResolvedValue([{ era: ERA - 1, reward: null }]);
  });

  test('should compose exposure, preferences and reward points into an era validator', async () => {
    storage.erasValidatorPrefs.mockResolvedValue([{ validator: alice, prefs: prefs(100_000_000, true) }]);
    storage.erasRewardPoints.mockResolvedValue({ total: 40, individual: [{ key: alice, value: 40 }] });

    const result = await getEraValidators({
      overviews: overviews([[alice, { total: VALIDATOR_STAKE, own: '500', nominatorCount: 7, pageCount: 2 }]]),
    });

    expect(result[alice]).toEqual({
      accountId: alice,
      totalStake: VALIDATOR_STAKE,
      ownStake: '500',
      commission: 10,
      blocked: true,
      nominatorCount: 7,
      pageCount: 2,
      maxNominatorsRewarded: 512,
      oversubscribed: false,
      slashed: false,
      eraPoints: 40,
      blocksAuthored: null,
      apy: 18,
      elected: true,
    });
  });

  test('should default the commission and reward points of a validator without an entry', async () => {
    const result = await getEraValidators({ overviews: overviews([[alice, {}]]) });

    expect(result[alice]?.commission).toEqual(0);
    expect(result[alice]?.blocked).toEqual(false);
    expect(result[alice]?.eraPoints).toEqual(0);
  });

  test('should treat a full exposure page as not oversubscribed', async () => {
    const result = await getEraValidators({
      overviews: overviews([
        [alice, { nominatorCount: 512 }],
        [bob, { nominatorCount: 513 }],
      ]),
    });

    expect(result[alice]?.oversubscribed).toEqual(false);
    expect(result[bob]?.oversubscribed).toEqual(true);
  });

  test('should mark validators slashed inside the defer window', async () => {
    storage.slashingSpans.mockResolvedValue([
      { validator: alice, spans: { spanIndex: 1, lastStart: 0, lastNonzeroSlash: ERA - 40, prior: [] } },
      { validator: bob, spans: { spanIndex: 1, lastStart: 0, lastNonzeroSlash: ERA - 3, prior: [] } },
    ]);

    const result = await getEraValidators({
      overviews: overviews([
        [alice, {}],
        [bob, {}],
      ]),
    });

    expect(result[alice]?.slashed).toEqual(false);
    expect(result[bob]?.slashed).toEqual(true);
    expect(storage.unappliedSlashKeys).not.toHaveBeenCalled();
  });

  test('should walk the unapplied slashes when the runtime dropped the slashing spans', async () => {
    storage.slashingSpans.mockResolvedValue(null);
    // `UnappliedSlashes` is keyed by the era the slash becomes applicable, which
    // is ahead of the active era — a slash reported five eras ago sits at
    // ERA + slashDeferDuration - 5, never behind ERA.
    storage.unappliedSlashKeys.mockImplementation((_api, era) => Promise.resolve(era === ERA + 5 ? [bob] : []));

    const result = await getEraValidators({
      overviews: overviews([
        [alice, {}],
        [bob, {}],
      ]),
    });

    expect(result[alice]?.slashed).toEqual(false);
    expect(result[bob]?.slashed).toEqual(true);
    // The whole defer window ahead of the active era, plus the active era itself.
    expect(storage.unappliedSlashKeys).toHaveBeenCalledTimes(28);
  });

  test('should not read a zero lastNonzeroSlash as a recent slash', async () => {
    // `SlashingSpans::new` initialises `lastNonzeroSlash` to 0, so a chain whose
    // era index is below the defer duration would otherwise flag every validator
    // that merely carries a spans record.
    consts.slashDeferDuration.mockReturnValue(ERA + 100);
    storage.slashingSpans.mockResolvedValue([
      { validator: alice, spans: { spanIndex: 1, lastStart: 0, lastNonzeroSlash: 0, prior: [] } },
      { validator: bob, spans: { spanIndex: 1, lastStart: 0, lastNonzeroSlash: ERA - 3, prior: [] } },
    ]);

    const result = await getEraValidators({
      overviews: overviews([
        [alice, {}],
        [bob, {}],
      ]),
    });

    expect(result[alice]?.slashed).toEqual(false);
    expect(result[bob]?.slashed).toEqual(true);
  });

  test('should not read the slashes of an empty validator set', async () => {
    const result = await getEraValidators({ overviews: {} });

    expect(result).toEqual({});
    expect(storage.slashingSpans).not.toHaveBeenCalled();
    expect(storage.unappliedSlashKeys).not.toHaveBeenCalled();
  });

  test('should tolerate validators without slashing spans', async () => {
    storage.slashingSpans.mockResolvedValue([{ validator: alice, spans: null }]);

    const result = await getEraValidators({ overviews: overviews([[alice, {}]]) });

    expect(result[alice]?.slashed).toEqual(false);
  });

  test('should join the per-validator apy', async () => {
    const result = await getEraValidators({
      overviews: overviews([
        [alice, { total: VALIDATOR_STAKE }],
        [bob, { total: String(TOTAL_STAKED) }],
      ]),
    });

    // Average stake is TOTAL_STAKED / 2, so alice earns the pool rate and bob half of it.
    expect(result[alice]?.apy).toEqual(10);
    expect(result[bob]?.apy).toEqual(5);
  });

  test('should leave the apy unknown when the chain reports no reward data', async () => {
    const result = await getEraValidators({ api: mockApi(false), overviews: overviews([[alice, {}]]) });

    expect(result[alice]?.apy).toBeNull();
  });

  test('should read the era overviews when they are not provided', async () => {
    storage.erasStakersOverview.mockResolvedValue([
      {
        validator: alice,
        overview: { total: new BN(VALIDATOR_STAKE), own: new BN(100), nominatorCount: 1, pageCount: 1 },
      },
    ]);

    const result = await validatorsService.getEraValidators({ api: mockApi(), chainId: CHAIN_ID, era: ERA });

    expect(storage.erasStakersOverview).toHaveBeenCalledWith(expect.anything(), ERA);
    expect(result[alice]?.totalStake).toEqual(VALIDATOR_STAKE);
  });

  test('should count the blocks authored in the current session of the timeline chain', async () => {
    const multi = vi.fn().mockResolvedValue([u32(12), u32(0)]);
    const timelineApi = {
      consts: {},
      query: {
        session: { currentIndex: vi.fn().mockResolvedValue(u32(7)) },
        imOnline: { authoredBlocks: { multi } },
      },
    } as unknown as ApiPromise;

    const result = await getEraValidators({
      timelineApi,
      overviews: overviews([
        [alice, {}],
        [bob, {}],
      ]),
    });

    expect(multi).toHaveBeenCalledWith([
      [7, alice],
      [7, bob],
    ]);
    expect(result[alice]?.blocksAuthored).toEqual(12);
    expect(result[bob]?.blocksAuthored).toEqual(0);
  });

  test('should leave the authored blocks unknown when the timeline chain has no imOnline pallet', async () => {
    const timelineApi = {
      consts: {},
      query: { session: { currentIndex: vi.fn().mockResolvedValue(u32(7)) } },
    } as unknown as ApiPromise;

    const result = await getEraValidators({ timelineApi, overviews: overviews([[alice, {}]]) });

    expect(result[alice]?.blocksAuthored).toBeNull();
  });
});

describe('validatorsService.getMaxValidators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should use the runtime const when it is exposed', () => {
    consts.maxNominations.mockReturnValue(24);

    expect(validatorsService.getMaxValidators({} as ApiPromise)).toEqual(24);
  });

  test('should fall back when the runtime does not expose the const', () => {
    consts.maxNominations.mockReturnValue(null);

    expect(validatorsService.getMaxValidators({} as ApiPromise)).toEqual(16);
  });

  test('should fall back when the staking pallet is missing', () => {
    consts.maxNominations.mockImplementation(() => {
      throw new TypeError('staking pallet not found');
    });

    expect(validatorsService.getMaxValidators({} as ApiPromise)).toEqual(16);
  });
});
