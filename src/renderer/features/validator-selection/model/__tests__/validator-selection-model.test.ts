import { type Scope, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Asset, type AssetId, type Chain, type ChainId, type Validator, AssetType } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import type * as NetworkDomain from '@/domains/network';
import { type AccountIdentity } from '@/domains/network';
import type * as StakingDomain from '@/domains/staking';
import { type EraValidator, DEFAULT_STAKING_CHAIN } from '@/domains/staking';
import { stakingValidators } from '@/aggregates/staking-validators';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../lib';
import { validatorSelectionModel } from '../validator-selection-model';

import { $identityCache, $validatorsCache, requestIdentitiesFx } from './domainMocks';

vi.mock('@/domains/staking', async (importOriginal) => {
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

vi.mock('@/domains/network', async (importOriginal) => {
  const actual = await importOriginal<typeof NetworkDomain>();
  const { $identityCache, requestIdentitiesFx } = await import('./domainMocks');

  return {
    ...actual,
    identity: { ...actual.identity, $list: $identityCache, request: requestIdentitiesFx },
  };
});

const CHAIN_ID: ChainId = DEFAULT_STAKING_CHAIN;
const ADDRESS_PREFIX = 2;

const ASSET: Asset = {
  name: 'Test',
  assetId: 0 as AssetId,
  symbol: 'TST',
  precision: 10,
  icon: { monochrome: '', colored: '' },
  type: AssetType.NATIVE,
};

const CHAIN: Chain = {
  chainId: CHAIN_ID,
  specName: 'test',
  name: 'Test chain',
  assets: [ASSET],
  nodes: [],
  icon: '',
  addressPrefix: ADDRESS_PREFIX,
};

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
  oversubscribed: false,
  slashed: false,
  eraPoints: 100,
  blocksAuthored: 10,
  apy: 10,
  elected: true,
  ...overrides,
});

const makeIdentity = (index: number, name: string, subName?: string): AccountIdentity => ({
  chainId: CHAIN_ID,
  accountId: accountId(index),
  name,
  subName,
  email: '',
  image: '',
  website: '',
});

const forkWith = ({
  validators = [],
  identities = [],
}: {
  validators?: EraValidator[];
  identities?: AccountIdentity[];
} = {}) => {
  return fork({
    values: [
      [$validatorsCache, { [CHAIN_ID]: Object.fromEntries(validators.map((v) => [v.accountId, v])) }],
      [$identityCache, { [CHAIN_ID]: Object.fromEntries(identities.map((i) => [i.accountId, i])) }],
    ],
    handlers: [[requestIdentitiesFx, () => ({})]],
  });
};

const initiate = (
  scope: Scope,
  params: Partial<Parameters<typeof validatorSelectionModel.events.formInitiated>[0]>,
) => {
  return allSettled(validatorSelectionModel.events.formInitiated, {
    scope,
    params: { chain: CHAIN, asset: ASSET, ...params },
  });
};

const visibleIds = (scope: Scope) =>
  scope.getState(validatorSelectionModel.$visibleValidators).map((validator) => validator.accountId);

// Three identified validators with distinct APYs, plus one anonymous one.
const SCENARIO = {
  validators: [
    makeValidator(1, { apy: 12, commission: 3, ownStake: '900071992547409910000000001' }),
    makeValidator(2, { apy: 25, commission: 8, ownStake: '900071992547409910000000003' }),
    makeValidator(3, { apy: 5, commission: 1, ownStake: '900071992547409910000000002' }),
    makeValidator(4, { apy: 40 }),
  ],
  identities: [makeIdentity(1, 'Alpha'), makeIdentity(2, 'Bravo'), makeIdentity(3, 'Charlie')],
};

