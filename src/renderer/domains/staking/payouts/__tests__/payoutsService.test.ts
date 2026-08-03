import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type RewardSource } from '../../types';
import { PERBILL } from '../calculator';
import { getUnclaimedPayouts } from '../service';
import { type EraValidatorExposure } from '../types';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    storage: {
      bonded: vi.fn(),
      ledger: vi.fn(),
      nominators: vi.fn(),
      claimedRewards: vi.fn(),
      erasStakersOverview: vi.fn(),
      erasStakersPaged: vi.fn(),
      erasValidatorReward: vi.fn(),
      erasRewardPoints: vi.fn(),
      erasValidatorPrefsFor: vi.fn(),
    },
  },
}));

vi.mock('../subquery', () => ({
  fetchNominatorEraValidators: vi.fn(),
}));

const { stakingPallet } = await import('@/shared/pallet/staking');
const { fetchNominatorEraValidators } = await import('../subquery');

const storage = vi.mocked(stakingPallet.storage);
const fetchExposures = vi.mocked(fetchNominatorEraValidators);

const STASH = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const VALIDATOR = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

const ERA = 10;
const REWARD_SOURCES: RewardSource[] = [{ url: 'https://indexer.test', addressPrefix: 0 }];

const api = {} as ApiPromise;

type SetupParams = {
  exposures?: EraValidatorExposure[];
  legacyClaimedRewards?: number[];
  claimedPages?: number[];
  nominationTargets?: AccountId[] | null;
  overviewPageCount?: number;
  overviewEras?: number[];
  pagedOthers?: { who: AccountId; value: BN }[];
  eraReward?: BN | null;
  totalPoints?: number;
  validatorPoints?: number | null;
  commission?: BN;
};

function setup({
  exposures = [{ era: ERA, validator: VALIDATOR, total: '1000', own: '200' }],
  legacyClaimedRewards = [],
  claimedPages = [],
  nominationTargets = [VALIDATOR],
  overviewPageCount = 1,
  overviewEras = [ERA],
  pagedOthers = [{ who: STASH, value: new BN(300) }],
  eraReward = new BN(1000),
  totalPoints = 200,
  validatorPoints = 100,
  commission = PERBILL.divn(10),
}: SetupParams = {}) {
  fetchExposures.mockResolvedValue(exposures);

  storage.bonded.mockResolvedValue([{ stash: STASH, controller: STASH }]);
  storage.ledger.mockResolvedValue([
    {
      controller: STASH,
      ledger: {
        stash: STASH,
        total: new BN(0),
        active: new BN(0),
        unlocking: [],
        legacyClaimedRewards,
      },
    },
  ]);
  storage.nominators.mockResolvedValue([
    {
      stash: STASH,
      nominations: nominationTargets ? { targets: nominationTargets, submittedIn: 1, suppressed: false } : null,
    },
  ]);

  storage.claimedRewards.mockImplementation((_api, keys) =>
    Promise.resolve(keys.map(({ era, validator }) => ({ era, validator, pages: claimedPages }))),
  );

  storage.erasStakersOverview.mockImplementation((_api, era) =>
    Promise.resolve(
      overviewEras.includes(era) && exposures.length > 0
        ? exposures
            .filter(exposure => exposure.era === era || overviewEras.length > 1)
            .map(exposure => ({
              validator: exposure.validator,
              overview: {
                total: new BN(exposure.total),
                own: new BN(exposure.own),
                nominatorCount: 1,
                pageCount: overviewPageCount,
              },
            }))
        : [],
    ),
  );

  storage.erasStakersPaged.mockResolvedValue([{ page: 0, exposure: { pageTotal: new BN(800), others: pagedOthers } }]);

  storage.erasValidatorReward.mockImplementation((_api, eras) =>
    Promise.resolve(eras.map(era => ({ era, reward: eraReward }))),
  );
  storage.erasRewardPoints.mockResolvedValue({
    total: totalPoints,
    individual: validatorPoints === null ? [] : [{ key: VALIDATOR, value: validatorPoints }],
  });
  storage.erasValidatorPrefsFor.mockImplementation((_api, keys) =>
    Promise.resolve(keys.map(({ era, validator }) => ({ era, validator, prefs: { commission, blocked: false } }))),
  );
}

