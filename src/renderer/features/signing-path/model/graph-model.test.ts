import { fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type ChainId, CryptoType, SigningType } from '@/shared/core';
import { type BackendContact } from '@/shared/core/types/contact';
import { type Address } from '@/shared/core/types/general';
import { type ProxyAccount } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { proxyModel } from '@/entities/proxy';

import { graphModel } from './graph-model';

const CHAIN = '0x1234' as ChainId;
const OTHER_CHAIN = '0x5678' as ChainId;

// acc(n) produces a stable 48-char AccountId
const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

let idCounter = 0;
const nextId = () => ++idCounter;

function makeContact(
  accountId: AccountId,
  name: string,
  opts: {
    chainId?: string | null;
    signatories?: string[] | null;
    threshold?: number | null;
  } = {},
): BackendContact {
  return {
    id: String(nextId()),
    source: 'backend',
    name,
    address: accountId as unknown as Address,
    accountId,
    entityNames: [],
    chainId: opts.chainId ?? null,
    chainName: null,
    categoryName: null,
    contactTypeName: null,
    derivationPath: null,
    ownerAccountId: null,
    signatories: opts.signatories ?? null,
    threshold: opts.threshold ?? null,
    tags: [],
  };
}

function makeProxy(accountId: AccountId, proxiedAccountId: AccountId, chainId: ChainId = CHAIN): ProxyAccount {
  return {
    id: nextId(),
    accountId,
    proxiedAccountId,
    chainId,
    proxyType: 'Any',
    delay: 0,
  };
}

function makeOwnAccount(accountId: AccountId, signingType: SigningType = SigningType.POLKADOT_VAULT): AnyAccount {
  return {
    id: `acct-${accountId}`,
    type: 'universal',
    walletId: 1,
    name: `wallet-${accountId}`,
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType,
    createdAt: 0,
  };
}

// Seed helper: contacts go into $contacts (writable), proxies dict is keyed by proxiedAccountId,
// and own accounts go into accounts.__test.$list so the restrictToOwn graph mode has a leaf set.
function makeValues(
  contacts: BackendContact[],
  proxiesList: ProxyAccount[] = [],
  ownAccounts: AnyAccount[] = [],
): Map<any, any> {
  const proxiesDict: Record<AccountId, ProxyAccount[]> = {};
  for (const p of proxiesList) {
    const existing = proxiesDict[p.proxiedAccountId];
    if (existing) {
      existing.push(p);
    } else {
      proxiesDict[p.proxiedAccountId] = [p];
    }
  }

  return new Map<any, any>([
    [contactModel.$contacts, contacts],
    [proxyModel.$proxies, proxiesDict],
    [accounts.__test.$list, ownAccounts],
  ]);
}

