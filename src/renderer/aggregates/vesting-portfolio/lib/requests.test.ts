import { type ApiPromise } from '@polkadot/api';
import { describe, expect, it } from 'vitest';

import { type Chain, type ChainId, type Connection, ConnectionStatus, ConnectionType } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { type ChainVestingEntry, vestingSchedulesResource } from '@/domains/vesting';

import { buildRequests, countUnresolvedChains } from './requests';

const ACCOUNT = '0x00'.padEnd(66, '1') as AccountId;

const chain = (chainId: string): Chain => ({ chainId, name: chainId, assets: [], options: [] }) as unknown as Chain;

const vestingApi = () =>
  ({ tx: { vesting: { vest: () => ({}) } }, query: { vesting: { vesting: () => ({}) } } }) as unknown as ApiPromise;

const plainApi = () => ({ tx: {}, query: {} }) as unknown as ApiPromise;

const connection = (chainId: string, connectionType = ConnectionType.AUTO_BALANCE): Connection =>
  ({ chainId, connectionType }) as unknown as Connection;

const POLKADOT = '0xpolkadot';
const KUSAMA = '0xkusama';
const ASSET_HUB = '0xassethub';
const RELAY = '0xrelay';

const source = (over: {
  connections?: Record<string, Connection>;
  statuses?: Record<string, ConnectionStatus>;
  chains?: Record<string, Chain>;
  apis?: Record<string, ApiPromise>;
  accountIds?: AccountId[];
  cache?: Record<ResourceRequestKey, ChainVestingEntry>;
  blockHeights?: Record<string, BlockHeight>;
  graceExpired?: boolean;
}) => ({
  connections: (over.connections ?? {}) as Record<ChainId, Connection>,
  statuses: (over.statuses ?? {}) as Record<ChainId, ConnectionStatus>,
  chains: (over.chains ?? {}) as Record<ChainId, Chain>,
  apis: (over.apis ?? {}) as Record<ChainId, ApiPromise>,
  accountIds: over.accountIds ?? [ACCOUNT],
  cache: over.cache ?? {},
  blockHeights: (over.blockHeights ?? {}) as Record<ChainId, BlockHeight>,
  graceExpired: over.graceExpired ?? false,
});

describe('buildRequests', () => {
  it('keeps only chains whose runtime exposes the vesting pallet', () => {
    const requests = buildRequests(
      { [POLKADOT]: chain(POLKADOT), [KUSAMA]: chain(KUSAMA) } as Record<ChainId, Chain>,
      { [POLKADOT]: vestingApi(), [KUSAMA]: plainApi() } as Record<ChainId, ApiPromise>,
      [ACCOUNT],
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]?.chain.chainId).toBe(POLKADOT);
  });

  it('skips chains with no api yet — a chain still connecting cannot be looked up', () => {
    const requests = buildRequests({ [POLKADOT]: chain(POLKADOT) } as Record<ChainId, Chain>, {}, [ACCOUNT]);

    expect(requests).toEqual([]);
  });
});

