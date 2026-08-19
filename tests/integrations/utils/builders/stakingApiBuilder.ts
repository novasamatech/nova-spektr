import { type ApiPromise } from '@polkadot/api';
import { StorageKey, TypeRegistry } from '@polkadot/types';
import { type Codec } from '@polkadot/types/types';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * Asset Hub staking mock api.
 *
 * The staking domain reads the chain through two doors: `api.query.staking.*`
 * (subscriptions and prefix reads, parsed by the real `pjsSchema` codecs) and
 * `api.consts.staking.*`. Both are answered here with **real polkadot.js
 * codecs** built from a `TypeRegistry`, so every service, resource and schema
 * above this file stays untouched - only the chain itself is replaced.
 *
 * The state is a plain mutable object: a case overrides just the slices it
 * cares about at construction, then mutates and re-emits during the test.
 */

let eraCursor = 1000;

/**
 * A fresh era index, never repeated inside one worker.
 *
 * `createQueryResource` memoises responses in a module-level map keyed by the
 * resource key, while its cache **store** is scope-local. A second `fork()`
 * asking for a key an earlier test already resolved is answered from the memo,
 * `push` is filtered out as `cached`, and the new scope's cache store stays
 * empty. Era is part of every era-scoped staking key, so a per-test era keeps
 * the scopes independent.
 */
export function nextStakingEra(): number {
  eraCursor += 10;

  return eraCursor;
}

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
  TestEraRewardPoints: {
    total: 'u32',
    individual: 'BTreeMap<AccountId32, u32>',
  },
  TestSlashingSpans: {
    spanIndex: 'u32',
    lastStart: 'u32',
    lastNonzeroSlash: 'u32',
    prior: 'Vec<u32>',
  },
});

/**
 * `pjsSchema.storageKey` demands a genuine `StorageKey` instance, but decoding
 * one needs the chain's portable registry. An empty key is a real instance; its
 * `args` accessor is shadowed with the decoded values the callers read.
 */
function createStorageKey(args: Codec[]): StorageKey {
  const key = new StorageKey(registry, '0x00');

  Object.defineProperty(key, 'args', { get: () => args });

  return key;
}

const accountIdCodec = (accountId: AccountId) => registry.createType('AccountId32', accountId);
const u32 = (value: number) => registry.createType('u32', value);
const u64 = (value: number) => registry.createType('u64', value);
const u128 = (value: string) => registry.createType('u128', value);
const optional = (type: string, value: unknown) => registry.createType(`Option<${type}>`, value);

// --- Fixture shapes ---

export type StakingUnlockFixture = {
  value: string;
  era: number;
};

export type StakingLedgerFixture = {
  /** Defaults to the map key - override only for split stash/controller setups. */
  stash?: AccountId;
  total: string;
  active: string;
  unlocking?: StakingUnlockFixture[];
  legacyClaimedRewards?: number[];
};

export type StakingNominationFixture = {
  targets: AccountId[];
  submittedIn: number;
};

export type StakingExposurePageFixture = {
  who: AccountId;
  value: string;
};

export type StakingExposureFixture = {
  total: string;
  own: string;
  /** Defaults to the number of nominators across every page. */
  nominatorCount?: number;
  /** Single-page shorthand - mutually exclusive with `pages`. */
  others?: StakingExposurePageFixture[];
  /** Explicit pages; the array index is the real exposure page index. */
  pages?: StakingExposurePageFixture[][];
};

export type StakingPrefsFixture = {
  /** Perbill: 100_000_000 is 10%. */
  commission: number;
  blocked?: boolean;
};

export type StakingRewardPointsFixture = {
  total: number;
  individual: Record<AccountId, number>;
};

export type StakingConstsFixture = {
  historyDepth: number;
  bondingDuration: number;
  sessionsPerEra: number;
  maxExposurePageSize: number;
  slashDeferDuration: number;
  maxNominations: number;
  /** Babe consts of the timeline chain - drive the era anchor. */
  epochDuration: number;
  expectedBlockTime: number;
};

