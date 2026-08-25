import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type Chain, type ChainId, AccountType, CryptoType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, accountService } from '@/domains/network';
import { type SearchResolvers, searchOperationRows } from '@/aggregates/operations-search';

import { type DraftListScope, buildDraftSearchRow, filterDraftsByScope } from './draft-scope';

const POLKADOT_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const KUSAMA_CHAIN_ID = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as ChainId;

// Alice's / Bob's well-known accountIds — resolve to valid addresses for any prefix.
const MOCK_ACCOUNT_ID = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as never;
const BOB_ACCOUNT_ID = '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48' as never;
const CHARLIE_ACCOUNT_ID = '0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22' as never;
const DAVE_ACCOUNT_ID = '0x306721211d5404bd9da88e0204360a1a9ab8b87c66c1bc2fcdd37f3c2222cc20' as never;

const chains = {
  [POLKADOT_CHAIN_ID]: { chainId: POLKADOT_CHAIN_ID, name: 'Polkadot', addressPrefix: 0, assets: [] } as never as Chain,
  [KUSAMA_CHAIN_ID]: { chainId: KUSAMA_CHAIN_ID, name: 'Kusama', addressPrefix: 2, assets: [] } as never as Chain,
};

const createMockDraft = (overrides?: Partial<Draft>): Draft =>
  ({
    id: 'draft-1',
    multisigAccountId: MOCK_ACCOUNT_ID,
    proxyAccountId: null,
    chainId: POLKADOT_CHAIN_ID,
    callData: null,
    description: 'Pay the team',
    createdBy: 'user-1',
    createdAt: '2024-06-15T12:00:00Z',
    updatedAt: '2024-06-15T12:00:00Z',
    signingPath: [],
    initiatorAccountId: null,
    ...overrides,
  }) as Draft;

const emptyScope: DraftListScope = {
  network: [],
  type: [],
  proxyType: [],
  dateRange: undefined,
  searchQuery: '',
};

// Split the two name channels as production does: resolveAccountName has no
// wallet step, so a wallet-name-only account resolves to ''. A single-table stub
// would hide that — which is how the wallet-name gap survived the first tests.
const accountNames: Record<string, string> = {
  [BOB_ACCOUNT_ID]: 'Adam Initiator',
  [CHARLIE_ACCOUNT_ID]: 'Charlie Signer',
};
const walletNames: Record<string, string> = {
  [MOCK_ACCOUNT_ID]: 'Team Multisig',
  // A proxy submitter whose name is supplied only by the wallet resolver — no
  // account name, no proxy contact. Mirrors a proxied draft displayed through
  // the synthetic proxy wallet that falls back to resolveWalletName.
  [DAVE_ACCOUNT_ID]: 'Dave Proxy Wallet',
};

const resolvers: SearchResolvers = {
  // Mirrors the real resolver: a contact/identity name wins, the caller's
  // fallback (the owning wallet's name) only fills in when there is none.
  resolveAccountName: (accountId, _chain, fallbackName) => accountNames[accountId] ?? fallbackName ?? '',
  resolveWalletName: (accountId) => walletNames[accountId] ?? null,
  // Real encoding — address assertions must mean something.
  resolveAddress: (accountId, chain) => toAddress(accountId, { prefix: chain?.addressPrefix }),
};

/** Mirrors what useVisibleDrafts does: resolve names, then filter. */
const filterWithSearch = (drafts: Draft[], scope: DraftListScope, walletAccounts: AnyAccount[] = []) => {
  const searchMatchedIds = searchOperationRows(
    drafts.map((draft) => buildDraftSearchRow(draft, chains, resolvers.resolveWalletName)),
    scope.searchQuery,
    resolvers,
  );

  return filterDraftsByScope(drafts, scope, searchMatchedIds, walletAccounts);
};