describe('graph-model', () => {
  // Test 1: $sourcesFor includes direct multisigs on the active chain
  it('$sourcesFor includes direct multisigs', () => {
    const contact = makeContact(acc(1), 'MultiA', {
      signatories: [acc(2), acc(3)],
      threshold: 2,
    });

    const scope = fork({ values: makeValues([contact]) });

    const sources = scope.getState(graphModel.$sourcesFor(CHAIN));
    expect(sources.map((s) => s.accountId)).toContain(acc(1));
  });

  // Test 2: $sourcesFor filters out multisigs with empty signatories or zero threshold
  it('$sourcesFor filters out contacts with empty signatories', () => {
    const emptySignatories = makeContact(acc(1), 'BadMulti', {
      signatories: [],
      threshold: 2,
    });
    const nullSignatories = makeContact(acc(2), 'NullMulti', {
      signatories: null,
      threshold: null,
    });

    const scope = fork({ values: makeValues([emptySignatories, nullSignatories]) });

    const sources = scope.getState(graphModel.$sourcesFor(CHAIN));
    expect(sources).toHaveLength(0);
  });

  // Test 3: $sourcesFor includes proxied accounts when a signer multisig exists on the chain
  it('$sourcesFor includes proxied accounts with signer multisig on chain', () => {
    // A1 = non-multisig proxied account
    const A1 = acc(1);
    // A2 = multisig that signs on behalf of A1
    const A2 = acc(2);
    const A3 = acc(3);

    const contactA1 = makeContact(A1, 'ProxiedContact', { signatories: null, threshold: null });
    const contactA2 = makeContact(A2, 'SignerMultisig', {
      signatories: [A3],
      threshold: 1,
    });

    const scope = fork({ values: makeValues([contactA1, contactA2], [makeProxy(A2, A1, CHAIN)]) });

    const sources = scope.getState(graphModel.$sourcesFor(CHAIN));
    const accountIds = sources.map((s) => s.accountId);

    expect(accountIds).toContain(A1);
    expect(accountIds).toContain(A2);

    const a1Source = sources.find((s) => s.accountId === A1);
    expect(a1Source?.isProxy).toBe(true);

    const a2Source = sources.find((s) => s.accountId === A2);
    expect(a2Source?.isProxy).toBe(false);
  });

  // Regression: a proxy whose signer has no contact entry should not crash
  // buildSources. Previously a `null as never` cast smuggled null into
  // isMultisigContact and crashed on `null.signatories` whenever any proxy
  // signer was unknown to the contact list (common when graphModel is read
  // before contacts hydrate, or for proxies signed by accounts the user
  // hasn't catalogued).
  it('$sourcesFor tolerates proxy signers with no contact entry', () => {
    const A1 = acc(1);
    const A2 = acc(2); // signer of A1's proxy — but no contact for A2

    const contactA1 = makeContact(A1, 'ProxiedContact', { signatories: null, threshold: null });

    const scope = fork({ values: makeValues([contactA1], [makeProxy(A2, A1, CHAIN)]) });

    expect(() => scope.getState(graphModel.$sourcesFor(CHAIN))).not.toThrow();
    const sources = scope.getState(graphModel.$sourcesFor(CHAIN));
    expect(sources.map((s) => s.accountId)).not.toContain(A1);
  });

  // Test 4: $nextOptionsForNode for proxied → returns signer multisigs on chain
  it('$nextOptionsForNode(proxied) returns signer multisigs on chain', () => {
    const A1 = acc(1);
    const A2 = acc(2);
    const A3 = acc(3);

    const contactA1 = makeContact(A1, 'ProxiedContact', { signatories: null, threshold: null });
    const contactA2 = makeContact(A2, 'SignerMultisig', {
      signatories: [A3],
      threshold: 1,
    });

    const scope = fork({ values: makeValues([contactA1, contactA2], [makeProxy(A2, A1, CHAIN)]) });

    const options = scope.getState(graphModel.$nextOptionsForNode({ kind: 'proxied', accountId: A1 }, CHAIN));
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ kind: 'multisig', accountId: A2 });
  });

  // Test 5: $nextOptionsForNode for multisig → classifies signatories correctly
  it('$nextOptionsForNode(multisig) classifies signatories as nested-multisig or signer', () => {
    const A1 = acc(1); // top-level multisig
    const A2 = acc(2); // nested multisig signatory
    const A3 = acc(3); // EOA signatory
    const A4 = acc(4); // signatory of nested A2

    const contactA1 = makeContact(A1, 'TopMultisig', {
      signatories: [A2, A3],
      threshold: 2,
    });
    const contactA2 = makeContact(A2, 'NestedMultisig', {
      signatories: [A4],
      threshold: 1,
    });
    // A3 has no contact entry (pure EOA) — should still appear as 'signer'

    const scope = fork({ values: makeValues([contactA1, contactA2]) });

    const options = scope.getState(graphModel.$nextOptionsForNode({ kind: 'multisig', accountId: A1 }, CHAIN));
    expect(options).toHaveLength(2);

    const optA2 = options.find((o) => o.accountId === A2);
    const optA3 = options.find((o) => o.accountId === A3);

    expect(optA2?.kind).toBe('multisig');
    expect(optA3?.kind).toBe('signer');
  });

  // Test 6: $nextOptionsForNode for signer → empty
  it('$nextOptionsForNode(signer) returns empty array', () => {
    const scope = fork({ values: makeValues([]) });

    const options = scope.getState(graphModel.$nextOptionsForNode({ kind: 'signer', accountId: acc(1) }, CHAIN));
    expect(options).toEqual([]);
  });

  // Test 4b: proxied signer multisig on OTHER_CHAIN is filtered out
  it('$nextOptionsForNode(proxied) filters out proxy entries on wrong chain', () => {
    const A1 = acc(1);
    const A2 = acc(2);
    const A3 = acc(3);

    const contactA1 = makeContact(A1, 'ProxiedContact', { signatories: null, threshold: null });
    const contactA2 = makeContact(A2, 'SignerMultisig', {
      signatories: [A3],
      threshold: 1,
    });

    // proxy is on OTHER_CHAIN, not CHAIN
    const scope = fork({ values: makeValues([contactA1, contactA2], [makeProxy(A2, A1, OTHER_CHAIN)]) });

    const options = scope.getState(graphModel.$nextOptionsForNode({ kind: 'proxied', accountId: A1 }, CHAIN));
    expect(options).toHaveLength(0);
  });

  // $nameResolver wires up accountService.resolveAccountName so that names
  // come from the canonical priority chain (own custom name → local contact
  // → backend contact → identity → short address). Backend contacts cover
  // the multisig case here.
  it('$nameResolver resolves names through the canonical chain', () => {
    const contactA = makeContact(acc(1), 'Alice', {});
    const contactB = makeContact(acc(2), 'Bob', { signatories: [acc(3)], threshold: 1 });

    const scope = fork({ values: makeValues([contactA, contactB]) });

    const resolveName = scope.getState(graphModel.$nameResolver);
    expect(resolveName(acc(1), CHAIN)).toBe('Alice');
    expect(resolveName(acc(2), CHAIN)).toBe('Bob');
  });

  // $empty is a stable empty array store
  it('$empty returns stable empty array', () => {
    const scope = fork();
    const empty = scope.getState(graphModel.$empty);
    expect(empty).toEqual([]);
  });

  // ── restrictToOwn ────────────────────────────────────────────────────────
  describe('restrictToOwn', () => {
    // For a multisig hop, only signatories that are user-owned signing
    // accounts should appear when restrictToOwn is on. The "external"
    // signatory (no entry in accounts list) is hidden.
    it('$nextOptionsForNode(multisig) hides signatories that are not own', () => {
      const A1 = acc(1); // multisig
      const A2 = acc(2); // own signatory
      const A3 = acc(3); // external signatory

      const contactA1 = makeContact(A1, 'Multi', { signatories: [A2, A3], threshold: 2 });

      const scope = fork({ values: makeValues([contactA1], [], [makeOwnAccount(A2)]) });

      const allOptions = scope.getState(graphModel.$nextOptionsForNode({ kind: 'multisig', accountId: A1 }, CHAIN));
      expect(allOptions.map((o) => o.accountId).sort()).toEqual([A2, A3].sort());

      const ownOptions = scope.getState(
        graphModel.$nextOptionsForNode({ kind: 'multisig', accountId: A1 }, CHAIN, { restrictToOwn: true }),
      );
      expect(ownOptions.map((o) => o.accountId)).toEqual([A2]);
    });

    // Watch-only accounts can't sign. They must NOT count as own signers even
    // if the user has them in their account list.
    it('$nextOptionsForNode(multisig) does not count watch-only accounts as own', () => {
      const A1 = acc(1);
      const A2 = acc(2);

      const contactA1 = makeContact(A1, 'Multi', { signatories: [A2], threshold: 1 });

      const scope = fork({
        values: makeValues([contactA1], [], [makeOwnAccount(A2, SigningType.WATCH_ONLY)]),
      });

      const ownOptions = scope.getState(
        graphModel.$nextOptionsForNode({ kind: 'multisig', accountId: A1 }, CHAIN, { restrictToOwn: true }),
      );
      expect(ownOptions).toHaveLength(0);
    });

    // A nested multisig that itself contains an own signer in its subtree
    // should remain visible — the user can drill into it to reach a leaf
    // they can sign with.
    it('$nextOptionsForNode(multisig) keeps nested multisigs whose subtree has an own signer', () => {
      const A1 = acc(1); // top multisig
      const A2 = acc(2); // nested multisig
      const A3 = acc(3); // own signer of nested
      const A4 = acc(4); // external direct signer of top

      const contactA1 = makeContact(A1, 'Top', { signatories: [A2, A4], threshold: 2 });
      const contactA2 = makeContact(A2, 'Nested', { signatories: [A3], threshold: 1 });

      const scope = fork({
        values: makeValues([contactA1, contactA2], [], [makeOwnAccount(A3)]),
      });

      const ownOptions = scope.getState(
        graphModel.$nextOptionsForNode({ kind: 'multisig', accountId: A1 }, CHAIN, { restrictToOwn: true }),
      );
      // Nested A2 stays (subtree has A3), external A4 is hidden.
      expect(ownOptions.map((o) => o.accountId)).toEqual([A2]);
      expect(ownOptions[0]?.kind).toBe('multisig');
    });

    // Sources that don't lead to any own signer are dropped entirely.
    it('$sourcesFor hides direct multisigs whose subtree has no own signer', () => {
      const A1 = acc(1); // own multisig
      const A2 = acc(2); // own signer of A1
      const A3 = acc(3); // external multisig
      const A4 = acc(4); // external signer of A3

      const ownMulti = makeContact(A1, 'OwnMulti', { signatories: [A2], threshold: 1 });
      const externalMulti = makeContact(A3, 'ExtMulti', { signatories: [A4], threshold: 1 });

      const scope = fork({
        values: makeValues([ownMulti, externalMulti], [], [makeOwnAccount(A2)]),
      });

      const ownSources = scope.getState(graphModel.$sourcesFor(CHAIN, { restrictToOwn: true }));
      expect(ownSources.map((s) => s.accountId)).toEqual([A1]);
    });

    // A proxied source must lead to a multisig whose subtree reaches an own
    // signer; otherwise the user could pick the source but never complete
    // the path.
    it('$sourcesFor hides proxied sources whose signing multisig has no own signer', () => {
      const proxiedAcc = acc(1); // proxied (not multisig itself)
      const extMulti = acc(2); // external multisig signing for proxied
      const extLeaf = acc(3); // external leaf

      const contactProxied = makeContact(proxiedAcc, 'Proxied', { signatories: null, threshold: null });
      const contactExtMulti = makeContact(extMulti, 'ExtMulti', { signatories: [extLeaf], threshold: 1 });

      const scope = fork({
        values: makeValues([contactProxied, contactExtMulti], [makeProxy(extMulti, proxiedAcc, CHAIN)], []),
      });

      const ownSources = scope.getState(graphModel.$sourcesFor(CHAIN, { restrictToOwn: true }));
      expect(ownSources.map((s) => s.accountId)).not.toContain(proxiedAcc);
    });
  });
});
