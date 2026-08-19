import { type ApiPromise } from '@polkadot/api';
import { type Scope, allSettled, fork } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storageService } from '@/shared/api/storage';
import { type Address, type BackendContact, type ChainId, type ProxyAccount } from '@/shared/core';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { multisigOperationService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { backendConfigurationModel } from '@/aggregates/backend';

import { contactProxiesModel } from './contact-proxies-model';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

// The model creates its own `GraphQLClient` per fetch — intercept at the module boundary.
vi.mock('graphql-request', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  GraphQLClient: class {
    request = requestMock;
  },
}));

const CHAIN = `0x${'22'.repeat(32)}` as ChainId;

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;

const SEED = acc(1);
const P1 = acc(2);
const P2 = acc(3);
const P3 = acc(4);
const P4 = acc(5);
const P5 = acc(6);
const MULTISIG = acc(9);
const SIG_A = acc(11);
const SIG_B = acc(12);

const makeContact = (accountId: AccountId): BackendContact => ({
  id: accountId,
  name: `contact ${accountId.slice(0, 8)}`,
  address: accountId as unknown as Address,
  accountId,
  source: 'backend',
  chainId: null,
  chainName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  fields: [],
});

const plainContact = makeContact(SEED);
const multisigContact: BackendContact = { ...makeContact(MULTISIG), signatories: [SIG_A, SIG_B], threshold: 2 };

type Edge = { proxied: AccountId; proxy: AccountId; type?: string };

/**
 * One indexer response per BFS hop: return the outgoing edges of the queried
 * frontier.
 */
const respondWithGraph = (edges: Edge[]) => {
  requestMock.mockImplementation((_query: string, variables: { accountIds: AccountId[] }) => {
    const frontier = new Set(variables.accountIds);
    const nodes = edges
      .filter((edge) => frontier.has(edge.proxied))
      .map((edge) => ({
        accountId: edge.proxied,
        proxyAccountId: edge.proxy,
        chainId: CHAIN,
        type: edge.type ?? 'Any',
      }));

    return Promise.resolve({ proxieds: { nodes } });
  });
};

type Mirror = { proxied: AccountId; delegate: AccountId; delay?: number; type?: string };
type ProxiesResult = Awaited<ReturnType<typeof proxyPallet.storage.proxies>>;

/** On-chain `proxy.proxies` state used by the verification step. */
const mirrorOnChain = (mirrors: Mirror[]) => {
  vi.spyOn(proxyPallet.storage, 'proxies').mockImplementation((_api, accounts = []) => {
    const result = accounts.map((account) => ({
      account,
      value: {
        proxies: mirrors
          .filter((mirror) => mirror.proxied === account)
          .map((mirror) => ({ delegate: mirror.delegate, delay: mirror.delay ?? 0, proxyType: mirror.type ?? 'Any' })),
        deposit: 0n,
      },
    }));

    return Promise.resolve(result as unknown as ProxiesResult);
  });
};

const createScope = () =>
  fork({
    values: new Map()
      .set(networkModel.$apis, { [CHAIN]: {} as unknown as ApiPromise })
      // Give every scope its own `$proxies` object so tests stay isolated.
      .set(proxyModel.$proxies, {}),
  });

const receiveContacts = (scope: Scope, contacts: BackendContact[]) =>
  allSettled(contactModel.events.backendContactsReceived, { scope, params: contacts });

