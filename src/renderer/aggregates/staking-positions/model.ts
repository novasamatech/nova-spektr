import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import {
  type EventCallable,
  type Store,
  combine,
  createEffect,
  createEvent,
  createStore,
  sample,
  scopeBind,
} from 'effector';

import { type Chain, type ChainId, type EraIndex, type Wallet } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { type AnyAccount, accountService } from '@/domains/network';
import {
  type DerivePositionInput,
  type EraAnchor,
  AssetHubChains,
  era as eraModel,
  exposurePagesCacheKey,
  exposures as exposuresModel,
  nominations as nominationsModel,
  positionsService,
  staking as stakingModel,
  validators as validatorsModel,
} from '@/domains/staking';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const { eraResource, eraProgressResource } = eraModel;
const { exposuresResource, exposurePagesResource } = exposuresModel;
const { nominationsResource, minBondResource } = nominationsModel;
const { validatorsResource } = validatorsModel;
const { stakingResource } = stakingModel;

// --- Public types ---

/** Totals of a single staking chain. Planck amounts are in that chain's asset. */
export type StakingChainSummary = {
  chainId: ChainId;
  /** Sum of `stake.total` — bonded plus everything still unbonding. */
  totalStaked: string;
  redeemable: string;
  totalUnbonding: string;
  /** Distinct validators actively backing any position of this chain. */
  activeValidatorCount: number;
  positionCount: number;
  /** Positions with status `active` — the ones actually earning. */
  earningPositionCount: number;
};

export type StakingSummary = {
  /** Chains that hold at least one position, in staking-chain order. */
  chains: StakingChainSummary[];
  byChain: Record<ChainId, StakingChainSummary>;
  /**
   * Distinct active validators across every chain. A validator account is
   * counted per chain: the same key on Polkadot and Kusama is two validators.
   */
  activeValidatorCount: number;
  positionCount: number;
  earningPositionCount: number;
};

const reset = createEvent();

// --- Resource pools ---
//
// The `shared/query` resources are ref-counted pools: every `start` must be
// matched by a `stop` with the very same key, or the underlying subscription
// (or in-flight request) outlives the thing that asked for it. Instead of
// scattering that bookkeeping, every resource driven here goes through one
// pool binding that diffs the desired request list against the started keys.

type PooledResource<Params> = {
  start: EventCallable<Params>;
  stop: EventCallable<ResourceRequestKey>;
  createKey: (params: Params) => ResourceRequestKey;
};

type ResourcePool = {
  $activeKeys: Store<ResourceRequestKey[]>;
};

function bindResourcePool<Params>(resource: PooledResource<Params>, $requests: Store<Params[]>): ResourcePool {
  const $activeKeys = createStore<ResourceRequestKey[]>([]);

  const syncFx = createEffect(({ requests, activeKeys }: { requests: Params[]; activeKeys: ResourceRequestKey[] }) => {
    const start = scopeBind(resource.start, { safe: true });
    const stop = scopeBind(resource.stop, { safe: true });

    const desired = new Map<ResourceRequestKey, Params>();
    for (const request of requests) {
      const key = resource.createKey(request);
      if (!desired.has(key)) {
        desired.set(key, request);
      }
    }

    const active = new Set(activeKeys);

    for (const key of active) {
      if (!desired.has(key)) {
        stop(key);
      }
    }

    for (const [key, request] of desired) {
      if (!active.has(key)) {
        start(request);
      }
    }

    return [...desired.keys()];
  });

  const stopAllFx = createEffect((activeKeys: ResourceRequestKey[]) => {
    const stop = scopeBind(resource.stop, { safe: true });

    for (const key of activeKeys) {
      stop(key);
    }
  });

  sample({
    clock: $requests,
    source: $activeKeys,
    fn: (activeKeys, requests) => ({ requests, activeKeys }),
    target: syncFx,
  });

  $activeKeys.on(syncFx.doneData, (_, keys) => keys);

  sample({
    clock: reset,
    source: $activeKeys,
    filter: keys => keys.length > 0,
    target: stopAllFx,
  });

  $activeKeys.reset(stopAllFx.done);

  return { $activeKeys };
}