const DEFAULT_CONSTS: StakingConstsFixture = {
  historyDepth: 84,
  bondingDuration: 28,
  sessionsPerEra: 6,
  maxExposurePageSize: 512,
  slashDeferDuration: 27,
  maxNominations: 16,
  epochDuration: 2400,
  expectedBlockTime: 6000,
};

export type StakingApiState = {
  activeEra: { index: EraIndex; startMs: number | null } | null;
  /** Stash to controller. Absent entries mean the stash is its own controller. */
  bonded: Record<AccountId, AccountId>;
  /** Keyed by **controller** - with no `bonded` override that is the stash. */
  ledgers: Record<AccountId, StakingLedgerFixture | null>;
  nominations: Record<AccountId, StakingNominationFixture | null>;
  minNominatorBond: string;
  /** `era -> validator -> exposure`. */
  exposures: Record<number, Record<AccountId, StakingExposureFixture>>;
  prefs: Record<AccountId, StakingPrefsFixture>;
  rewardPoints: Record<number, StakingRewardPointsFixture>;
  erasValidatorReward: Record<number, string>;
  erasTotalStake: Record<number, string>;
  /** `${era}-${validator}` to the already claimed page indexes. */
  claimedRewards: Record<string, number[]>;
  /** Validator to the era of its last non-zero slash. */
  slashed: Record<AccountId, number>;
  consts: StakingConstsFixture;
};

export type StakingSubscriptionKind = 'activeEra' | 'ledger' | 'nominators' | 'minNominatorBond' | 'validatorPrefs';

export type StakingApiHandle = {
  api: ApiPromise;
  chainId: ChainId;
  state: StakingApiState;
  /** Pushes the current state into every live subscription. */
  emit(): void;
  setActiveEra(index: EraIndex, startMs?: number | null): void;
  setLedger(controller: AccountId, ledger: StakingLedgerFixture | null): void;
  setNomination(stash: AccountId, nomination: StakingNominationFixture | null): void;
  setMinNominatorBond(value: string): void;
  /** Subscriptions currently held open by the api, per storage item. */
  liveSubscriptions(): Record<StakingSubscriptionKind, number>;
  /** How many times each storage item was subscribed to, ever. */
  subscribeCalls(): Record<StakingSubscriptionKind, number>;
  /** Prefix/point reads, per storage item - proves a read happened once. */
  readCalls(): Record<string, number>;
};

export type CreateStakingApiParams = Partial<Omit<StakingApiState, 'consts'>> & {
  chainId: ChainId;
  consts?: Partial<StakingConstsFixture>;
  /**
   * Classic `pallet_staking` exposes `slashingSpans`; staking-async dropped it
   * and the defer window is walked over `unappliedSlashes` instead. Present by
   * default - flip to exercise the fallback.
   */
  withSlashingSpans?: boolean;
  /**
   * Advertises an `identity` pallet so `identityPallet.supportedOn` picks this
   * chain instead of falling back to the People chain. The storage calls
   * themselves are expected to be stubbed by the case.
   */
  withIdentityPallet?: boolean;
};

type Subscription = {
  kind: StakingSubscriptionKind;
  notify: () => void;
};

// --- Codec builders ---

function buildLedgerCodec(controller: AccountId, ledger: StakingLedgerFixture | null) {
  if (!ledger) return optional('TestStakingLedger', null);

  return optional('TestStakingLedger', {
    stash: ledger.stash ?? controller,
    total: ledger.total,
    active: ledger.active,
    unlocking: (ledger.unlocking ?? []).map((chunk) => ({ value: chunk.value, era: chunk.era })),
    legacyClaimedRewards: ledger.legacyClaimedRewards ?? [],
  });
}

function buildNominationsCodec(nomination: StakingNominationFixture | null) {
  if (!nomination) return optional('TestNominations', null);

  return optional('TestNominations', {
    targets: nomination.targets,
    submittedIn: nomination.submittedIn,
    suppressed: false,
  });
}