describe('validatorSelectionModel init', () => {
  it('stores what the host handed over and defaults the signing mode to local', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});

    expect(scope.getState(validatorSelectionModel.$chain)).toEqual(CHAIN);
    expect(scope.getState(validatorSelectionModel.$asset)).toEqual(ASSET);
    expect(scope.getState(validatorSelectionModel.$signingMode)).toBe('local');
    expect(scope.getState(validatorSelectionModel.$sort)).toEqual(DEFAULT_SORT);
    expect(scope.getState(validatorSelectionModel.$filters)).toEqual(DEFAULT_FILTERS);
  });

  it('shows the identified validators by apy descending', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});

    // Validator 4 is anonymous and the default filter requires an identity.
    expect(visibleIds(scope)).toEqual([accountId(2), accountId(1), accountId(3)]);
    expect(scope.getState(validatorSelectionModel.$showingNote)).toEqual({ shown: 3, total: 4 });
  });

  it('preselects the current nominations and reports the acting account', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, { nominatedIds: [accountId(1), accountId(3)], signingMode: 'draft' });

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([accountId(1), accountId(3)]);
    expect(scope.getState(validatorSelectionModel.$nominatedIds)).toEqual([accountId(1), accountId(3)]);
    expect(scope.getState(validatorSelectionModel.$selectedCount)).toBe(2);
    expect(scope.getState(validatorSelectionModel.$signingMode)).toBe('draft');
  });

  it('resolves the strings the rows render', async () => {
    const scope = forkWith({
      ...SCENARIO,
      identities: [...SCENARIO.identities, makeIdentity(4, 'Alpha', 'node-2')],
    });

    await initiate(scope, {});

    expect(scope.getState(validatorSelectionModel.$displayedNames)).toEqual({
      [accountId(1)]: 'Alpha',
      [accountId(2)]: 'Bravo',
      [accountId(3)]: 'Charlie',
      [accountId(4)]: 'Alpha/node-2',
    });
    expect(scope.getState(validatorSelectionModel.$displayedAddresses)[accountId(1)]).toBe(
      toAddress(accountId(1), { prefix: ADDRESS_PREFIX }),
    );
  });

  it('numbers cluster positions in recommendation order, not in the current sort', async () => {
    const scope = forkWith({
      validators: [makeValidator(1, { apy: 5 }), makeValidator(2, { apy: 30 }), makeValidator(3, { apy: 20 })],
      identities: [makeIdentity(1, 'Alpha'), makeIdentity(2, 'Alpha', 'node-2'), makeIdentity(3, 'Alpha', 'node-3')],
    });

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.sortChanged, {
      scope,
      params: { column: 'commission', direction: 'asc' },
    });

    // Apy order is 2, 3, 1 - the third of the cluster is validator 1 regardless
    // of the column the user is sorting by.
    expect(scope.getState(validatorSelectionModel.$clusterPositions)).toEqual({
      [accountId(2)]: 1,
      [accountId(3)]: 2,
      [accountId(1)]: 3,
    });
  });

  it('reports the era and the size of the elected set', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});

    expect(scope.getState(validatorSelectionModel.$meta)).toEqual({ validatorCount: 4, era: null });
  });
});

describe('validatorSelectionModel table', () => {
  it('sorts by a chosen column, comparing planck stakes with BN', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.sortChanged, {
      scope,
      params: { column: 'ownStake', direction: 'desc' },
    });

    expect(visibleIds(scope)).toEqual([accountId(2), accountId(3), accountId(1)]);
  });

  it('narrows by filters and then by search, without re-ranking the sorted order', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.filtersChanged, { scope, params: { minApy: 10 } });

    expect(visibleIds(scope)).toEqual([accountId(2), accountId(1)]);
    expect(scope.getState(validatorSelectionModel.$filtersDiffer)).toBe(true);

    // "a" matches Alpha, Bravo and Charlie; the sorted order must survive the
    // search rather than being replaced by match weight (Alpha would win).
    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: 'a' });

    expect(visibleIds(scope)).toEqual([accountId(2), accountId(1)]);
  });

  it('matches a resolved name and a displayed address, never the hex account id', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});

    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: 'charlie' });
    expect(visibleIds(scope)).toEqual([accountId(3)]);

    await allSettled(validatorSelectionModel.events.queryChanged, {
      scope,
      params: toAddress(accountId(2), { prefix: ADDRESS_PREFIX }),
    });
    expect(visibleIds(scope)).toEqual([accountId(2)]);

    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: accountId(2) });
    expect(visibleIds(scope)).toEqual([]);
  });

  it('clears search and filters together, leaving the sort alone', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.sortChanged, {
      scope,
      params: { column: 'commission', direction: 'asc' },
    });
    await allSettled(validatorSelectionModel.events.filtersChanged, {
      scope,
      params: { minApy: 30, hasIdentity: false },
    });
    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: 'nothing' });

    expect(visibleIds(scope)).toEqual([]);

    await allSettled(validatorSelectionModel.events.clearSearchAndFilters, { scope });

    expect(scope.getState(validatorSelectionModel.$query)).toBe('');
    expect(scope.getState(validatorSelectionModel.$filters)).toEqual(DEFAULT_FILTERS);
    expect(scope.getState(validatorSelectionModel.$filtersDiffer)).toBe(false);
    expect(scope.getState(validatorSelectionModel.$sort)).toEqual({ column: 'commission', direction: 'asc' });
    expect(visibleIds(scope)).toEqual([accountId(3), accountId(1), accountId(2)]);
  });

  it('resets filters alone without touching the query', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.filtersChanged, { scope, params: { hideOversubscribed: true } });
    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: 'alpha' });
    await allSettled(validatorSelectionModel.events.filtersReset, { scope });

    expect(scope.getState(validatorSelectionModel.$filters)).toEqual(DEFAULT_FILTERS);
    expect(scope.getState(validatorSelectionModel.$query)).toBe('alpha');
  });

  it('delegates criteria changes to the shared aggregate', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.criteriaChanged, { scope, params: { requireIdentity: false } });

    expect(scope.getState(stakingValidators.$criteria).requireIdentity).toBe(false);
    expect(scope.getState(validatorSelectionModel.$criteria).requireIdentity).toBe(false);
  });
});