// --- Staking chains ---
//
// The dashboard is multi-chain: every Asset Hub the running config actually
// knows about, never a hardcoded pair. Westend Asset Hub only exists in dev
// configs, so the intersection with `networkModel.$chains` is what decides.

const $stakingChains = networkModel.$chains.map(chains =>
  Object.values(AssetHubChains)
    .map(chainId => chains[chainId])
    .filter(nonNullable),
);

// --- Accounts per chain ---

type ChainAccounts = {
  chain: Chain;
  chainId: ChainId;
  accountIds: AccountId[];
};

/**
 * A Polkadot Vault base account shadows its own chain accounts, so it is
 * dropped whenever the wallet has derived ones - mirrors the Staking page.
 */
function filterWalletAccounts(accounts: AnyAccount[], wallet: Wallet | null): AnyAccount[] {
  if (!walletUtils.isPolkadotVault(wallet) || accounts.length <= 1) {
    return accounts;
  }

  return accounts.filter(account => !accountUtils.isVaultBaseAccount(account));
}

const $chainAccounts = combine(
  {
    chains: $stakingChains,
    wallet: walletSelect.$selectedWallet,
    selectedAccounts: walletSelect.$selectedAccounts,
  },
  ({ chains, wallet, selectedAccounts }): ChainAccounts[] => {
    const walletAccounts = filterWalletAccounts(selectedAccounts, wallet);

    return chains.map(chain => ({
      chain,
      chainId: chain.chainId,
      accountIds: [
        ...new Set(
          walletAccounts
            .filter(account => accountService.isAccountAvailableOnChain(account, chain))
            .map(account => account.accountId),
        ),
      ],
    }));
  },
);

// --- Requestable chains (connected api + at least one account) ---

type ChainRequest = ChainAccounts & {
  api: ApiPromise;
  /** Relay-chain api - era timing and the authored-blocks probe live there. */
  timelineApi: ApiPromise;
};

const $chainRequests = combine(
  { chainAccounts: $chainAccounts, apis: networkModel.$apis },
  ({ chainAccounts, apis }): ChainRequest[] => {
    const requests: ChainRequest[] = [];

    for (const entry of chainAccounts) {
      const api = apis[entry.chainId];
      if (nullable(api) || entry.accountIds.length === 0) continue;

      const parentApi = entry.chain.parentId ? apis[entry.chain.parentId] : null;

      requests.push({ ...entry, api, timelineApi: parentApi ?? api });
    }

    return requests;
  },
);

// --- (chain, accounts) driven resources ---

const $stakingRequests = $chainRequests.map(requests =>
  requests.map(({ chainId, api, accountIds }) => ({ chainId, api, accounts: accountIds })),
);

const $nominationsRequests = $chainRequests.map(requests =>
  requests.map(({ chainId, api, accountIds }) => ({ chainId, api, stashes: accountIds })),
);

const $chainOnlyRequests = $chainRequests.map(requests => requests.map(({ chainId, api }) => ({ chainId, api })));

bindResourcePool(stakingResource, $stakingRequests);
bindResourcePool(nominationsResource, $nominationsRequests);
bindResourcePool(minBondResource, $chainOnlyRequests);
bindResourcePool(eraResource, $chainOnlyRequests);

// --- Active era per chain ---

const $eras = combine($chainAccounts, eraResource.$cache, (chainAccounts, cache) => {
  const eras: Record<ChainId, EraIndex> = {};

  for (const { chainId } of chainAccounts) {
    const era = cache[chainId];
    if (nonNullable(era)) {
      eras[chainId] = era;
    }
  }

  return eras;
});

// --- (chain, era) driven resources ---
//
// The era is part of every key below, so a new era yields a new key and the
// pool binding stops the previous one - no leaked refcount across eras.

type EraChainRequest = ChainRequest & { era: EraIndex };

const $eraChainRequests = combine($chainRequests, $eras, (requests, eras): EraChainRequest[] =>
  requests.flatMap(request => {
    const era = eras[request.chainId];

    return nonNullable(era) ? [{ ...request, era }] : [];
  }),
);

const $exposuresRequests = $eraChainRequests.map(requests =>
  requests.map(({ chainId, api, era }) => ({ chainId, api, era })),
);

