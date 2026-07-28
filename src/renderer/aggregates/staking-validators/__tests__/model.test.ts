import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import type * as NetworkDomain from '@/domains/network';
import { type AccountIdentity } from '@/domains/network';
import type * as StakingDomain from '@/domains/staking';
import {
  type EraValidator,
  AssetHubChains,
  DEFAULT_RECOMMENDATION_CRITERIA,
  DEFAULT_STAKING_CHAIN,
} from '@/domains/staking';
import { type CriteriaFlags, $persistedCriteria, stakingValidators } from '../model';

import { $identityCache, $validatorsCache, requestIdentitiesFx } from './domainMocks';

vi.mock('@/domains/staking', async importOriginal => {
  const actual = await importOriginal<typeof StakingDomain>();
  const { $validatorsCache } = await import('./domainMocks');

  return {
    ...actual,
    validators: {
      ...actual.validators,
      validatorsResource: { ...actual.validators.validatorsResource, $cache: $validatorsCache },
    },
  };
});

vi.mock('@/domains/network', async importOriginal => {
  const actual = await importOriginal<typeof NetworkDomain>();
  const { $identityCache, requestIdentitiesFx } = await import('./domainMocks');

  return {
    ...actual,
    identity: { ...actual.identity, $list: $identityCache, request: requestIdentitiesFx },
  };
});

const CHAIN: ChainId = DEFAULT_STAKING_CHAIN;

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const makeValidator = (index: number, overrides: Partial<EraValidator> = {}): EraValidator => ({
  accountId: accountId(index),
  totalStake: '1000',
  ownStake: '100',
  commission: 5,
  blocked: false,
  nominatorCount: 10,
  pageCount: 1,
  maxNominatorsRewarded: 512,
  slashed: false,
  eraPoints: 100,
  blocksAuthored: null,
  apy: 10,
  elected: true,
  ...overrides,
});

const makeIdentity = (index: number, name: string, subName?: string): AccountIdentity => ({
  chainId: CHAIN,
  accountId: accountId(index),
  name,
  subName,
  email: '',
  image: '',
  website: '',
});

const toValidatorMap = (list: EraValidator[]) =>
  Object.fromEntries(list.map(validator => [validator.accountId, validator]));

const toIdentityMap = (list: AccountIdentity[]) =>
  Object.fromEntries(list.map(identity => [identity.accountId, identity]));

type ScenarioParams = {
  validators?: EraValidator[];
  identities?: AccountIdentity[];
  criteria?: unknown;
};

const forkWith = ({
  validators = [],
  identities = [],
  criteria = DEFAULT_RECOMMENDATION_CRITERIA,
}: ScenarioParams = {}) => {
  return fork({
    values: [
      [$validatorsCache, { [CHAIN]: toValidatorMap(validators) }],
      [$identityCache, { [CHAIN]: toIdentityMap(identities) }],
      [$persistedCriteria, criteria],
    ],
    handlers: [[requestIdentitiesFx, () => ({})]],
  });
};

describe('stakingValidators criteria', () => {
  it('defaults to the recommendation defaults', () => {
    const scope = fork();

    expect(scope.getState(stakingValidators.$criteria)).toEqual(DEFAULT_RECOMMENDATION_CRITERIA);
  });

  it('merges a partial patch into the stored criteria', async () => {
    const scope = fork();

    await allSettled(stakingValidators.setCriteria, { scope, params: { requireIdentity: false } });

    expect(scope.getState(stakingValidators.$criteria)).toEqual({
      ...DEFAULT_RECOMMENDATION_CRITERIA,
      requireIdentity: false,
    });
  });

  it('restores the defaults on reset', async () => {
    const scope = fork();

    await allSettled(stakingValidators.setCriteria, {
      scope,
      params: { requireIdentity: false, limitClusters: false },
    });
    await allSettled(stakingValidators.resetCriteria, { scope });

    expect(scope.getState(stakingValidators.$criteria)).toEqual(DEFAULT_RECOMMENDATION_CRITERIA);
  });

  it('falls back to the defaults for every corrupt or missing key', () => {
    const scope = forkWith({ criteria: { excludeSlashed: 'yes', limitClusters: null, requireIdentity: false } });

    expect(scope.getState(stakingValidators.$criteria)).toEqual({
      ...DEFAULT_RECOMMENDATION_CRITERIA,
      requireIdentity: false,
    });
  });

  it('falls back to the defaults when the persisted payload is not an object', () => {
    for (const payload of ['nonsense', 42, null, ['excludeSlashed']]) {
      const scope = forkWith({ criteria: payload });

      expect(scope.getState(stakingValidators.$criteria)).toEqual(DEFAULT_RECOMMENDATION_CRITERIA);
    }
  });
});

