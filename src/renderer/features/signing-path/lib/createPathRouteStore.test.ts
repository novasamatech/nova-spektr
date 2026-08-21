import { createStore, fork } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type Chain, AccountType, CryptoType, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';

import { createPathResolutionStore, createPathRouteStore } from './createPathRouteStore';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const CHAIN_A: Chain = { chainId: '0xaaaa', options: [] } as unknown as Chain;
const CHAIN_B: Chain = { chainId: '0xbbbb', options: [] } as unknown as Chain;

const makeAccount = (accountId: AccountId): AnyAccount => {
  const draft = {
    id: `acct-${accountId}`,
    type: 'universal',
    walletId: 1,
    name: `wallet-${accountId}`,
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
  };
  return draft as unknown as AnyAccount;
};

const makeProxiedAccount = (accountId: AccountId): AnyAccount => {
  return {
    id: `acct-${accountId}`,
    type: 'chain',
    walletId: 1,
    name: `proxied-${accountId}`,
    accountId,
    accountType: AccountType.PROXIED,
    chainId: '0xaaaa',
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WATCH_ONLY,
    connections: [],
    createdAt: 0,
  } as unknown as AnyAccount;
};

const makeMultisigAccount = (accountId: AccountId): AnyAccount => {
  return {
    id: `acct-${accountId}`,
    type: 'universal',
    walletId: 1,
    name: `multisig-${accountId}`,
    accountId,
    accountType: AccountType.MULTISIG,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    signatories: [],
    threshold: 1,
    createdAt: 0,
  } as unknown as AnyAccount;
};

const makeFlexMultisigAccount = (facadeAccountId: AccountId, multisigAccountId: AccountId): AnyAccount => {
  return {
    id: `acct-flex-${facadeAccountId}`,
    type: 'chain',
    walletId: 1,
    name: `flex-${facadeAccountId}`,
    accountId: facadeAccountId,
    multisigAccountId,
    accountType: AccountType.FLEX_MULTISIG,
    chainId: '0xaaaa',
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    signatories: [],
    threshold: 2,
    proxyType: 'Any',
    deposit: '0',
    entropyBlockNumber: 0,
    extrinsicIndex: 0,
    createdAt: 0,
  } as unknown as AnyAccount;
};

const proxied = (accountId: AccountId, proxyType?: string): PathNode =>
  proxyType ? { kind: 'proxied', accountId, proxyType } : { kind: 'proxied', accountId };
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });

describe('createPathRouteStore', () => {
  beforeEach(() => {
    // The chain-availability pipeline starts empty in tests, so check()
    // returns false. Register an accept-all handler so accounts can resolve.
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: () => true,
      available: () => true,
    });
  });

  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  it('returns null for a trivial path (length < 2)', () => {
    const $path = createStore<PathNode[]>([signer(acc(1))]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(acc(1))]]]),
    });

    expect(scope.getState($route)).toBeNull();
  });

  it('returns null when chain is null', () => {
    const $path = createStore<PathNode[]>([proxied(acc(1)), signer(acc(2))]);
    const $chain = createStore<Chain | null>(null);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeProxiedAccount(acc(1)), makeAccount(acc(2))]]]),
    });

    expect(scope.getState($route)).toBeNull();
  });

  it('resolves every node to an AnyAccount in path order', () => {
    const path: PathNode[] = [proxied(acc(1)), multisig(acc(2)), signer(acc(3))];
    const $path = createStore<PathNode[]>(path);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const a1 = makeProxiedAccount(acc(1));
    const a2 = makeMultisigAccount(acc(2));
    const a3 = makeAccount(acc(3));

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [a3, a1, a2]]]),
    });

    expect(scope.getState($route)).toEqual([a1, a2, a3]);
  });

  it('scopes a proxied route to the selected proxy type', () => {
    const proxiedId = acc(1);
    const proxyId = acc(2);
    const signerId = acc(3);
    const path: PathNode[] = [
      { kind: 'proxied', accountId: proxiedId, proxyType: 'Governance' },
      multisig(proxyId),
      signer(signerId),
    ];
    const $path = createStore<PathNode[]>(path);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const proxiedAccount = {
      ...makeProxiedAccount(proxiedId),
      connections: [
        { proxyAccountId: proxyId, proxyType: 'Any', delay: 0 },
        { proxyAccountId: proxyId, proxyType: 'Governance', delay: 0 },
      ],
    } as unknown as AnyAccount;
    const proxyAccount = makeMultisigAccount(proxyId);
    const signerAccount = makeAccount(signerId);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [proxiedAccount, proxyAccount, signerAccount]]]),
    });

    const route = scope.getState($route);

    expect(route?.[0]).toMatchObject({
      accountId: proxiedId,
      connections: [{ proxyAccountId: proxyId, proxyType: 'Governance', delay: 0 }],
    });
  });

  it('prefers a Proxied account over a generic same-accountId entry for a proxied node', () => {
    // Two wallet entries share an accountId — e.g. browser-extension wallet
    // plus a synced Proxied wallet. The plain-accountId lookup would have
    // returned whichever came first in `accounts.$list`; the kind-aware lookup
    // must pick the ProxiedAccount so the proxy.proxy wrap layer actually
    // fires.
    const path: PathNode[] = [proxied(acc(1)), multisig(acc(2)), signer(acc(3))];
    const $path = createStore<PathNode[]>(path);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const extensionAt1 = makeAccount(acc(1)); // wrong type but same accountId
    const proxiedAt1 = makeProxiedAccount(acc(1));
    const multisigAt2 = makeMultisigAccount(acc(2));
    const signerAt3 = makeAccount(acc(3));

    const scope = fork({
      // Extension entry intentionally listed FIRST — the old `.find` returned it.
      values: new Map<any, any>([[accounts.__test.$list, [extensionAt1, proxiedAt1, multisigAt2, signerAt3]]]),
    });

    expect(scope.getState($route)).toEqual([proxiedAt1, multisigAt2, signerAt3]);
  });

  it('synthesizes a Proxied account when a proxied node only has a same-accountId generic entry', () => {
    // A draft can target a proxied source that is also present as a plain
    // wallet account. The saved path kind + proxyType is enough to preserve
    // the proxy.proxy layer instead of rendering/routing through the plain
    // account.
    const path: PathNode[] = [proxied(acc(1), 'Governance'), multisig(acc(2)), signer(acc(3))];
    const $path = createStore<PathNode[]>(path);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, [makeAccount(acc(1)), makeMultisigAccount(acc(2)), makeAccount(acc(3))]],
      ]),
    });

    const route = scope.getState($route);

    expect(route?.map((account) => account.accountId)).toEqual([acc(1), acc(2), acc(3)]);
    expect(route?.[0]).toMatchObject({
      accountType: AccountType.PROXIED,
      connections: [{ proxyAccountId: acc(2), proxyType: 'Governance', delay: 0 }],
    });
  });

  it('does not synthesize a proxy connection for an unknown proxy type', () => {
    const path: PathNode[] = [proxied(acc(1), 'InvalidProxyType'), multisig(acc(2)), signer(acc(3))];
    const $path = createStore<PathNode[]>(path);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, [makeAccount(acc(1)), makeMultisigAccount(acc(2)), makeAccount(acc(3))]],
      ]),
    });

    const route = scope.getState($route);

    expect(route?.[0]).toMatchObject({
      accountType: AccountType.PROXIED,
      connections: [],
    });
  });

  it('returns null when a proxied node cannot be resolved and has no proxyType to synthesize from', () => {
    const path: PathNode[] = [proxied(acc(1)), multisig(acc(2)), signer(acc(3))];
    const $path = createStore<PathNode[]>(path);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, [makeAccount(acc(1)), makeMultisigAccount(acc(2)), makeAccount(acc(3))]],
      ]),
    });

    expect(scope.getState($route)).toBeNull();
  });

  it('returns null when any node is missing from the account list', () => {
    const $path = createStore<PathNode[]>([proxied(acc(1)), signer(acc(2))]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      // acc(2) intentionally absent
      values: new Map<any, any>([[accounts.__test.$list, [makeProxiedAccount(acc(1))]]]),
    });

    expect(scope.getState($route)).toBeNull();
  });

  it('returns null when an account is not available on the chain', () => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      // Accept only matching chainId — flips the check to chain-scoped.
      body: ({ chain }) => chain.chainId === CHAIN_A.chainId,
      available: () => true,
    });

    const $path = createStore<PathNode[]>([proxied(acc(1)), signer(acc(2))]);
    const $chain = createStore<Chain | null>(CHAIN_B);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeProxiedAccount(acc(1)), makeAccount(acc(2))]]]),
    });

    expect(scope.getState($route)).toBeNull();
  });

  it('collapses proxied+multisig hops onto a single flex-multisig account', () => {
    const facadeId = acc(1);
    const innerMultisigId = acc(2);
    const signerId = acc(3);

    const flexMultisig = {
      id: 'acct-flex',
      type: 'chain',
      walletId: 1,
      name: 'flex',
      accountId: facadeId,
      multisigAccountId: innerMultisigId,
      accountType: AccountType.FLEX_MULTISIG,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      createdAt: 0,
    } as unknown as AnyAccount;
    const signerAccount = makeAccount(signerId);

    const $path = createStore<PathNode[]>([proxied(facadeId), multisig(innerMultisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [flexMultisig, signerAccount]]]),
    });

    expect(scope.getState($route)).toEqual([flexMultisig, signerAccount]);
  });

  it('never resolves a bare multisig source onto a flex facade sharing the inner accountId', () => {
    const facadeId = acc(1);
    const innerMultisigId = acc(2);
    const signerId = acc(3);

    const flexMultisig = makeFlexMultisigAccount(facadeId, innerMultisigId);
    const innerMultisig = makeMultisigAccount(innerMultisigId);
    const signerAccount = makeAccount(signerId);

    const $path = createStore<PathNode[]>([multisig(innerMultisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    // Flex account first in the list: without the position check `find` would
    // return it and the extrinsic would become asMulti(proxy.proxy(real =
    // facade)) — executing from a pure proxy the draft never named.
    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [flexMultisig, innerMultisig, signerAccount]]]),
    });

    expect(scope.getState($route)).toEqual([innerMultisig, signerAccount]);
  });

  it('returns null when a bare multisig source only exists as a flex inner multisig', () => {
    const facadeId = acc(1);
    const innerMultisigId = acc(2);
    const signerId = acc(3);

    const $path = createStore<PathNode[]>([multisig(innerMultisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, [makeFlexMultisigAccount(facadeId, innerMultisigId), makeAccount(signerId)]],
      ]),
    });

    // Unresolvable rather than silently re-routed through the proxy facade —
    // the submit flow blocks with a signing-path-unresolved error.
    expect(scope.getState($route)).toBeNull();
  });

  it('collapses the flex pair even when the inner multisig also exists as its own account', () => {
    const facadeId = acc(1);
    const innerMultisigId = acc(2);
    const signerId = acc(3);

    const flexMultisig = makeFlexMultisigAccount(facadeId, innerMultisigId);
    const innerMultisig = makeMultisigAccount(innerMultisigId);
    const signerAccount = makeAccount(signerId);

    const $path = createStore<PathNode[]>([proxied(facadeId, 'Any'), multisig(innerMultisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    // Stand-alone inner multisig first in the list: taking it for the second
    // hop would stack a second asMulti on top of the flex wrapper.
    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [innerMultisig, flexMultisig, signerAccount]]]),
    });

    expect(scope.getState($route)).toEqual([flexMultisig, signerAccount]);
  });

  it('skips an ethereum-account candidate on a substrate chain (crypto mismatch)', () => {
    const ethAccountId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as unknown as AccountId;
    const $path = createStore<PathNode[]>([proxied(ethAccountId), signer(acc(1))]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $route = createPathRouteStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(ethAccountId), makeAccount(acc(1))]]]),
    });

    // Ethereum-shaped accountId on a non-ethereum chain → isCryptoMatch fails
    // → first node unresolvable → whole route returns null.
    expect(scope.getState($route)).toBeNull();
  });
});