describe('countUnresolvedChains', () => {
  it('counts a chain that has not connected yet as unresolved — this is the false-empty guard', () => {
    // Polkadot is enabled and still connecting: no api, so we cannot yet know
    // whether it holds vesting. Calling the wallet "not vesting" here would be
    // the bug this whole readiness rule exists to prevent.
    const result = countUnresolvedChains(
      source({
        connections: { [POLKADOT]: connection(POLKADOT) },
        statuses: { [POLKADOT]: ConnectionStatus.CONNECTING },
        chains: { [POLKADOT]: chain(POLKADOT) },
        apis: {},
      }),
    );

    expect(result).toEqual({ chainsLoaded: true, unresolved: 1 });
  });

  it('resolves a connected chain whose runtime has no vesting pallet', () => {
    const result = countUnresolvedChains(
      source({
        connections: { [KUSAMA]: connection(KUSAMA) },
        statuses: { [KUSAMA]: ConnectionStatus.CONNECTED },
        chains: { [KUSAMA]: chain(KUSAMA) },
        apis: { [KUSAMA]: plainApi() },
      }),
    );

    expect(result.unresolved).toBe(0);
  });

  it('resolves an errored chain — it will never report, and waiting would hang the skeleton', () => {
    const result = countUnresolvedChains(
      source({
        connections: { [POLKADOT]: connection(POLKADOT) },
        statuses: { [POLKADOT]: ConnectionStatus.ERROR },
        chains: { [POLKADOT]: chain(POLKADOT) },
        apis: {},
      }),
    );

    expect(result.unresolved).toBe(0);
  });

  it('ignores disabled chains', () => {
    const result = countUnresolvedChains(
      source({
        connections: { [POLKADOT]: connection(POLKADOT, ConnectionType.DISABLED) },
        statuses: { [POLKADOT]: ConnectionStatus.DISCONNECTED },
        chains: { [POLKADOT]: chain(POLKADOT) },
        apis: {},
      }),
    );

    // Disabling every chain is a loaded config with nothing left to ask, not an
    // unloaded one — the empty answer it yields is a real one.
    expect(result).toEqual({ chainsLoaded: true, unresolved: 0 });
  });

  it('reports the network config as unloaded when there are no connections at all', () => {
    expect(countUnresolvedChains(source({}))).toEqual({ chainsLoaded: false, unresolved: 0 });
  });

  it('holds a vesting-capable chain unresolved until its schedules land', () => {
    const api = vestingApi();
    const polkadot = chain(POLKADOT);
    const connections = { [POLKADOT]: connection(POLKADOT) };
    const statuses = { [POLKADOT]: ConnectionStatus.CONNECTED };
    const chains = { [POLKADOT]: polkadot };
    const apis = { [POLKADOT]: api };

    expect(countUnresolvedChains(source({ connections, statuses, chains, apis })).unresolved).toBe(1);

    const key = vestingSchedulesResource.createKey({ api, chain: polkadot, accountIds: [ACCOUNT] });
    const cache = { [key]: { schedules: {}, locks: {} } };

    // Reported "nothing here" — an answer, and a resolving one.
    expect(countUnresolvedChains(source({ connections, statuses, chains, apis, cache })).unresolved).toBe(0);
  });

  it('gives up on a chain that never connects, once the grace period has passed', () => {
    // A dead RPC keeps retrying and never reaches a terminal state. Waiting on it
    // forever is what left the loader spinning for the life of the app.
    const stuck = {
      connections: { [POLKADOT]: connection(POLKADOT) },
      statuses: { [POLKADOT]: ConnectionStatus.CONNECTING },
      chains: { [POLKADOT]: chain(POLKADOT) },
      apis: {},
    };

    expect(countUnresolvedChains(source({ ...stuck, graceExpired: false })).unresolved).toBe(1);
    expect(countUnresolvedChains(source({ ...stuck, graceExpired: true })).unresolved).toBe(0);
  });

  it('gives up on a connected chain that has gone silent, once the grace period has passed', () => {
    // A connected chain normally answers in milliseconds, so it is waited for.
    // But a degraded RPC can hold the socket open and never deliver the storage
    // subscription, and that wedges the skeleton for the life of the app just as
    // a dead RPC would. The deadline is the only thing standing between that and
    // a permanent loader.
    const api = vestingApi();
    const polkadot = chain(POLKADOT);
    const silent = {
      connections: { [POLKADOT]: connection(POLKADOT) },
      statuses: { [POLKADOT]: ConnectionStatus.CONNECTED },
      chains: { [POLKADOT]: polkadot },
      apis: { [POLKADOT]: api },
    };

    expect(countUnresolvedChains(source({ ...silent, graceExpired: false })).unresolved).toBe(1);
    expect(countUnresolvedChains(source({ ...silent, graceExpired: true })).unresolved).toBe(0);
  });

  it('holds a chain whose schedules arrived but whose timeline head has not', () => {
    // The schedules of a migrated Asset Hub are counted in *relay* blocks. Until
    // the relay's height is known, `computeVesting` can build no row for them —
    // so the chain has not really answered, and calling it resolved is what let
    // the callout announce a count the schedule modal had nothing to show for.
    const api = vestingApi();
    const assetHub = { ...chain(ASSET_HUB), additional: { timelineChain: RELAY } } as unknown as Chain;
    const key = vestingSchedulesResource.createKey({ api, chain: assetHub, accountIds: [ACCOUNT] });

    const withSchedules = {
      connections: { [ASSET_HUB]: connection(ASSET_HUB) },
      statuses: { [ASSET_HUB]: ConnectionStatus.CONNECTED },
      chains: { [ASSET_HUB]: assetHub },
      apis: { [ASSET_HUB]: api },
      cache: { [key]: { schedules: { [ACCOUNT]: [] }, locks: {} } },
    };

    expect(countUnresolvedChains(source(withSchedules)).unresolved).toBe(1);

    // The relay's head lands — now every figure the rows print can be computed.
    expect(
      countUnresolvedChains(source({ ...withSchedules, blockHeights: { [RELAY]: 100 as BlockHeight } })).unresolved,
    ).toBe(0);

    // And the deadline still bounds the wait, as it does everywhere else here.
    expect(countUnresolvedChains(source({ ...withSchedules, graceExpired: true })).unresolved).toBe(0);
  });

  it('does not wait on a head for a chain that reported no schedules', () => {
    // Nothing to date against a block: the chain has given its answer.
    const api = vestingApi();
    const polkadot = chain(POLKADOT);
    const key = vestingSchedulesResource.createKey({ api, chain: polkadot, accountIds: [ACCOUNT] });

    const result = countUnresolvedChains(
      source({
        connections: { [POLKADOT]: connection(POLKADOT) },
        statuses: { [POLKADOT]: ConnectionStatus.CONNECTED },
        chains: { [POLKADOT]: polkadot },
        apis: { [POLKADOT]: api },
        cache: { [key]: { schedules: {}, locks: {} } },
      }),
    );

    expect(result.unresolved).toBe(0);
  });

  it('goes unresolved again for an account set the cache has not been asked about', () => {
    const api = vestingApi();
    const polkadot = chain(POLKADOT);
    const key = vestingSchedulesResource.createKey({ api, chain: polkadot, accountIds: [ACCOUNT] });
    const other = '0x00'.padEnd(66, '2') as AccountId;

    const result = countUnresolvedChains(
      source({
        connections: { [POLKADOT]: connection(POLKADOT) },
        statuses: { [POLKADOT]: ConnectionStatus.CONNECTED },
        chains: { [POLKADOT]: polkadot },
        apis: { [POLKADOT]: api },
        accountIds: [other],
        cache: { [key]: { schedules: {}, locks: {} } },
      }),
    );

    expect(result.unresolved).toBe(1);
  });
});