describe('contactProxiesModel', () => {
  let nextProxyId: number;

  beforeEach(() => {
    nextProxyId = 1;
    requestMock.mockReset();
    respondWithGraph([]);
    mirrorOnChain([]);

    vi.spyOn(multisigOperationService, 'getMultisigAccountId').mockReturnValue(MULTISIG);
    vi.spyOn(storageService.proxies, 'createAll').mockImplementation((proxies) =>
      Promise.resolve(proxies.map((proxy) => ({ ...proxy, id: nextProxyId++ }) as ProxyAccount)),
    );
    vi.spyOn(storageService.proxies, 'deleteAll').mockImplementation((ids) => Promise.resolve(ids));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('BFS over the proxieds graph', () => {
    it('discovers a multisig behind a multi-hop pure-proxy chain and verifies each hop on-chain', async () => {
      respondWithGraph([
        { proxied: SEED, proxy: P1 },
        { proxied: P1, proxy: MULTISIG },
      ]);
      mirrorOnChain([
        { proxied: SEED, delegate: P1 },
        { proxied: P1, delegate: MULTISIG },
      ]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      const map = scope.getState(contactProxiesModel.$contactProxyMap);
      expect(map[SEED]).toEqual([
        expect.objectContaining({
          accountId: MULTISIG,
          proxiedAccountId: SEED,
          chainId: CHAIN,
          proxyType: 'Any',
          delay: 0,
        }),
      ]);
    });

    it('sends the indexer a zero-delay filter on every hop', async () => {
      respondWithGraph([{ proxied: SEED, proxy: MULTISIG }]);
      mirrorOnChain([{ proxied: SEED, delegate: MULTISIG }]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      expect(requestMock).toHaveBeenCalled();
      expect(requestMock.mock.calls[0]?.[0]).toContain('delay: { equalTo: 0 }');
    });

    it('reaches a multisig exactly MAX_HOPS (5) hops deep', async () => {
      respondWithGraph([
        { proxied: SEED, proxy: P1 },
        { proxied: P1, proxy: P2 },
        { proxied: P2, proxy: P3 },
        { proxied: P3, proxy: P4 },
        { proxied: P4, proxy: MULTISIG },
      ]);
      mirrorOnChain([
        { proxied: SEED, delegate: P1 },
        { proxied: P1, delegate: P2 },
        { proxied: P2, delegate: P3 },
        { proxied: P3, delegate: P4 },
        { proxied: P4, delegate: MULTISIG },
      ]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      expect(requestMock).toHaveBeenCalledTimes(5);
      expect(scope.getState(contactProxiesModel.$contactProxyMap)[SEED]).toEqual([
        expect.objectContaining({ accountId: MULTISIG, proxiedAccountId: SEED }),
      ]);
    });

    it('stops at MAX_HOPS — a multisig 6 hops deep is never reached', async () => {
      respondWithGraph([
        { proxied: SEED, proxy: P1 },
        { proxied: P1, proxy: P2 },
        { proxied: P2, proxy: P3 },
        { proxied: P3, proxy: P4 },
        { proxied: P4, proxy: P5 },
        { proxied: P5, proxy: MULTISIG },
      ]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      expect(requestMock).toHaveBeenCalledTimes(5);
      expect(scope.getState(contactProxiesModel.$contactProxyMap)).toEqual({});
    });
  });

  describe('on-chain verification', () => {
    it('drops a link whose on-chain mirror has delay > 0', async () => {
      respondWithGraph([{ proxied: SEED, proxy: MULTISIG }]);
      mirrorOnChain([{ proxied: SEED, delegate: MULTISIG, delay: 5 }]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      expect(scope.getState(contactProxiesModel.$contactProxyMap)).toEqual({});
    });

    it('drops a link that has no on-chain mirror at all', async () => {
      respondWithGraph([{ proxied: SEED, proxy: MULTISIG }]);
      mirrorOnChain([]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      expect(scope.getState(contactProxiesModel.$contactProxyMap)).toEqual({});
    });
  });

  describe('multisig re-derivation gate', () => {
    it('skips the indexer entirely when no multisig contact re-derives to its stored accountId', async () => {
      vi.spyOn(multisigOperationService, 'getMultisigAccountId').mockReturnValue(acc(99));
      respondWithGraph([{ proxied: SEED, proxy: MULTISIG }]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);

      expect(requestMock).not.toHaveBeenCalled();
      expect(scope.getState(contactProxiesModel.$contactProxyMap)).toEqual({});
    });
  });

  describe('cache reset', () => {
    it('urlCleared drops the cached contact proxies', async () => {
      respondWithGraph([{ proxied: SEED, proxy: MULTISIG }]);
      mirrorOnChain([{ proxied: SEED, delegate: MULTISIG }]);
      // Keep the live `proxyModel.$proxies` layer empty (persisting fails) so the map
      // observes the localStorage-cached layer alone.
      vi.spyOn(storageService.proxies, 'createAll').mockResolvedValue(undefined);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);
      expect(scope.getState(contactProxiesModel.$contactProxyMap)[SEED]).toEqual([
        expect.objectContaining({ accountId: MULTISIG, proxiedAccountId: SEED }),
      ]);

      await allSettled(backendConfigurationModel.events.urlCleared, { scope });

      expect(scope.getState(contactProxiesModel.$contactProxyMap)).toEqual({});
    });

    it('urlCleared removes contact-sourced proxies from the live layer and storage', async () => {
      respondWithGraph([{ proxied: SEED, proxy: MULTISIG }]);
      mirrorOnChain([{ proxied: SEED, delegate: MULTISIG }]);

      const scope = createScope();
      await receiveContacts(scope, [plainContact, multisigContact]);
      expect(scope.getState(proxyModel.$proxies)[SEED]).toHaveLength(1);

      await allSettled(backendConfigurationModel.events.urlCleared, { scope });

      expect(storageService.proxies.deleteAll).toHaveBeenCalledWith([1]);
      expect(scope.getState(proxyModel.$proxies)).toEqual({});
      expect(scope.getState(contactProxiesModel.$contactProxyMap)).toEqual({});
    });
  });
});