describe('createPathResolutionStore', () => {
  beforeEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: () => true,
      available: () => true,
    });
  });

  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  it('reports the first node with no local account', () => {
    const multisigId = acc(1);
    const signerId = acc(2);

    const $path = createStore<PathNode[]>([multisig(multisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $resolution = createPathResolutionStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeMultisigAccount(multisigId)]]]),
    });

    expect(scope.getState($resolution)).toEqual({ route: null, missingNode: signer(signerId) });
  });

  it('reports the source node when it is the missing one', () => {
    const multisigId = acc(1);
    const signerId = acc(2);

    const $path = createStore<PathNode[]>([multisig(multisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $resolution = createPathResolutionStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(signerId)]]]),
    });

    expect(scope.getState($resolution)).toEqual({ route: null, missingNode: multisig(multisigId) });
  });

  it('reports no missing node for a fully resolved path', () => {
    const multisigId = acc(1);
    const signerId = acc(2);

    const multisigAccount = makeMultisigAccount(multisigId);
    const signerAccount = makeAccount(signerId);

    const $path = createStore<PathNode[]>([multisig(multisigId), signer(signerId)]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $resolution = createPathResolutionStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [multisigAccount, signerAccount]]]),
    });

    expect(scope.getState($resolution)).toEqual({ route: [multisigAccount, signerAccount], missingNode: null });
  });

  it('reports no missing node for a trivial path — nothing to add, nothing to blame', () => {
    const $path = createStore<PathNode[]>([signer(acc(1))]);
    const $chain = createStore<Chain | null>(CHAIN_A);
    const $resolution = createPathResolutionStore($path, $chain);

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(acc(1))]]]),
    });

    expect(scope.getState($resolution)).toEqual({ route: null, missingNode: null });
  });
});