const $validatorsRequests = $eraChainRequests.map(requests =>
  requests.map(({ chainId, api, era, timelineApi }) => ({ chainId, api, era, timelineApi })),
);

const $eraProgressRequests = $eraChainRequests.map(requests =>
  requests.map(({ chainId, api, era, timelineApi, chain }) => ({ chainId, api, era, timelineApi, chain })),
);

bindResourcePool(exposuresResource, $exposuresRequests);
bindResourcePool(validatorsResource, $validatorsRequests);
bindResourcePool(eraProgressResource, $eraProgressRequests);

// --- Nominated validators per chain ---
//
// Exposure pages are read for the union of what the chain's accounts nominate.
// The union is kept in its own store behind a content check: the nominations
// cache is a live subscription and re-emits on every block, and a fresh array
// on each tick would otherwise churn the pooled exposure-pages subscription.

const $nominatedValidatorsSource = combine(
  $chainAccounts,
  nominationsResource.$cache,
  (chainAccounts, cache): Record<ChainId, AccountId[]> => {
    const result: Record<ChainId, AccountId[]> = {};

    for (const { chainId, accountIds } of chainAccounts) {
      const chainNominations = cache[chainId];
      if (nullable(chainNominations)) continue;

      const union = new Set<AccountId>();
      for (const accountId of accountIds) {
        for (const target of chainNominations[accountId]?.targets ?? []) {
          union.add(target);
        }
      }

      if (union.size > 0) {
        result[chainId] = [...union].sort();
      }
    }

    return result;
  },
);

function isSameValidatorMap(a: Record<ChainId, AccountId[]>, b: Record<ChainId, AccountId[]>): boolean {
  const entries = Object.entries(a);
  const other = new Map(Object.entries(b));

  if (entries.length !== other.size) return false;

  return entries.every(([chainId, left]) => {
    const right = other.get(chainId);

    return nonNullable(right) && left.length === right.length && left.every((value, index) => value === right[index]);
  });
}

const $nominatedValidators = createStore<Record<ChainId, AccountId[]>>({});

sample({
  clock: $nominatedValidatorsSource,
  source: $nominatedValidators,
  filter: (current, next) => !isSameValidatorMap(current, next),
  fn: (_, next) => next,
  target: $nominatedValidators,
});

const $exposurePagesRequests = combine($eraChainRequests, $nominatedValidators, (requests, nominated) =>
  requests.flatMap(({ chainId, api, era }) => {
    const validators = nominated[chainId];

    return nonNullable(validators) && validators.length > 0 ? [{ chainId, api, era, validators }] : [];
  }),
);

bindResourcePool(exposurePagesResource, $exposurePagesRequests);

// --- Positions ---

const EMPTY_VALIDATORS: AccountId[] = [];

const $positions = combine(
  {
    chainAccounts: $chainAccounts,
    ledgers: stakingResource.$cache,
    nominations: nominationsResource.$cache,
    exposurePages: exposurePagesResource.$cache,
    validators: validatorsResource.$cache,
    eras: $eras,
    eraProgress: eraProgressResource.$cache,
    nominated: $nominatedValidators,
  },
  ({ chainAccounts, ledgers, nominations, exposurePages, validators, eras, eraProgress, nominated }) => {
    const inputs: DerivePositionInput[] = [];

    for (const { chainId, accountIds } of chainAccounts) {
      const activeEra = eras[chainId];
      if (nullable(activeEra)) continue;

      const chainLedgers = ledgers[chainId];
      if (nullable(chainLedgers)) continue;

      const chainNominations = nominations[chainId] ?? {};
      const chainValidators = validators[chainId] ?? null;
      const pagesKey = exposurePagesCacheKey(chainId, activeEra, nominated[chainId] ?? EMPTY_VALIDATORS);
      const chainExposures = exposurePages[pagesKey] ?? {};

      const progress = eraProgress[chainId];
      const eraAnchor: EraAnchor | null =
        nonNullable(progress) && progress.era === activeEra
          ? { eraStartMs: progress.eraStartMs, eraDurationMs: progress.eraDurationMs }
          : null;

      for (const accountId of accountIds) {
        const stake = chainLedgers[accountId];
        if (nullable(stake)) continue;

        inputs.push({
          accountId,
          chainId,
          stake,
          nomination: chainNominations[accountId] ?? null,
          exposures: chainExposures,
          validators: chainValidators,
          activeEra,
          eraAnchor,
        });
      }
    }

    return positionsService.derivePositions(inputs);
  },
);