describe('validatorSelectionModel selection', () => {
  it('toggles a validator on and off', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: SCENARIO.validators[0]! });

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([accountId(1)]);

    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: SCENARIO.validators[0]! });

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([]);
  });

  it('ignores a blocked validator', async () => {
    const blocked = makeValidator(5, { blocked: true });
    const scope = forkWith({ validators: [...SCENARIO.validators, blocked], identities: SCENARIO.identities });

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: blocked });

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([]);
  });

  it('ignores every selection change in watch-only mode', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, { signingMode: 'watchOnly', nominatedIds: [accountId(1)] });
    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: SCENARIO.validators[1]! });
    await allSettled(validatorSelectionModel.events.fillWithRecommended, { scope });
    await allSettled(validatorSelectionModel.events.deselectAll, { scope });

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([accountId(1)]);
    expect(scope.getState(validatorSelectionModel.$canSubmit)).toBe(false);
  });

  it('refuses to add beyond the chain nomination limit but still allows removing', async () => {
    // 20 validators, chain limit falls back to 16 with no api connected.
    const validators = Array.from({ length: 20 }, (_, index) => makeValidator(index + 1, { apy: 20 - index }));
    const scope = forkWith({ validators });

    await initiate(scope, { nominatedIds: validators.slice(0, 16).map((v) => v.accountId) });

    expect(scope.getState(validatorSelectionModel.$maxNominations)).toBe(16);

    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: validators[16]! });
    expect(scope.getState(validatorSelectionModel.$selectedCount)).toBe(16);

    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: validators[0]! });
    expect(scope.getState(validatorSelectionModel.$selectedCount)).toBe(15);
  });

  it('replaces the selection with the recommendation and reports the estimated set apy', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, { nominatedIds: [accountId(3)] });
    await allSettled(validatorSelectionModel.events.fillWithRecommended, { scope });

    const recommended = scope.getState(validatorSelectionModel.$recommended);

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual(recommended);
    // Validator 4 is anonymous, and the saved criteria require an identity.
    expect(recommended).toEqual([accountId(2), accountId(1), accountId(3)]);
    // (25 + 12 + 5) / 3
    expect(scope.getState(validatorSelectionModel.$estimatedSetApy)).toBeCloseTo(14);
  });

  it('has no estimated apy with nothing selected, and ignores validators with unknown apy', async () => {
    const scope = forkWith({
      validators: [makeValidator(1, { apy: 10 }), makeValidator(2, { apy: null })],
    });

    await initiate(scope, {});
    expect(scope.getState(validatorSelectionModel.$estimatedSetApy)).toBeNull();

    await allSettled(validatorSelectionModel.events.validatorToggled, {
      scope,
      params: makeValidator(2, { apy: null }),
    });
    expect(scope.getState(validatorSelectionModel.$estimatedSetApy)).toBeNull();

    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: makeValidator(1, { apy: 10 }) });
    expect(scope.getState(validatorSelectionModel.$estimatedSetApy)).toBe(10);
  });

  it('counts how many of the selected validators the current view actually shows', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, { nominatedIds: [accountId(1), accountId(3)] });
    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: 'alpha' });

    expect(scope.getState(validatorSelectionModel.$viewNote)).toEqual({
      selectedShown: 1,
      selected: 2,
      estimatedApy: 8.5,
    });
  });

  it('deselects everything at once', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, { nominatedIds: [accountId(1), accountId(3)] });
    await allSettled(validatorSelectionModel.events.deselectAll, { scope });

    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([]);
    expect(scope.getState(validatorSelectionModel.$canSubmit)).toBe(false);
  });
});

describe('validatorSelectionModel detail', () => {
  it('opens and closes the detail with its score breakdown', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});

    expect(scope.getState(validatorSelectionModel.$detailValidator)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$detailScore)).toBeNull();

    await allSettled(validatorSelectionModel.events.detailOpened, { scope, params: accountId(3) });

    expect(scope.getState(validatorSelectionModel.$detailValidator)?.accountId).toBe(accountId(3));
    // Cheapest commission of the set scores highest.
    expect(scope.getState(validatorSelectionModel.$detailScore)?.commission).toBeCloseTo(1 - 1 / 8);

    await allSettled(validatorSelectionModel.events.detailClosed, { scope });

    expect(scope.getState(validatorSelectionModel.$detailValidator)).toBeNull();
  });

  it('has no detail for a validator outside the elected set', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.detailOpened, { scope, params: accountId(99) });

    expect(scope.getState(validatorSelectionModel.$detailValidator)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$detailScore)).toBeNull();
  });
});

