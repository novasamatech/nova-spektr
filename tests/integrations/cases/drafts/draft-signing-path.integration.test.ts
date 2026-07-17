import { type Event, allSettled, createStore } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type MultisigAccount,
  type ProxiedAccount,
  AccountType,
  ConnectionStatus,
  CryptoType,
  ProxyVariant,
  SigningType,
} from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft, type PathNode } from '@/domains/backend';
import { type AnyAccount, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { submitDraftModel } from '@/features/drafts/model/submit-draft-model';
import { polkadotChain, polkadotChainId, vaultWallet } from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

// --- Local fixtures: production typeguards check the `accountType`
// discriminator (set when the account is persisted — see
// `features/multisig-wallet`, `features/proxied-wallet`), while the shared
// fixtures lack it. Build accounts with the real `accountType` field so
// `isMultisigAccount` / `isProxiedAccount` resolve correctly inside
// `createPathRouteStore`.

// Use distinct string seeds — `createAccountId` reduces the seed to a sum of
// char codes, so numeric seeds like 101/110 collide (both sum to 146).
const SIGNER_ID: AccountId = createAccountId('signer-alpha');
const SIGNER_2_ID: AccountId = createAccountId('signer-beta');
const MULTISIG_TOP_ID: AccountId = createAccountId('multisig-top');
const MULTISIG_MID_ID: AccountId = createAccountId('multisig-mid');
const PROXIED_ID: AccountId = createAccountId('proxied-root');
const MISSING_MULTISIG_ID: AccountId = createAccountId('missing-ghost');

const signerAccount: AnyAccount = {
  id: 'signer-1',
  accountId: SIGNER_ID,
  walletId: vaultWallet.id,
  name: 'Signer 1',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const signerAccount2: AnyAccount = {
  id: 'signer-2',
  accountId: SIGNER_2_ID,
  walletId: vaultWallet.id,
  name: 'Signer 2',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const multisigTop = {
  id: 'multisig-top',
  accountId: MULTISIG_TOP_ID,
  walletId: vaultWallet.id,
  name: 'Multisig Top',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: MULTISIG_MID_ID, name: 'Mid' }],
  createdAt: 0,
} satisfies MultisigAccount as unknown as AnyAccount;

const multisigMid = {
  id: 'multisig-mid',
  accountId: MULTISIG_MID_ID,
  walletId: vaultWallet.id,
  name: 'Multisig Mid',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: SIGNER_ID, name: 'Signer 1' }],
  createdAt: 0,
} satisfies MultisigAccount as unknown as AnyAccount;

const proxiedAccount = {
  id: 'proxied-1',
  accountId: PROXIED_ID,
  walletId: vaultWallet.id,
  name: 'Proxied',
  type: 'chain',
  chainId: polkadotChainId,
  accountType: AccountType.PROXIED,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  proxyVariant: ProxyVariant.REGULAR,
  connections: [{ proxyAccountId: SIGNER_ID, delay: 0, proxyType: 'Any' }],
  deposit: '100000000000',
  extrinsicIndex: 0,
  entropyBlockNumber: 0,
  createdAt: 0,
} satisfies ProxiedAccount as unknown as AnyAccount;

const makeDraft = (signingPath: PathNode[], overrides: Partial<Draft> = {}): Draft => ({
  id: 'draft-test',
  operation: null,
  multisigAccountId: null,
  proxyAccountId: null,
  chainId: polkadotChainId,
  callData: '0x0000',
  description: 'test',
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath,
  initiatorAccountId: null,
  ...overrides,
});

// `.watch` is blocked by `effector/no-watch`; collect payloads in a store instead.
const payloadsStore = <T>(event: Event<T>) => createStore<T[]>([]).on(event, (s, p) => [...s, p]);

const $balanceFetchPayloads = payloadsStore(balanceSubModel.fetchAccountIds);