describe('filterDraftsByScope', () => {
  const polkadotDraft = createMockDraft({ id: 'draft-dot', chainId: POLKADOT_CHAIN_ID });
  const kusamaDraft = createMockDraft({ id: 'draft-ksm', chainId: KUSAMA_CHAIN_ID });

  test('keeps every draft for an empty scope', () => {
    const result = filterWithSearch([polkadotDraft, kusamaDraft], emptyScope);
    expect(result.map((d) => d.id)).toEqual(['draft-dot', 'draft-ksm']);
  });

  test('network filter keeps only drafts on the selected chains', () => {
    const scope = { ...emptyScope, network: [KUSAMA_CHAIN_ID] };
    const result = filterWithSearch([polkadotDraft, kusamaDraft], scope);
    expect(result.map((d) => d.id)).toEqual(['draft-ksm']);
  });

  test('an active type filter puts every draft out of scope', () => {
    const scope = { ...emptyScope, type: ['transfer'] };
    expect(filterWithSearch([polkadotDraft, kusamaDraft], scope)).toEqual([]);
  });

  test('an active proxy type filter puts every draft out of scope', () => {
    const scope = { ...emptyScope, proxyType: ['Any'] };
    expect(filterWithSearch([polkadotDraft, kusamaDraft], scope)).toEqual([]);
  });

  test('date range filters by creation date', () => {
    const juneDraft = createMockDraft({ id: 'draft-june', createdAt: '2024-06-15T12:00:00Z' });
    const januaryDraft = createMockDraft({ id: 'draft-jan', createdAt: '2024-01-10T12:00:00Z' });

    const fromScope = { ...emptyScope, dateRange: { from: new Date('2024-03-01') } };
    expect(filterWithSearch([juneDraft, januaryDraft], fromScope).map((d) => d.id)).toEqual(['draft-june']);

    const rangeScope = { ...emptyScope, dateRange: { from: new Date('2024-01-01'), to: new Date('2024-02-01') } };
    expect(filterWithSearch([juneDraft, januaryDraft], rangeScope).map((d) => d.id)).toEqual(['draft-jan']);
  });

  test('search matches the description case-insensitively', () => {
    const scope = { ...emptyScope, searchQuery: 'PAY the' };
    expect(filterWithSearch([polkadotDraft], scope).map((d) => d.id)).toEqual(['draft-dot']);

    const missScope = { ...emptyScope, searchQuery: 'unrelated' };
    expect(filterWithSearch([polkadotDraft], missScope)).toEqual([]);
  });

  test('search matches the multisig address formatted with the chain prefix', () => {
    // Alice's accountId on Polkadot (prefix 0) starts with 15oF4...
    const scope = { ...emptyScope, searchQuery: '15oF4' };
    expect(filterWithSearch([polkadotDraft], scope).map((d) => d.id)).toEqual(['draft-dot']);
  });

  test('search matches a submitter name that only the wallet supplies', () => {
    // Reachable only through resolveWalletName, yet <NamedAccount> shows it as a
    // hard title override — so the query must still find it.
    expect(resolvers.resolveAccountName(MOCK_ACCOUNT_ID)).toBe('');

    const scope = { ...emptyScope, searchQuery: 'Team Multi' };
    expect(filterWithSearch([polkadotDraft], scope).map((d) => d.id)).toEqual(['draft-dot']);
  });

  describe('proxied draft', () => {
    const proxiedDraft = createMockDraft({
      id: 'draft-proxied',
      proxyAccountId: BOB_ACCOUNT_ID,
      proxyContact: { name: 'Alice Cold Proxy', accountId: BOB_ACCOUNT_ID },
    } as Partial<Draft>);

    test('search matches the proxy contact name the row displays', () => {
      // On screen via the synthetic proxy wallet, though no resolver produces it.
      const scope = { ...emptyScope, searchQuery: 'Cold Proxy' };
      expect(filterWithSearch([proxiedDraft], scope).map((d) => d.id)).toEqual(['draft-proxied']);
    });

    test('search still matches the multisig address when a proxy is set', () => {
      // The details panel shows the multisig alongside the proxy.
      const scope = { ...emptyScope, searchQuery: '15oF4' };
      expect(filterWithSearch([proxiedDraft], scope).map((d) => d.id)).toEqual(['draft-proxied']);
    });

    describe('without a proxy contact', () => {
      // The row falls back to the synthetic proxy wallet, whose name comes from
      // resolveWalletName — so the search meta must match that same channel.
      const proxiedNoContactDraft = createMockDraft({
        id: 'draft-proxied-no-contact',
        proxyAccountId: DAVE_ACCOUNT_ID,
      });

      test('search matches the proxy submitter name the wallet resolver supplies', () => {
        // Reachable only through resolveWalletName — no account name for Dave.
        expect(resolvers.resolveAccountName(DAVE_ACCOUNT_ID)).toBe('');

        const scope = { ...emptyScope, searchQuery: 'Dave Proxy' };
        expect(filterWithSearch([proxiedNoContactDraft], scope).map((d) => d.id)).toEqual(['draft-proxied-no-contact']);
      });

      test('search matches the proxy submitter address with the chain prefix', () => {
        // Dave's accountId on Polkadot (prefix 0) starts with 126TwB...
        const scope = { ...emptyScope, searchQuery: '126TwB' };
        expect(filterWithSearch([proxiedNoContactDraft], scope).map((d) => d.id)).toEqual(['draft-proxied-no-contact']);
      });
    });
  });

  describe('initiator', () => {
    const assignedDraft = createMockDraft({ id: 'draft-assigned', initiatorAccountId: BOB_ACCOUNT_ID });

    test('search matches the resolved initiator name', () => {
      const scope = { ...emptyScope, searchQuery: 'Adam' };
      expect(filterWithSearch([assignedDraft, polkadotDraft], scope).map((d) => d.id)).toEqual(['draft-assigned']);
    });

    test('search matches the initiator wallet name when the initiator has no name of its own', () => {
      // Dave resolves to no account name, so the Initiator column falls back to
      // the owning wallet's name — the query must match exactly that.
      const walletOnlyDraft = createMockDraft({ id: 'draft-wallet-only', initiatorAccountId: DAVE_ACCOUNT_ID });
      const scope = { ...emptyScope, searchQuery: 'Dave Proxy Wallet' };

      expect(filterWithSearch([walletOnlyDraft, polkadotDraft], scope).map((d) => d.id)).toEqual(['draft-wallet-only']);
    });

    test('search matches the initiator address with the draft chain prefix', () => {
      // Bob's accountId on Polkadot (prefix 0) starts with 14E5nq...
      const scope = { ...emptyScope, searchQuery: '14E5nq' };
      expect(filterWithSearch([assignedDraft, polkadotDraft], scope).map((d) => d.id)).toEqual(['draft-assigned']);
    });

    test('falls back to the signing path signer when initiatorAccountId is absent', () => {
      const legacyDraft = createMockDraft({
        id: 'draft-legacy',
        initiatorAccountId: null,
        signingPath: [
          { kind: 'multisig', accountId: MOCK_ACCOUNT_ID },
          { kind: 'signer', accountId: BOB_ACCOUNT_ID },
        ] as never,
      });

      const scope = { ...emptyScope, searchQuery: 'Adam' };
      expect(filterWithSearch([legacyDraft], scope).map((d) => d.id)).toEqual(['draft-legacy']);
    });

    test('surfaces initiatorAccountId in its own column even when the signing path diverges', () => {
      // The Initiator column renders draft.initiatorAccountId directly, so both
      // the path's signer and the assigned initiator are on screen and match.
      const divergentDraft = createMockDraft({
        id: 'draft-divergent',
        initiatorAccountId: BOB_ACCOUNT_ID,
        signingPath: [
          { kind: 'multisig', accountId: MOCK_ACCOUNT_ID },
          { kind: 'signer', accountId: CHARLIE_ACCOUNT_ID },
        ] as never,
      });

      expect(filterWithSearch([divergentDraft], { ...emptyScope, searchQuery: 'Charlie' }).map((d) => d.id)).toEqual([
        'draft-divergent',
      ]);
      expect(filterWithSearch([divergentDraft], { ...emptyScope, searchQuery: 'Adam' }).map((d) => d.id)).toEqual([
        'draft-divergent',
      ]);
    });

    test('a draft with no initiator simply never matches an initiator query', () => {
      const scope = { ...emptyScope, searchQuery: 'Adam' };
      expect(filterWithSearch([polkadotDraft], scope)).toEqual([]);
    });

    test('the initiator column stays searchable when the path has no signer hop', () => {
      // The Initiator column still shows draft.initiatorAccountId regardless of a
      // malformed path, so it must remain matchable.
      const brokenPathDraft = createMockDraft({
        id: 'draft-broken',
        initiatorAccountId: BOB_ACCOUNT_ID,
        signingPath: [{ kind: 'multisig', accountId: MOCK_ACCOUNT_ID }] as never,
      });

      expect(filterWithSearch([brokenPathDraft], { ...emptyScope, searchQuery: 'Adam' }).map((d) => d.id)).toEqual([
        'draft-broken',
      ]);
    });
  });

  describe('nested multisig', () => {
    // `multisigAccountId` stores the deepest hop, so the root exists only in the
    // path — yet the details panel lists every node.
    const nestedDraft = createMockDraft({
      id: 'draft-nested',
      multisigAccountId: CHARLIE_ACCOUNT_ID,
      signingPath: [
        { kind: 'multisig', accountId: MOCK_ACCOUNT_ID },
        { kind: 'multisig', accountId: CHARLIE_ACCOUNT_ID },
        { kind: 'signer', accountId: BOB_ACCOUNT_ID },
      ] as never,
    });

    test('matches the root multisig, which is not in any flat field', () => {
      // Alice at Polkadot's prefix 0 — the root hop's address.
      expect(filterWithSearch([nestedDraft], { ...emptyScope, searchQuery: '15oF4' }).map((d) => d.id)).toEqual([
        'draft-nested',
      ]);
    });

    test('matches an intermediate hop by its owning wallet name when the account has none', () => {
      // The root hop is neither the submitter nor the initiator; the panel shows
      // it as its wallet's name (no account name, no contact), so the query must
      // match that name too.
      expect(filterWithSearch([nestedDraft], { ...emptyScope, searchQuery: 'Team Multisig' }).map((d) => d.id)).toEqual(
        ['draft-nested'],
      );
    });

    test('matches the deepest multisig and the signer too', () => {
      expect(filterWithSearch([nestedDraft], { ...emptyScope, searchQuery: 'Charlie' }).map((d) => d.id)).toEqual([
        'draft-nested',
      ]);
      expect(filterWithSearch([nestedDraft], { ...emptyScope, searchQuery: 'Adam' }).map((d) => d.id)).toEqual([
        'draft-nested',
      ]);
    });
  });

  describe('needs my signature', () => {
    const makeAccount = (accountId: string, signingType = SigningType.POLKADOT_VAULT): AnyAccount =>
      ({
        id: `account-${accountId}`,
        walletId: 1,
        accountId,
        name: 'Bob',
        type: 'universal',
        accountType: AccountType.BASE,
        cryptoType: CryptoType.SR25519,
        signingType,
        createdAt: 0,
      }) as never;

    // Bob is a local account that can sign; Charlie is not local.
    const walletAccounts = [makeAccount(BOB_ACCOUNT_ID)];
    // A usable path needs the multisig hop and the signing leaf.
    const path = [
      { kind: 'multisig', accountId: MOCK_ACCOUNT_ID },
      { kind: 'signatory', accountId: BOB_ACCOUNT_ID },
    ] as never;
    const mineDraft = createMockDraft({ id: 'draft-mine', initiatorAccountId: BOB_ACCOUNT_ID, signingPath: path });
    const foreignDraft = createMockDraft({
      id: 'draft-foreign',
      initiatorAccountId: CHARLIE_ACCOUNT_ID,
      signingPath: path,
    });
    const unassignedDraft = createMockDraft({ id: 'draft-unassigned', initiatorAccountId: null, signingPath: path });
    const legacyDraft = createMockDraft({ id: 'draft-legacy', initiatorAccountId: BOB_ACCOUNT_ID, signingPath: [] });

    // `hasPermissionToMakeActions` resolves through a DI anyOf with no handlers
    // in unit tests — seed the same watch-only rule the account domain uses.
    beforeEach(() => {
      accountService.accountActionPermissionAnyOf.registerHandler({
        body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
        available: () => true,
      });
    });

    afterEach(() => {
      accountService.accountActionPermissionAnyOf.resetHandlers();
    });

    test('off: keeps every draft whoever the initiator is', () => {
      const result = filterWithSearch(
        [mineDraft, foreignDraft, unassignedDraft, legacyDraft],
        emptyScope,
        walletAccounts,
      );
      expect(result.map((d) => d.id)).toEqual(['draft-mine', 'draft-foreign', 'draft-unassigned', 'draft-legacy']);
    });

    test('on: keeps only drafts assigned to a local signer', () => {
      const scope = { ...emptyScope, needsMySignature: true };
      const result = filterWithSearch([mineDraft, foreignDraft, unassignedDraft], scope, walletAccounts);
      expect(result.map((d) => d.id)).toEqual(['draft-mine']);
    });

    test('on: a draft nobody local can initiate is not mine', () => {
      const scope = { ...emptyScope, needsMySignature: true };
      expect(filterWithSearch([foreignDraft, unassignedDraft], scope, walletAccounts)).toEqual([]);
    });

    test('on: a legacy draft without a signing path is not mine even if the initiator is local', () => {
      const scope = { ...emptyScope, needsMySignature: true };
      expect(filterWithSearch([legacyDraft], scope, walletAccounts)).toEqual([]);
    });

    test('on: a watch-only initiator cannot sign, so the draft is not mine', () => {
      const scope = { ...emptyScope, needsMySignature: true };
      const watchOnly = [makeAccount(BOB_ACCOUNT_ID, SigningType.WATCH_ONLY)];
      expect(filterWithSearch([mineDraft], scope, watchOnly)).toEqual([]);
    });

    test('on: combines with the other scope filters', () => {
      const scope = { ...emptyScope, needsMySignature: true, network: [KUSAMA_CHAIN_ID] };
      expect(filterWithSearch([mineDraft], scope, walletAccounts)).toEqual([]);
    });
  });
});