describe('validatorSelectionModel submit', () => {
  it('emits exactly the picked validators, in legacy shape and in pick order', async () => {
    const scope = forkWith(SCENARIO);
    const submitted: Validator[][] = [];

    createWatch({ unit: validatorSelectionModel.output.formSubmitted, scope, fn: (list) => submitted.push(list) });

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: SCENARIO.validators[2]! });
    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: SCENARIO.validators[0]! });

    expect(scope.getState(validatorSelectionModel.$canSubmit)).toBe(true);

    await allSettled(validatorSelectionModel.events.validatorsSubmitted, { scope });

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toEqual([
      {
        accountId: accountId(3),
        chainId: CHAIN_ID,
        ownStake: '900071992547409910000000002',
        totalStake: '1000',
        commission: 1,
        blocked: false,
        oversubscribed: false,
        slashed: false,
        apy: 5,
        avgApy: 0,
        nominators: [],
      },
      {
        accountId: accountId(1),
        chainId: CHAIN_ID,
        ownStake: '900071992547409910000000001',
        totalStake: '1000',
        commission: 3,
        blocked: false,
        oversubscribed: false,
        slashed: false,
        apy: 12,
        avgApy: 0,
        nominators: [],
      },
    ]);
  });

  it('emits nothing when nothing is selected', async () => {
    const scope = forkWith(SCENARIO);
    const submitted: Validator[][] = [];

    createWatch({ unit: validatorSelectionModel.output.formSubmitted, scope, fn: (list) => submitted.push(list) });

    await initiate(scope, {});
    await allSettled(validatorSelectionModel.events.validatorsSubmitted, { scope });

    expect(submitted).toHaveLength(0);
  });

  it('emits nothing in watch-only mode', async () => {
    const scope = forkWith(SCENARIO);
    const submitted: Validator[][] = [];

    createWatch({ unit: validatorSelectionModel.output.formSubmitted, scope, fn: (list) => submitted.push(list) });

    await initiate(scope, { signingMode: 'watchOnly', nominatedIds: [accountId(1)] });
    await allSettled(validatorSelectionModel.events.validatorsSubmitted, { scope });

    expect(submitted).toHaveLength(0);
  });
});

describe('validatorSelectionModel teardown', () => {
  it('resets every transient store so the next flow starts clean', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, {
      signingMode: 'draft',
      nominatedIds: [accountId(1)],
      signingInfo: { signerName: 'Signer' },
    });
    await allSettled(validatorSelectionModel.events.queryChanged, { scope, params: 'alpha' });
    await allSettled(validatorSelectionModel.events.filtersChanged, { scope, params: { minApy: 4 } });
    await allSettled(validatorSelectionModel.events.sortChanged, {
      scope,
      params: { column: 'commission', direction: 'asc' },
    });
    await allSettled(validatorSelectionModel.events.detailOpened, { scope, params: accountId(2) });
    await allSettled(validatorSelectionModel.events.validatorToggled, { scope, params: SCENARIO.validators[1]! });

    await allSettled(validatorSelectionModel.events.formCleared, { scope });

    expect(scope.getState(validatorSelectionModel.$chain)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$asset)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$signingMode)).toBe('local');
    expect(scope.getState(validatorSelectionModel.$initiator)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$signingInfo)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$nominatedIds)).toEqual([]);
    expect(scope.getState(validatorSelectionModel.$query)).toBe('');
    expect(scope.getState(validatorSelectionModel.$filters)).toEqual(DEFAULT_FILTERS);
    expect(scope.getState(validatorSelectionModel.$sort)).toEqual(DEFAULT_SORT);
    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([]);
    expect(scope.getState(validatorSelectionModel.$detailValidator)).toBeNull();
    expect(scope.getState(validatorSelectionModel.$canSubmit)).toBe(false);
  });

  it('starts the next flow from the new input, not from the previous one', async () => {
    const scope = forkWith(SCENARIO);

    await initiate(scope, { signingMode: 'watchOnly', nominatedIds: [accountId(1), accountId(2)] });
    await allSettled(validatorSelectionModel.events.formCleared, { scope });
    await initiate(scope, {});

    expect(scope.getState(validatorSelectionModel.$signingMode)).toBe('local');
    expect(scope.getState(validatorSelectionModel.$selected)).toEqual([]);
  });
});