describe('stakingValidators recommendation', () => {
  // One operator running three validators (a root identity plus two subs),
  // followed by two validators with no identity at all.
  const clusterScenario: ScenarioParams = {
    validators: [
      makeValidator(1, { apy: 30 }),
      makeValidator(2, { apy: 20 }),
      makeValidator(3, { apy: 15 }),
      makeValidator(4, { apy: 10 }),
      makeValidator(5, { apy: 5 }),
    ],
    identities: [
      makeIdentity(1, 'Operator A'),
      makeIdentity(2, 'Operator A', 'node-2'),
      makeIdentity(3, 'Operator A', 'node-3'),
    ],
  };

  it('reports an empty recommendation while no validators are known', () => {
    const scope = forkWith();

    expect(scope.getState(stakingValidators.$validators)).toEqual({});
    expect(scope.getState(stakingValidators.$recommended)).toEqual([]);
    expect(scope.getState(stakingValidators.$recommendedCount)).toBe(0);
    expect(scope.getState(stakingValidators.$pending)).toBe(false);
  });

  it('reports pending until the elected set of the selected chain lands', () => {
    const scope = fork();

    expect(scope.getState(stakingValidators.$pending)).toBe(true);
  });

  it('keeps at most two validators of one identity cluster and never clusters identity-less ones', () => {
    const scope = forkWith({ ...clusterScenario, criteria: relaxed({ requireIdentity: false }) });

    expect(scope.getState(stakingValidators.$recommended)).toEqual([
      accountId(1),
      accountId(2),
      accountId(4),
      accountId(5),
    ]);
  });

  it('keys clusters by identity display name, electing a stable representative', () => {
    const scope = forkWith(clusterScenario);

    expect(scope.getState(stakingValidators.$identityParents)).toEqual({
      [accountId(1)]: accountId(1),
      [accountId(2)]: accountId(1),
      [accountId(3)]: accountId(1),
    });
  });

  it('follows the criteria: dropping the cluster limit brings the whole cluster back', () => {
    const scope = forkWith({
      ...clusterScenario,
      criteria: relaxed({ requireIdentity: false, limitClusters: false }),
    });

    expect(scope.getState(stakingValidators.$recommended)).toEqual([
      accountId(1),
      accountId(2),
      accountId(3),
      accountId(4),
      accountId(5),
    ]);
  });

  it('follows the criteria: requiring an identity drops the identity-less validators', async () => {
    const scope = forkWith({ ...clusterScenario, criteria: relaxed({ requireIdentity: false }) });

    await allSettled(stakingValidators.setCriteria, { scope, params: { requireIdentity: true } });

    expect(scope.getState(stakingValidators.$recommended)).toEqual([accountId(1), accountId(2)]);
  });

  it('never fills more slots than the chain allows', () => {
    // Every validator gets its own identity, so nothing is cut by the cluster limit.
    const validators = Array.from({ length: 20 }, (_, index) => makeValidator(index + 1, { apy: 100 - index }));
    const identities = validators.map((_, index) => makeIdentity(index + 1, `Operator ${index + 1}`));

    const scope = forkWith({ validators, identities });

    const maxNominations = scope.getState(stakingValidators.$maxNominations);

    expect(maxNominations).toBe(16);
    expect(scope.getState(stakingValidators.$recommendedCount)).toBe(maxNominations);
    expect(scope.getState(stakingValidators.$recommended)).toHaveLength(maxNominations);
  });

  it('fills fewer slots than the chain allows when the era is short of candidates', () => {
    const scope = forkWith(clusterScenario);

    expect(scope.getState(stakingValidators.$recommendedCount)).toBeLessThan(
      scope.getState(stakingValidators.$maxNominations),
    );
  });
});

describe('stakingValidators chain scope', () => {
  const OTHER_CHAIN = AssetHubChains.KUSAMA_AH;

  it('serves the selected staking network by default', () => {
    const scope = forkWith({ validators: [makeValidator(1)] });

    expect(scope.getState(stakingValidators.$chainId)).toBe(CHAIN);
    expect(scope.getState(stakingValidators.$validatorList)).toHaveLength(1);
  });

  it('serves an explicitly scoped chain instead of the selected one', async () => {
    const scope = forkWith({ validators: [makeValidator(1)] });

    await allSettled(stakingValidators.scopeChain, { scope, params: OTHER_CHAIN });

    expect(scope.getState(stakingValidators.$chainId)).toBe(OTHER_CHAIN);
    // The cache only holds the default chain, so scoping elsewhere must not
    // leak that chain's validators.
    expect(scope.getState(stakingValidators.$validatorList)).toHaveLength(0);
  });

  it('restores the selected staking network when the scope is cleared', async () => {
    const scope = forkWith({ validators: [makeValidator(1)] });

    await allSettled(stakingValidators.scopeChain, { scope, params: OTHER_CHAIN });
    await allSettled(stakingValidators.scopeChain, { scope, params: null });

    expect(scope.getState(stakingValidators.$chainId)).toBe(CHAIN);
    expect(scope.getState(stakingValidators.$validatorList)).toHaveLength(1);
  });
});

function relaxed(patch: Partial<CriteriaFlags>): CriteriaFlags {
  return { ...DEFAULT_RECOMMENDATION_CRITERIA, ...patch };
}