// --- Summary ---

function addPlanck(a: string, b: string): string {
  return new BN(a).add(new BN(b)).toString();
}

function createChainSummary(chainId: ChainId): StakingChainSummary {
  return {
    chainId,
    totalStaked: '0',
    redeemable: '0',
    totalUnbonding: '0',
    activeValidatorCount: 0,
    positionCount: 0,
    earningPositionCount: 0,
  };
}

const $summary = $positions.map((positions): StakingSummary => {
  const byChain: Record<ChainId, StakingChainSummary> = {};
  const chains: StakingChainSummary[] = [];
  const validatorsByChain = new Map<ChainId, Set<AccountId>>();

  for (const position of positions) {
    const { chainId } = position;

    let summary = byChain[chainId];
    if (nullable(summary)) {
      summary = createChainSummary(chainId);
      byChain[chainId] = summary;
      chains.push(summary);
      validatorsByChain.set(chainId, new Set());
    }

    summary.totalStaked = addPlanck(summary.totalStaked, position.stake.total);
    summary.redeemable = addPlanck(summary.redeemable, position.redeemable);
    summary.totalUnbonding = addPlanck(summary.totalUnbonding, position.totalUnbonding);
    summary.positionCount += 1;
    if (position.status === 'active') {
      summary.earningPositionCount += 1;
    }

    const chainValidators = validatorsByChain.get(chainId);
    for (const validator of position.activeValidators) {
      chainValidators?.add(validator);
    }
  }

  let activeValidatorCount = 0;
  let earningPositionCount = 0;

  for (const summary of chains) {
    summary.activeValidatorCount = validatorsByChain.get(summary.chainId)?.size ?? 0;
    activeValidatorCount += summary.activeValidatorCount;
    earningPositionCount += summary.earningPositionCount;
  }

  return {
    chains,
    byChain,
    activeValidatorCount,
    positionCount: positions.length,
    earningPositionCount,
  };
});

// --- Minimum nominator bond ---

const $minNominatorBond = combine($stakingChains, minBondResource.$cache, (chains, cache) => {
  const result: Record<ChainId, string> = {};

  for (const { chainId } of chains) {
    const minBond = cache[chainId];
    if (nonNullable(minBond)) {
      result[chainId] = minBond;
    }
  }

  return result;
});

// --- Pending ---
//
// A chain resolves as soon as its ledger map has landed - the ledger
// subscription writes an entry for every requested account, `undefined`
// included, so "no positions here" is an answer, not an unfinished load.

const $pending = combine(
  {
    chainAccounts: $chainAccounts,
    ledgers: stakingResource.$cache,
    nominations: nominationsResource.$cache,
    eras: $eras,
    connections: networkModel.$connections,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainAccounts, ledgers, nominations, eras, connections, statuses }) => {
    return chainAccounts.some(({ chainId, accountIds }) => {
      if (accountIds.length === 0) return false;

      // A chain that will never answer must not hold the whole dashboard.
      const connection = connections[chainId];
      if (nonNullable(connection) && networkUtils.isDisabledConnection(connection)) return false;

      const status = statuses[chainId];
      if (nonNullable(status) && networkUtils.isErrorStatus(status)) return false;

      if (nullable(eras[chainId])) return true;

      const chainLedgers = ledgers[chainId];
      if (nullable(chainLedgers)) return true;

      const bonded = accountIds.filter(accountId => nonNullable(chainLedgers[accountId]));
      if (bonded.length === 0) return false;

      const chainNominations = nominations[chainId];
      if (nullable(chainNominations)) return true;

      return bonded.some(accountId => !(accountId in chainNominations));
    });
  },
);

export const stakingPositions = {
  $stakingChains,
  $chainAccounts,
  $nominatedValidators,

  $positions,
  $summary,
  $minNominatorBond,
  $pending,

  reset,
};

export type { ChainAccounts };
