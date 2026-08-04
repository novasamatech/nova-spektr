import { type ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { BN } from '@polkadot/util';

import {
  stakingActiveEraInfo,
  stakingEraRewardPoints,
  stakingExposurePage,
  stakingLedger,
  stakingNominations,
  stakingPagedExposureMetadata,
  stakingRewardDestination,
  stakingSlashingSpans,
  stakingUnappliedSlash,
  stakingValidatorPrefs,
} from './schema';
import { storage } from './storage';

const registry = new TypeRegistry();

registry.register({
  TestActiveEraInfo: {
    index: 'u32',
    start: 'Option<u64>',
  },
  TestPagedExposureMetadata: {
    total: 'Compact<u128>',
    own: 'Compact<u128>',
    nominatorCount: 'u32',
    pageCount: 'u32',
  },
  TestIndividualExposure: {
    who: 'AccountId32',
    value: 'Compact<u128>',
  },
  TestExposurePage: {
    pageTotal: 'Compact<u128>',
    others: 'Vec<TestIndividualExposure>',
  },
  TestValidatorPrefs: {
    commission: 'Compact<Perbill>',
    blocked: 'bool',
  },
  TestNominations: {
    targets: 'Vec<AccountId32>',
    submittedIn: 'u32',
    suppressed: 'bool',
  },
  TestUnlockChunk: {
    value: 'Compact<u128>',
    era: 'Compact<u32>',
  },
  TestStakingLedger: {
    stash: 'AccountId32',
    total: 'Compact<u128>',
    active: 'Compact<u128>',
    unlocking: 'Vec<TestUnlockChunk>',
    legacyClaimedRewards: 'Vec<u32>',
  },
  TestLegacyStakingLedger: {
    stash: 'AccountId32',
    total: 'Compact<u128>',
    active: 'Compact<u128>',
    unlocking: 'Vec<TestUnlockChunk>',
    claimedRewards: 'Vec<u32>',
  },
  TestAsyncStakingLedger: {
    stash: 'AccountId32',
    total: 'Compact<u128>',
    active: 'Compact<u128>',
    unlocking: 'Vec<TestUnlockChunk>',
  },
  TestRewardDestination: {
    _enum: {
      Staked: 'Null',
      Stash: 'Null',
      Controller: 'Null',
      Account: 'AccountId32',
      None: 'Null',
    },
  },
  TestEraRewardPoints: {
    total: 'u32',
    individual: 'BTreeMap<AccountId32, u32>',
  },
  TestUnappliedSlash: {
    validator: 'AccountId32',
    own: 'u128',
    others: 'Vec<(AccountId32, u128)>',
    reporters: 'Vec<AccountId32>',
    payout: 'u128',
  },
  TestSlashingSpans: {
    spanIndex: 'u32',
    lastStart: 'u32',
    lastNonzeroSlash: 'u32',
    prior: 'Vec<u32>',
  },
});

const aliceAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const bobAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const aliceAccountId = registry.createType('AccountId32', aliceAddress).toHex();
const bobAccountId = registry.createType('AccountId32', bobAddress).toHex();

describe('stakingPallet schemas', () => {
  it('should parse ActiveEraInfo', () => {
    const codec = registry.createType('TestActiveEraInfo', { index: 42, start: 1_700_000 });

    expect(stakingActiveEraInfo.parse(codec)).toEqual({
      index: 42,
      start: new BN(1_700_000),
    });
  });

  it('should parse ActiveEraInfo without start', () => {
    const codec = registry.createType('TestActiveEraInfo', { index: 42, start: null });

    expect(stakingActiveEraInfo.parse(codec)).toEqual({
      index: 42,
      start: null,
    });
  });

  it('should parse PagedExposureMetadata', () => {
    const codec = registry.createType('TestPagedExposureMetadata', {
      total: 1000,
      own: 100,
      nominatorCount: 12,
      pageCount: 2,
    });

    expect(stakingPagedExposureMetadata.parse(codec)).toEqual({
      total: new BN(1000),
      own: new BN(100),
      nominatorCount: 12,
      pageCount: 2,
    });
  });

  it('should parse ExposurePage', () => {
    const codec = registry.createType('TestExposurePage', {
      pageTotal: 500,
      others: [{ who: aliceAddress, value: 500 }],
    });

    expect(stakingExposurePage.parse(codec)).toEqual({
      pageTotal: new BN(500),
      others: [{ who: aliceAccountId, value: new BN(500) }],
    });
  });

  it('should parse ValidatorPrefs', () => {
    const codec = registry.createType('TestValidatorPrefs', { commission: 100_000_000, blocked: false });

    const result = stakingValidatorPrefs.parse(codec);

    expect(result.blocked).toEqual(false);
    expect(result.commission.toString()).toEqual('100000000');
  });

  it('should parse Nominations', () => {
    const codec = registry.createType('TestNominations', {
      targets: [aliceAddress, bobAddress],
      submittedIn: 100,
      suppressed: false,
    });

    expect(stakingNominations.parse(codec)).toEqual({
      targets: [aliceAccountId, bobAccountId],
      submittedIn: 100,
      suppressed: false,
    });
  });

  it('should parse StakingLedger', () => {
    const codec = registry.createType('TestStakingLedger', {
      stash: aliceAddress,
      total: 1000,
      active: 900,
      unlocking: [{ value: 100, era: 5 }],
      legacyClaimedRewards: [1, 2],
    });

    expect(stakingLedger.parse(codec)).toEqual({
      stash: aliceAccountId,
      total: new BN(1000),
      active: new BN(900),
      unlocking: [{ value: new BN(100), era: 5 }],
      legacyClaimedRewards: [1, 2],
    });
  });

  it('should parse StakingLedger with legacy claimedRewards field', () => {
    const codec = registry.createType('TestLegacyStakingLedger', {
      stash: aliceAddress,
      total: 1000,
      active: 1000,
      unlocking: [],
      claimedRewards: [3, 4],
    });

    expect(stakingLedger.parse(codec)).toEqual({
      stash: aliceAccountId,
      total: new BN(1000),
      active: new BN(1000),
      unlocking: [],
      legacyClaimedRewards: [3, 4],
    });
  });

  it('should parse StakingLedger without claimed rewards fields', () => {
    const codec = registry.createType('TestAsyncStakingLedger', {
      stash: aliceAddress,
      total: 1000,
      active: 1000,
      unlocking: [],
    });

    expect(stakingLedger.parse(codec)).toEqual({
      stash: aliceAccountId,
      total: new BN(1000),
      active: new BN(1000),
      unlocking: [],
      legacyClaimedRewards: undefined,
    });
  });

  it('should parse plain RewardDestination', () => {
    const codec = registry.createType('TestRewardDestination', 'Staked');

    expect(stakingRewardDestination.parse(codec)).toEqual({ type: 'Staked', data: null });
  });

  it('should parse RewardDestination with account', () => {
    const codec = registry.createType('TestRewardDestination', { Account: aliceAddress });

    expect(stakingRewardDestination.parse(codec)).toEqual({ type: 'Account', data: aliceAccountId });
  });

  it('should parse EraRewardPoints', () => {
    const codec = registry.createType('TestEraRewardPoints', {
      total: 300,
      individual: new Map([
        [aliceAddress, 200],
        [bobAddress, 100],
      ]),
    });

    const result = stakingEraRewardPoints.parse(codec);

    expect(result.total).toEqual(300);
    expect(result.individual).toHaveLength(2);
    expect(result.individual).toContainEqual({ key: aliceAccountId, value: 200 });
    expect(result.individual).toContainEqual({ key: bobAccountId, value: 100 });
  });

  it('should parse UnappliedSlash', () => {
    const codec = registry.createType('TestUnappliedSlash', {
      validator: aliceAddress,
      own: 1000,
      others: [[bobAddress, 500]],
      reporters: [],
      payout: 100,
    });

    expect(stakingUnappliedSlash.parse(codec)).toEqual({
      validator: aliceAccountId,
      own: new BN(1000),
      others: [[bobAccountId, new BN(500)]],
      payout: new BN(100),
    });
  });

  it('should parse SlashingSpans', () => {
    const codec = registry.createType('TestSlashingSpans', {
      spanIndex: 10,
      lastStart: 100,
      lastNonzeroSlash: 50,
      prior: [1, 2, 3],
    });

    expect(stakingSlashingSpans.parse(codec)).toEqual({
      spanIndex: 10,
      lastStart: 100,
      lastNonzeroSlash: 50,
      prior: [1, 2, 3],
    });
  });
});

describe('stakingPallet storage.unappliedSlashKeys', () => {
  const createApi = (unappliedSlashes: unknown) => {
    return {
      query: {
        staking: { unappliedSlashes },
      },
      runtimeChain: { toString: () => 'test-chain' },
    } as unknown as ApiPromise;
  };

  it('should read validators from values on classic runtimes', async () => {
    const slashes = registry.createType('Vec<TestUnappliedSlash>', [
      { validator: aliceAddress, own: 1000, others: [], reporters: [], payout: 100 },
      { validator: bobAddress, own: 2000, others: [], reporters: [], payout: 200 },
    ]);

    const query = Object.assign(vi.fn().mockResolvedValue(slashes), {
      creator: { meta: { type: { isMap: true, asMap: { hashers: ['Twox64Concat'] } } } },
      keys: vi.fn(),
    });

    const result = await storage.unappliedSlashKeys(createApi(query), 42);

    expect(query).toHaveBeenCalledWith(42);
    expect(query.keys).not.toHaveBeenCalled();
    expect(result).toEqual([aliceAccountId, bobAccountId]);
  });

  it('should read validators from second storage key on staking-async runtimes', async () => {
    const query = Object.assign(vi.fn(), {
      creator: { meta: { type: { isMap: true, asMap: { hashers: ['Twox64Concat', 'Blake2_128Concat'] } } } },
      keys: vi.fn().mockResolvedValue([]),
    });

    const result = await storage.unappliedSlashKeys(createApi(query), 42);

    expect(query).not.toHaveBeenCalled();
    expect(query.keys).toHaveBeenCalledWith(42);
    expect(result).toEqual([]);
  });
});

describe('stakingPallet storage.bondedEras', () => {
  it('should return null when storage is absent', async () => {
    const api = {
      query: {
        staking: {},
      },
      runtimeChain: { toString: () => 'test-chain' },
    } as unknown as ApiPromise;

    await expect(storage.bondedEras(api)).resolves.toBeNull();
  });

  it('should parse era/session tuples', async () => {
    const bondedEras = registry.createType('Vec<(u32, u32)>', [
      [10, 100],
      [11, 106],
    ]);

    const api = {
      query: {
        staking: { bondedEras: vi.fn().mockResolvedValue(bondedEras) },
      },
      runtimeChain: { toString: () => 'test-chain' },
    } as unknown as ApiPromise;

    await expect(storage.bondedEras(api)).resolves.toEqual([
      { era: 10, session: 100 },
      { era: 11, session: 106 },
    ]);
  });
});