const params = {
  api,
  stash: STASH,
  activeEra: ERA + 1,
  historyDepth: 84,
  rewardSources: REWARD_SOURCES,
};

describe('domains/staking/payouts/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should calculate the nominator share and keep the real page index', async () => {
    setup();

    const result = await getUnclaimedPayouts(params);

    expect(result.source).toEqual('subquery');
    expect(result.payouts).toEqual([{ era: ERA, validator: VALIDATOR, page: 0, amount: '135' }]);
    expect(result.total).toEqual('135');
  });

  test('should pay commission and own share when the stash is the validator', async () => {
    setup({ exposures: [{ era: ERA, validator: STASH, total: '1000', own: '200' }] });
    storage.erasRewardPoints.mockResolvedValue({ total: 200, individual: [{ key: STASH, value: 100 }] });

    const result = await getUnclaimedPayouts(params);

    expect(result.payouts).toEqual([{ era: ERA, validator: STASH, page: 0, amount: '140' }]);
    expect(storage.erasStakersPaged).not.toHaveBeenCalled();
  });

  test('should skip a page that was already claimed', async () => {
    setup({ claimedPages: [0] });

    const result = await getUnclaimedPayouts(params);

    expect(result.payouts).toEqual([]);
    expect(result.total).toEqual('0');
    expect(result.source).toEqual('subquery');
  });

  test('should still claim a page when another page of the validator was paid', async () => {
    setup({ claimedPages: [1], overviewPageCount: 2 });

    const result = await getUnclaimedPayouts(params);

    expect(result.payouts).toEqual([{ era: ERA, validator: VALIDATOR, page: 0, amount: '135' }]);
  });

  test('should skip eras claimed under the legacy scheme', async () => {
    setup({ legacyClaimedRewards: [ERA] });

    const result = await getUnclaimedPayouts(params);

    expect(result.payouts).toEqual([]);
    expect(storage.claimedRewards).not.toHaveBeenCalled();
  });

  test('should skip eras where the validator earned no points', async () => {
    setup({ totalPoints: 0, validatorPoints: null });

    const result = await getUnclaimedPayouts(params);

    expect(result.payouts).toEqual([]);
    expect(result.total).toEqual('0');
  });

  test('should skip an exposure that does not contain the stash', async () => {
    setup({ pagedOthers: [{ who: VALIDATOR, value: new BN(300) }] });

    const result = await getUnclaimedPayouts(params);

    expect(result.payouts).toEqual([]);
  });

  test('should fall back to the chain scan when no indexer is configured', async () => {
    setup();

    const result = await getUnclaimedPayouts({ ...params, rewardSources: [] });

    expect(fetchExposures).not.toHaveBeenCalled();
    expect(result.source).toEqual('chain');
    expect(result.payouts).toEqual([{ era: ERA, validator: VALIDATOR, page: 0, amount: '135' }]);
  });

  test('should scan a bounded era window on the chain fallback', async () => {
    setup({ overviewEras: [] });

    await getUnclaimedPayouts({ ...params, activeEra: 100, rewardSources: [] });

    const scannedEras = storage.erasStakersOverview.mock.calls.map(([, era]) => era);
    expect(scannedEras).toEqual([92, 93, 94, 95, 96, 97, 98, 99]);
  });

  test('should degrade to unavailable when neither indexer nor chain data exists', async () => {
    setup({ exposures: [], nominationTargets: null, overviewEras: [] });

    const result = await getUnclaimedPayouts({ ...params, rewardSources: [] });

    expect(result).toEqual({ total: '0', payouts: [], source: 'unavailable' });
  });

  test('should clamp the era range at genesis', async () => {
    setup({ exposures: [] });

    await getUnclaimedPayouts({ ...params, activeEra: 3, historyDepth: 84 });

    expect(fetchExposures).toHaveBeenCalledWith(expect.objectContaining({ eraFrom: 0, eraTo: 2 }));
  });
});
