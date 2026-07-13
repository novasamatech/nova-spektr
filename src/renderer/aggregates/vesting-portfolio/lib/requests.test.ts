import { type ApiPromise } from '@polkadot/api';
import { describe, expect, it } from 'vitest';

import { type Chain, type ChainId, type Connection, ConnectionStatus, ConnectionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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

const source = (over: {
  connections?: Record<string, Connection>;
  statuses?: Record<string, ConnectionStatus>;
  chains?: Record<string, Chain>;
  apis?: Record<string, ApiPromise>;
  accountIds?: AccountId[];
  cache?: Record<ResourceRequestKey, ChainVestingEntry>;
  graceExpired?: boolean;
}) => ({
  connections: (over.connections ?? {}) as Record<ChainId, Connection>,
  statuses: (over.statuses ?? {}) as Record<ChainId, ConnectionStatus>,
  chains: (over.chains ?? {}) as Record<ChainId, Chain>,
  apis: (over.apis ?? {}) as Record<ChainId, ApiPromise>,
  accountIds: over.accountIds ?? [ACCOUNT],
  cache: over.cache ?? {},
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

    expect(result).toEqual({ enabledCount: 1, unresolved: 1 });
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

    expect(result).toEqual({ enabledCount: 0, unresolved: 0 });
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

  it('keeps waiting on a connected chain even after the grace period — its answer is milliseconds away', () => {
    const api = vestingApi();
    const polkadot = chain(POLKADOT);

    const result = countUnresolvedChains(
      source({
        connections: { [POLKADOT]: connection(POLKADOT) },
        statuses: { [POLKADOT]: ConnectionStatus.CONNECTED },
        chains: { [POLKADOT]: polkadot },
        apis: { [POLKADOT]: api },
        graceExpired: true,
      }),
    );

    expect(result.unresolved).toBe(1);
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