const buildEnv = async (testAccounts: AnyAccount[]): Promise<FeatureTestEnvironment> => {
  // `autoPopulate: false` + direct `withStoreValue` — the test storage uses a
  // private IDB name, so `accounts.populate` (which reads from production
  // `spektr` db) would otherwise leave the store empty. Seeding the effector
  // stores directly is the documented path for store-level assertions.
  const env = await new FeatureTestBuilder({ autoPopulate: false })
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
    .withStoreValue(accounts.__test.$list, testAccounts)
    .build();
  await seedAccountHandlers(env.scope);

  return env;
};

describe('Submit Draft — signing path drives the route', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) await env.cleanup();
  });

  describe('$initiator resolution', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Initiator resolves from signingPath[0]',
      });
    });

    it('resolves $initiator from path[0] for a single-multisig draft', async () => {
      env = await buildEnv([multisigTop, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_TOP_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigTop, chain: polkadotChain },
      });

      const initiator = env.getState(submitDraftModel.$initiator);
      expect(initiator).not.toBeNull();
      expect(initiator!.accountId).toBe(MULTISIG_TOP_ID);
    });

    it('takes path[0] over the flowStarted initiator for nested multisigs', async () => {
      // Authored route: top → mid → signer. `multisigAccountId` is the deepest
      // multisig (mid). The caller (DraftsSection) seeds flowInitiator from
      // `multisigAccountId`, but $initiator must canonicalize to path[0] (top).
      env = await buildEnv([multisigTop, multisigMid, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'multisig', accountId: MULTISIG_MID_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_MID_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        // Intentionally seed with the deepest multisig — the bug we're guarding
        // against. The derived $initiator should override to path[0].
        params: { draft, initiator: multisigMid, chain: polkadotChain },
      });

      const initiator = env.getState(submitDraftModel.$initiator);
      expect(initiator).not.toBeNull();
      expect(initiator!.accountId).toBe(MULTISIG_TOP_ID);
      // Sanity: $flowInitiator still holds the seed value.
      const flowInitiator = env.getState(submitDraftModel.__test.$flowInitiator);
      expect(flowInitiator!.accountId).toBe(MULTISIG_MID_ID);
    });

    it('resolves $initiator from path[0] for a proxied draft', async () => {
      env = await buildEnv([proxiedAccount, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'proxied', accountId: PROXIED_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { proxyAccountId: PROXIED_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: proxiedAccount, chain: polkadotChain },
      });

      const initiator = env.getState(submitDraftModel.$initiator);
      expect(initiator).not.toBeNull();
      expect(initiator!.accountId).toBe(PROXIED_ID);
    });

    it('falls back to $flowInitiator for legacy drafts (empty signingPath)', async () => {
      env = await buildEnv([signerAccount]);

      // Legacy draft has no path saved → $pathRoute is null → must use the
      // seed initiator passed via flowStarted.
      const draft = makeDraft([]);

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: signerAccount, chain: polkadotChain },
      });

      const initiator = env.getState(submitDraftModel.$initiator);
      expect(initiator).not.toBeNull();
      expect(initiator!.accountId).toBe(SIGNER_ID);
    });
  });

  describe('$route resolution', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Route strictly mirrors signingPath',
      });
    });

    it('mirrors the full signingPath for a nested multisig draft', async () => {
      env = await buildEnv([multisigTop, multisigMid, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'multisig', accountId: MULTISIG_MID_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_MID_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigMid, chain: polkadotChain },
      });

      const route = env.getState(submitDraftModel.$route);
      expect(route.map((a) => a.accountId)).toEqual([MULTISIG_TOP_ID, MULTISIG_MID_ID, SIGNER_ID]);
    });

    it('reports unresolved path and blocks routing when path[0] is missing from wallet accounts', async () => {
      // The signer is present but the top multisig was removed (e.g. wallet
      // wiped). Path can't be reconstructed — must NOT silently re-route.
      env = await buildEnv([signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MISSING_MULTISIG_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MISSING_MULTISIG_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: null, chain: polkadotChain },
      });

      expect(env.getState(submitDraftModel.$route)).toEqual([]);
      expect(env.getState(submitDraftModel.$pathResolutionError)).toBe(true);
      expect(env.getState(submitDraftModel.$wrappedTxErrorKind)).toBe('signing-path-unresolved');
    });

    it('ignores stray wallet accounts outside the saved path', async () => {
      // Drop an unrelated `signer-2` into the wallet alongside the authored
      // path. The resolved route must contain exactly the path nodes — no
      // accidental inclusion of extra accounts.
      //
      // Note: this test does NOT prove BFS itself is bypassed (the
      // `accountCollectChildrenPipeline` DI handler isn't registered here, so
      // `findRoute` returns [] regardless). Verifying BFS-bypass directly
      // would require wiring the multisig children pipeline; until then, the
      // BFS-vs-saved branch is covered by the resolution tests above and by
      // production usage in `aggregates/multisig`.
      env = await buildEnv([multisigTop, multisigMid, signerAccount, signerAccount2]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'multisig', accountId: MULTISIG_MID_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_MID_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigMid, chain: polkadotChain },
      });

      const route = env.getState(submitDraftModel.$route);
      expect(route.map((a) => a.accountId)).toEqual([MULTISIG_TOP_ID, MULTISIG_MID_ID, SIGNER_ID]);
      expect(route).toHaveLength(3);
      expect(route.every((a) => a.accountId !== SIGNER_2_ID)).toBe(true);
    });
  });

  describe('balance prefetch for validation', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Submit prefetches fee and multisig-deposit payer balances',
      });
    });

    it('requests balances for nested multisig deposit payers on flow start', async () => {
      env = await buildEnv([multisigTop, multisigMid, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'multisig', accountId: MULTISIG_MID_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_MID_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigMid, chain: polkadotChain },
      });

      const calls = env.getState($balanceFetchPayloads);
      const lastCall = calls.at(-1);
      expect(lastCall?.map(({ accountId }) => accountId)).toEqual([MULTISIG_MID_ID, SIGNER_ID]);
      expect(lastCall?.map(({ chain }) => chain.chainId)).toEqual([polkadotChainId, polkadotChainId]);
      expect(env.getState(submitDraftModel.$validationValid)).toBe(false);
    });
  });

  describe('signatory auto-selection (regression: dropped signatory→initiator fallback)', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Signatory pre-select fires on flow start',
      });
    });

    it('pre-selects $signatoryStore from draft.initiatorAccountId on flow start', async () => {
      // After removing the `signer = signatory || initiator` fallback, the
      // confirm/sign chain depends on `$signatoryStore` being non-null. The
      // path-driven pre-select sample (clock: `[$availableAccounts, $draft]`)
      // must fire on flow start so the user isn't stuck on a loader.
      env = await buildEnv([multisigTop, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_TOP_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigTop, chain: polkadotChain },
      });

      const signatory = env.getState(submitDraftModel.$signatoryStore);
      expect(signatory).not.toBeNull();
      expect(signatory!.accountId).toBe(SIGNER_ID);
    });

    it('keeps a proxied path leaf in $signatories when the account graph cannot rediscover it', async () => {
      // Proxied draft routes can be valid from the saved signingPath even when
      // the generic graph has no registered proxied-wallet children handler in
      // this scope. The submit modal must still see the saved path leaf as a
      // signatory instead of showing the empty-account state.
      env = await buildEnv([proxiedAccount, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'proxied', accountId: PROXIED_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { proxyAccountId: PROXIED_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: proxiedAccount, chain: polkadotChain },
      });

      expect(env.getState(submitDraftModel.$signatories).map((s) => s.accountId)[0]).toBe(SIGNER_ID);
      expect(env.getState(submitDraftModel.$signatoryStore)?.accountId).toBe(SIGNER_ID);
    });
  });
});
