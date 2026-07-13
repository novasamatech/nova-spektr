import { type ApiPromise } from '@polkadot/api';

import { type Chain, type ChainId, type Connection, ConnectionStatus, ConnectionType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { accountService } from '@/domains/network';
import { type ChainVestingEntry, type VestingChainRequest, vestingSchedulesResource } from '@/domains/vesting';

type Chains = Record<ChainId, Chain>;
type Apis = Record<ChainId, ApiPromise>;
type Connections = Record<ChainId, Connection>;
type Statuses = Record<ChainId, ConnectionStatus>;
type Cache = Record<ResourceRequestKey, ChainVestingEntry>;

/**
 * The chain runs `pallet_vesting` and exposes the claim call. The types promise
 * both are there; only the runtime metadata of the connected chain knows.
 */
const hasVestingPallet = (api: ApiPromise) =>
  nonNullable(api.tx?.vesting?.vest) && nonNullable(api.query?.vesting?.vesting);

/**
 * The vesting lookup for one chain, or `null` when the chain cannot hold
 * vesting for these accounts — because it has no vesting pallet, or because
 * none of the accounts even addresses this chain (substrate key on an EVM
 * chain, say).
 */
const buildChainRequest = (
  chain: Chain,
  api: ApiPromise | undefined,
  accountIds: AccountId[],
): VestingChainRequest | null => {
  if (!api || !hasVestingPallet(api)) return null;

  const chainAccountIds = accountIds.filter(accountId => accountService.isAccountSchemeMatchChain(accountId, chain));
  if (chainAccountIds.length === 0) return null;

  return { api, chain, accountIds: chainAccountIds };
};

/** Every chain we currently know can hold vesting for these accounts. */
export const buildRequests = (chains: Chains, apis: Apis, accountIds: AccountId[]): VestingChainRequest[] => {
  const requests: VestingChainRequest[] = [];

  for (const chain of Object.values(chains)) {
    const request = buildChainRequest(chain, apis[chain.chainId], accountIds);
    if (request) requests.push(request);
  }

  return requests;
};

type ResolutionSource = {
  connections: Connections;
  statuses: Statuses;
  chains: Chains;
  apis: Apis;
  accountIds: AccountId[];
  cache: Cache;
  /** The wait for chains to connect has run out — see `GRACE_MS` in the model. */
  graceExpired: boolean;
};

/**
 * How many enabled chains have yet to tell us whether they hold vesting.
 *
 * A chain's api only lands in `$apis` once its metadata is ready — the same
 * moment its status turns CONNECTED — so an api is the earliest point at which
 * we can read its runtime and know whether vesting is even possible there.
 * Until then the chain is _unresolved_: it may hold vesting, and calling the
 * wallet "not vesting" while any chain is unresolved would be a lie.
 *
 * A chain resolves when it errored out (we will never know, so stop waiting),
 * or its runtime has no vesting pallet, or no account of ours addresses it, or
 * — the only case where the answer is a real one — its schedules have arrived.
 *
 * The one thing that must never be waited on forever is a chain whose RPC is
 * simply dead. The app opens a provider for every enabled chain, and a socket
 * that cannot connect keeps retrying — the chain sits in CONNECTING, or flaps
 * between ERROR and CONNECTING, for the life of the app. Across dozens of
 * chains, at least one such chain is the norm rather than the exception, and
 * waiting on it would spin the loader forever. So once the grace period passes,
 * a chain that still has no api is given up on. A chain that _is_ connected
 * stays worth waiting for: its storage read answers in milliseconds.
 */
export const countUnresolvedChains = ({
  connections,
  statuses,
  chains,
  apis,
  accountIds,
  cache,
  graceExpired,
}: ResolutionSource): { enabledCount: number; unresolved: number } => {
  const enabled = Object.values(connections).filter(c => c.connectionType !== ConnectionType.DISABLED);
  let unresolved = 0;

  for (const connection of enabled) {
    const chainId = connection.chainId;
    const chain = chains[chainId];
    // Not a chain we know: nothing to wait for.
    if (!chain) continue;
    // Failed to connect — it will never report, and hanging on it would keep the
    // skeleton up forever.
    if (statuses[chainId] === ConnectionStatus.ERROR) continue;

    const api = apis[chainId];
    if (!api) {
      // Still connecting: worth waiting for, but not indefinitely.
      if (!graceExpired) unresolved++;
      continue;
    }

    const request = buildChainRequest(chain, api, accountIds);
    // Connected, and its runtime says vesting is impossible here.
    if (!request) continue;

    if (!cache[vestingSchedulesResource.createKey(request)]) unresolved++;
  }

  return { enabledCount: enabled.length, unresolved };
};
