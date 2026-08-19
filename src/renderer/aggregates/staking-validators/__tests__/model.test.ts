import { type ApiPromise } from '@polkadot/api';
import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId, type EraIndex } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import type * as NetworkDomain from '@/domains/network';
import { type AccountIdentity } from '@/domains/network';
import type * as StakingDomain from '@/domains/staking';
import {
  type EraValidator,
  type ValidatorsResourceParams,
  AssetHubChains,
  DEFAULT_RECOMMENDATION_CRITERIA,
  DEFAULT_STAKING_CHAIN,
  validators,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { type CriteriaFlags, $persistedCriteria, stakingValidators } from '../model';

import {
  $eraCache,
  $identityCache,
  $validatorsCache,
  $validatorsPending,
  requestIdentitiesFx,
  validatorsFail,
  validatorsPush,
  validatorsStart,
} from './domainMocks';

vi.mock('@/domains/staking', async importOriginal => {
  const actual = await importOriginal<typeof StakingDomain>();
  const { $validatorsCache, $validatorsPending, $eraCache, validatorsFail, validatorsPush, validatorsStart } =
    await import('./domainMocks');

  return {
    ...actual,
    validators: {
      ...actual.validators,
      validatorsResource: {
        ...actual.validators.validatorsResource,
        $cache: $validatorsCache,
        $pending: $validatorsPending,
        fail: validatorsFail,
        push: validatorsPush,
        start: validatorsStart,
      },
    },
    era: {
      ...actual.era,
      eraResource: { ...actual.era.eraResource, $cache: $eraCache },
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
  /** Twenty operator names no two of which read as nodes of one operator. */
  const DISTINCT_OPERATORS = [
    'Zug Capital',
    'P2P.ORG',
    'RYABINA',
    'Amforc',
    'Blockshard',
    'Chainflip',
    'Dwellir',
    'Enigma',
    'Figment',
    'Gatotech',
    'Helikon',
    'IBP',
    'Jaco',
    'KeepNode',
    'Luganodes',
    'Metaspan',
    'NC Nodes',
    'OpenBitLab',
    'Polkachu',
    'Quantumage',
  ];

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

  it('caps an operator that numbers its own root identities instead of using subs', () => {
    // The Binance case on Polkadot Asset Hub: fourteen validators, no
    // sub-identities, a separate root identity per node. Keyed on exact names
    // this read as fourteen unrelated operators and the whole family walked
    // straight past the cluster limit.
    const validators = Array.from({ length: 5 }, (_, index) => makeValidator(index + 1, { apy: 30 - index }));
    const identities = validators.map((_, index) => makeIdentity(index + 1, `BINANCE_STAKE_${index + 1}`));

    const scope = forkWith({ validators, identities });

    expect(scope.getState(stakingValidators.$recommended)).toEqual([accountId(1), accountId(2)]);
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
    // Twenty unrelated operators, so nothing is cut by the cluster limit. The
    // names have to be genuinely unlike each other and not merely distinct:
    // `Operator 1 … Operator 20` is one operator numbering its nodes as far as
    // `isSameOperator` is concerned, and it would collapse to a single cluster.
    const validators = Array.from({ length: DISTINCT_OPERATORS.length }, (_, index) =>
      makeValidator(index + 1, { apy: 100 - index }),
    );
    const identities = validators.map((_, index) => makeIdentity(index + 1, DISTINCT_OPERATORS[index] ?? ''));

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

describe('stakingValidators request health', () => {
  const ERA = 100 as EraIndex;
  const api = {} as unknown as ApiPromise;

  const makeParams = (era: EraIndex = ERA): ValidatorsResourceParams => ({
    chainId: CHAIN,
    api,
    era,
    timelineApi: api,
  });

  const forkHealth = async () => {
    const scope = fork({
      values: [[$eraCache, { [CHAIN]: ERA }]],
      handlers: [[requestIdentitiesFx, () => ({})]],
    });
    await allSettled(networkModel.$apis, { scope, params: { [CHAIN]: api } });

    return scope;
  };

  it('reports a failed request of the scoped chain and era', async () => {
    const scope = await forkHealth();

    expect(scope.getState(stakingValidators.$failed)).toBe(false);

    await allSettled(validatorsFail, { scope, params: { params: makeParams(), error: new Error('rpc') } });

    expect(scope.getState(stakingValidators.$failed)).toBe(true);
  });

  it('ignores a failure that belongs to another era', async () => {
    const scope = await forkHealth();

    await allSettled(validatorsFail, {
      scope,
      params: { params: makeParams((ERA - 1) as EraIndex), error: new Error('rpc') },
    });

    expect(scope.getState(stakingValidators.$failed)).toBe(false);
  });

  it('retires the failure when a set for the chain lands anyway', async () => {
    const scope = await forkHealth();

    await allSettled(validatorsFail, { scope, params: { params: makeParams(), error: new Error('rpc') } });
    await allSettled(validatorsPush, { scope, params: { params: makeParams(), result: {} } });

    expect(scope.getState(stakingValidators.$failed)).toBe(false);
  });

  it('restarts the request and clears the failure on retry', async () => {
    const scope = await forkHealth();

    const started: ValidatorsResourceParams[] = [];
    createWatch({ unit: validatorsStart, scope, fn: params => started.push(params) });

    await allSettled(validatorsFail, { scope, params: { params: makeParams(), error: new Error('rpc') } });
    await allSettled(stakingValidators.retryRequested, { scope });

    expect(scope.getState(stakingValidators.$failed)).toBe(false);
    expect(started).toEqual([makeParams()]);
  });

  it('does not retry without a connected api', async () => {
    const scope = fork({ values: [[$eraCache, { [CHAIN]: ERA }]], handlers: [[requestIdentitiesFx, () => ({})]] });

    const started: ValidatorsResourceParams[] = [];
    createWatch({ unit: validatorsStart, scope, fn: params => started.push(params) });

    await allSettled(stakingValidators.retryRequested, { scope });

    expect(started).toEqual([]);
  });

  it('reports loading while the request of the scoped key is in flight', async () => {
    const key = validators.validatorsResource.createKey(makeParams());
    const scope = fork({
      values: [
        [$eraCache, { [CHAIN]: ERA }],
        [$validatorsPending, { [key]: true }],
      ],
      handlers: [[requestIdentitiesFx, () => ({})]],
    });
    await allSettled(networkModel.$apis, { scope, params: { [CHAIN]: api } });

    expect(scope.getState(stakingValidators.$loading)).toBe(true);
  });
});

function relaxed(patch: Partial<CriteriaFlags>): CriteriaFlags {
  return { ...DEFAULT_RECOMMENDATION_CRITERIA, ...patch };
}