function buildActiveEraCodec(activeEra: StakingApiState['activeEra']) {
  if (!activeEra) return optional('TestActiveEraInfo', null);

  return optional('TestActiveEraInfo', { index: activeEra.index, start: activeEra.startMs });
}

function exposurePages(exposure: StakingExposureFixture): StakingExposurePageFixture[][] {
  if (exposure.pages) return exposure.pages;
  if (exposure.others) return [exposure.others];

  return [];
}

function countNominators(exposure: StakingExposureFixture): number {
  return exposure.nominatorCount ?? exposurePages(exposure).reduce((acc, page) => acc + page.length, 0);
}

// --- Builder ---

export function createStakingApi(params: CreateStakingApiParams): StakingApiHandle {
  const { chainId, consts, withSlashingSpans = true, withIdentityPallet = false, ...rest } = params;

  const state: StakingApiState = {
    activeEra: null,
    bonded: {},
    ledgers: {},
    nominations: {},
    minNominatorBond: '0',
    exposures: {},
    prefs: {},
    rewardPoints: {},
    erasValidatorReward: {},
    erasTotalStake: {},
    claimedRewards: {},
    slashed: {},
    ...rest,
    consts: { ...DEFAULT_CONSTS, ...consts },
  };

  const subscriptions = new Set<Subscription>();
  const subscribeCounters: Record<StakingSubscriptionKind, number> = {
    activeEra: 0,
    ledger: 0,
    nominators: 0,
    minNominatorBond: 0,
    validatorPrefs: 0,
  };
  const readCounters: Record<string, number> = {};

  const countRead = (name: string) => {
    readCounters[name] = (readCounters[name] ?? 0) + 1;
  };

  function register(kind: StakingSubscriptionKind, notify: () => void): () => void {
    const subscription: Subscription = { kind, notify };

    subscriptions.add(subscription);
    subscribeCounters[kind] += 1;
    notify();

    return () => subscriptions.delete(subscription);
  }

  /**
   * Polkadot.js storage queries switch on the last argument: a function turns
   * the call into a subscription that resolves to its own unsubscriber.
   */
  const isCallback = (value: unknown): value is (data: unknown) => void => typeof value === 'function';

  const query = {
    activeEra: (maybeCallback?: unknown) => {
      if (isCallback(maybeCallback)) {
        return Promise.resolve(register('activeEra', () => maybeCallback(buildActiveEraCodec(state.activeEra))));
      }

      countRead('activeEra');

      return Promise.resolve(buildActiveEraCodec(state.activeEra));
    },

    bonded: {
      multi: (accountIds: AccountId[]) => {
        countRead('bonded');

        return Promise.resolve(
          accountIds.map((accountId) => {
            const controller = state.bonded[accountId];

            return optional('AccountId32', controller ? accountIdCodec(controller) : null);
          }),
        );
      },
    },

    ledger: {
      multi: (controllers: AccountId[], maybeCallback?: unknown) => {
        const build = () =>
          controllers.map((controller) => buildLedgerCodec(controller, state.ledgers[controller] ?? null));

        if (isCallback(maybeCallback)) {
          return Promise.resolve(register('ledger', () => maybeCallback(build())));
        }

        countRead('ledger');

        return Promise.resolve(build());
      },
    },

    nominators: {
      multi: (stashes: AccountId[], maybeCallback?: unknown) => {
        const build = () => stashes.map((stash) => buildNominationsCodec(state.nominations[stash] ?? null));

        if (isCallback(maybeCallback)) {
          return Promise.resolve(register('nominators', () => maybeCallback(build())));
        }

        countRead('nominators');

        return Promise.resolve(build());
      },
    },

    // The validator-prefs service reads this item through the third door: raw
    // `state_subscribeStorage` over `key(stash)`, because `.multi` would decode
    // a missing key as default prefs and erase the existence signal. The key is
    // the stash itself here — the service treats keys opaquely, and the rpc
    // stub below maps them straight back into `state.prefs`.
    validators: {
      key: (stash: AccountId) => stash,
      creator: { meta: { type: { asMap: { value: 'TestValidatorPrefs' } } } },
    },

    minNominatorBond: (maybeCallback?: unknown) => {
      if (isCallback(maybeCallback)) {
        return Promise.resolve(register('minNominatorBond', () => maybeCallback(u128(state.minNominatorBond))));
      }

      countRead('minNominatorBond');

      return Promise.resolve(u128(state.minNominatorBond));
    },

    erasStakersOverview: {
      entries: (era: number) => {
        countRead('erasStakersOverview');

        const eraExposures = state.exposures[era] ?? {};

        return Promise.resolve(
          Object.entries(eraExposures).map(([validator, exposure]) => [
            createStorageKey([u32(era), accountIdCodec(validator as AccountId)]),
            optional('TestPagedExposureMetadata', {
              total: exposure.total,
              own: exposure.own,
              nominatorCount: countNominators(exposure),
              pageCount: exposurePages(exposure).length,
            }),
          ]),
        );
      },
    },

    erasStakersPaged: {
      entries: (era: number, validator: AccountId) => {
        countRead('erasStakersPaged');

        const exposure = state.exposures[era]?.[validator];
        if (!exposure) return Promise.resolve([]);

        return Promise.resolve(
          exposurePages(exposure).map((page, index) => [
            createStorageKey([u32(era), accountIdCodec(validator), u32(index)]),
            optional('TestExposurePage', {
              pageTotal: page.reduce((acc, item) => acc + BigInt(item.value), 0n).toString(),
              others: page.map((item) => ({ who: item.who, value: item.value })),
            }),
          ]),
        );
      },
    },

    erasValidatorPrefs: {
      entries: (era: number) => {
        countRead('erasValidatorPrefs');

        return Promise.resolve(
          Object.entries(state.prefs).map(([validator, prefs]) => [
            createStorageKey([u32(era), accountIdCodec(validator as AccountId)]),
            registry.createType('TestValidatorPrefs', {
              commission: prefs.commission,
              blocked: prefs.blocked ?? false,
            }),
          ]),
        );
      },
      multi: (keys: [number, AccountId][]) => {
        countRead('erasValidatorPrefsFor');

        return Promise.resolve(
          keys.map(([, validator]) => {
            const prefs = state.prefs[validator];

            return registry.createType('TestValidatorPrefs', {
              commission: prefs?.commission ?? 0,
              blocked: prefs?.blocked ?? false,
            });
          }),
        );
      },
    },

    erasRewardPoints: (era: number) => {
      countRead('erasRewardPoints');

      const points = state.rewardPoints[era] ?? { total: 0, individual: {} };

      return Promise.resolve(
        registry.createType('TestEraRewardPoints', {
          total: points.total,
          individual: new Map(Object.entries(points.individual)),
        }),
      );
    },

    erasValidatorReward: {
      multi: (eras: number[]) => {
        countRead('erasValidatorReward');

        return Promise.resolve(
          eras.map((era) => {
            const reward = state.erasValidatorReward[era];

            return optional('u128', reward ? u128(reward) : null);
          }),
        );
      },
    },

    erasTotalStake: (era: number) => {
      countRead('erasTotalStake');

      return Promise.resolve(u128(state.erasTotalStake[era] ?? '0'));
    },

    claimedRewards: {
      multi: (keys: [number, AccountId][]) => {
        countRead('claimedRewards');

        return Promise.resolve(
          keys.map(([era, validator]) => (state.claimedRewards[`${era}-${validator}`] ?? []).map((page) => u32(page))),
        );
      },
    },

    // Staking-async shape: a double map whose keys carry the validator. Kept
    // empty so the `slashingSpans` fallback stays cheap when it is exercised.
    unappliedSlashes: Object.assign(() => Promise.resolve([]), {
      creator: { meta: { type: { isMap: true, asMap: { hashers: ['Twox64Concat', 'Blake2_128Concat'] } } } },
      keys: () => Promise.resolve([]),
    }),

    erasStartSessionIndex: (era: number) => {
      countRead('erasStartSessionIndex');

      return Promise.resolve(optional('u32', u32(era * state.consts.sessionsPerEra)));
    },
  };

  if (withSlashingSpans) {
    Object.assign(query, {
      slashingSpans: {
        multi: (validators: AccountId[]) => {
          countRead('slashingSpans');

          return Promise.resolve(
            validators.map((validator) => {
              const lastNonzeroSlash = state.slashed[validator];
              if (lastNonzeroSlash === undefined) return optional('TestSlashingSpans', null);

              return optional('TestSlashingSpans', {
                spanIndex: 1,
                lastStart: lastNonzeroSlash,
                lastNonzeroSlash,
                prior: [],
              });
            }),
          );
        },
      },
    });
  }

  const api = {
    genesisHash: { toHex: () => chainId },
    runtimeChain: { toString: () => `mock-${chainId}` },
    isReady: Promise.resolve(null),
    call: {},
    // Unrelated block-height probe of the network domain — stubbed so it stops
    // logging over the assertions.
    rpc: {
      chain: {
        getBlock: () => Promise.resolve({ block: { header: { number: { toNumber: () => 1 } } } }),
      },
      state: {
        // Raw storage subscription of the validator-prefs service. An absent
        // key answers as an empty `StorageData` — the live-node shape, whose
        // compact length prefix defeats `encodedLength` checks — and a present
        // one as the bare SCALE bytes of the prefs struct.
        subscribeStorage: (storageKeys: AccountId[], callback: (values: Codec[]) => void) => {
          const build = () =>
            storageKeys.map((stash) => {
              const prefs = state.prefs[stash];
              if (!prefs) return registry.createType('StorageData', '0x');

              const value = registry.createType('TestValidatorPrefs', {
                commission: prefs.commission,
                blocked: prefs.blocked ?? false,
              });

              return registry.createType('Raw', value.toU8a());
            });

          return Promise.resolve(register('validatorPrefs', () => callback(build())));
        },
      },
    },
    // Only `createLookupType` + `createType` are exercised: the prefs service
    // resolves the map's value type through the lookup, and the `validators`
    // stub above short-circuits that to the registered test type directly.
    registry: {
      createLookupType: (type: string) => type,
      createType: (type: string, value: unknown) => registry.createType(type, value),
    },
    consts: {
      staking: {
        historyDepth: u32(state.consts.historyDepth),
        bondingDuration: u32(state.consts.bondingDuration),
        sessionsPerEra: u32(state.consts.sessionsPerEra),
        maxExposurePageSize: u32(state.consts.maxExposurePageSize),
        slashDeferDuration: u32(state.consts.slashDeferDuration),
        maxNominations: u32(state.consts.maxNominations),
      },
      babe: {
        epochDuration: u64(state.consts.epochDuration),
        expectedBlockTime: u64(state.consts.expectedBlockTime),
      },
    },
    query: {
      staking: query,
      balances: {
        totalIssuance: () => Promise.resolve(u128('0')),
      },
      ...(withIdentityPallet ? { identity: {} } : {}),
    },
  } as unknown as ApiPromise;

  const emit = () => {
    for (const subscription of subscriptions) {
      subscription.notify();
    }
  };

  return {
    api,
    chainId,
    state,
    emit,

    setActiveEra(index, startMs = null) {
      state.activeEra = { index, startMs };
      emit();
    },
    setLedger(controller, ledger) {
      state.ledgers[controller] = ledger;
      emit();
    },
    setNomination(stash, nomination) {
      state.nominations[stash] = nomination;
      emit();
    },
    setMinNominatorBond(value) {
      state.minNominatorBond = value;
      emit();
    },

    liveSubscriptions() {
      const result: Record<StakingSubscriptionKind, number> = {
        activeEra: 0,
        ledger: 0,
        nominators: 0,
        minNominatorBond: 0,
        validatorPrefs: 0,
      };

      for (const subscription of subscriptions) {
        result[subscription.kind] += 1;
      }

      return result;
    },
    subscribeCalls: () => ({ ...subscribeCounters }),
    readCalls: () => ({ ...readCounters }),
  };
}
