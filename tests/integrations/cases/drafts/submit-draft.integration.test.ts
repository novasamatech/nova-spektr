import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { type Event, allSettled, createStore } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type HexString,
  type MultisigAccount,
  type ProxyAccount,
  AccountType,
  CryptoType,
  SigningType,
} from '@/shared/core';
import { type BackendContact } from '@/shared/core/types/contact';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { activeOperationRoute } from '@/shared/transactions';
import { type Draft, type PathNode, draftsResource, draftsService, operationsService } from '@/domains/backend';
import { type AnyAccount, type Extrinsic, accounts, transactionService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { proxyModel } from '@/entities/proxy';
import { accountUtils, walletModel } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { multisigOperationDescription } from '@/aggregates/multisig-operation-description';
import { findRouteMultisigAccountId } from '@/aggregates/multisig-operation-description/lib/findRouteMultisigAccountId';
import { getDraftSubmitGate } from '@/features/drafts/lib/submit-draft-availability';
import { submitDraftModel } from '@/features/drafts/model/submit-draft-model';
import { signModel } from '@/features/operations/OperationSign';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { graphModel } from '@/features/signing-path';
import { polkadotChain, polkadotChainId, vaultWallet } from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

const BASE_URL = 'https://backend.test';
// Lowercase hex — `tryDecodeCallData` requires the decoded call to round-trip
// to the exact input bytes, and our fake api echoes this constant back.
const CALL_DATA = '0x0403001122';
const CALL_HASH: HexString = '0x1111111111111111111111111111111111111111111111111111111111111111';

// Distinct string seeds — `createAccountId` reduces the seed to a char-code
// sum, so similar numeric seeds collide (see draft-signing-path test).
const SIGNER_ID: AccountId = createAccountId('signer-alpha');
const STRAY_SIGNER_ID: AccountId = createAccountId('signer-beta');
const MULTISIG_TOP_ID: AccountId = createAccountId('multisig-top');
const MULTISIG_MID_ID: AccountId = createAccountId('multisig-mid');
const CONTACT_MULTISIG_ID: AccountId = createAccountId('contact-multisig');
const CONTACT_PROXY_ID: AccountId = createAccountId('contact-pure-proxy');
const CONTACT_PLAIN_ID: AccountId = createAccountId('contact-plain');
const EXTERNAL_SIGNER_ID: AccountId = createAccountId('external-signer');

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

const straySignerAccount: AnyAccount = {
  id: 'signer-2',
  accountId: STRAY_SIGNER_ID,
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

// Own multisig used as a "top" with a directly-signable leaf. Reuses the top
// shape but pins the signer as the signatory so single-hop drafts resolve.
const multisigDirect = {
  id: 'multisig-direct',
  accountId: MULTISIG_TOP_ID,
  walletId: vaultWallet.id,
  name: 'Multisig Direct',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: SIGNER_ID, name: 'Signer 1' }],
  createdAt: 0,
} satisfies MultisigAccount as unknown as AnyAccount;

const makeDraft = (signingPath: PathNode[], overrides: Partial<Draft> = {}): Draft => ({
  id: 'draft-test',
  operation: null,
  multisigAccountId: null,
  proxyAccountId: null,
  chainId: polkadotChainId,
  callData: CALL_DATA,
  description: 'draft note',
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath,
  initiatorAccountId: null,
  ...overrides,
});

const makeBackendContact = (
  accountId: AccountId,
  name: string,
  extra: Partial<BackendContact> = {},
): BackendContact => ({
  id: `contact-${name}`,
  name,
  address: toAddress(accountId, { prefix: 0 }),
  accountId,
  source: 'backend',
  entityNames: [],
  chainId: null,
  chainName: null,
  categoryName: null,
  contactTypeName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  tags: [],
  ...extra,
});

const authState = {
  accountId: createAccountId('backend-user'),
  accountName: 'Backend user',
  permissions: [],
};

// Minimal api double: `createType` feeds both the call-data decoder (round-trip
// via `toHex`) and the post-submit call-hash fallback; `consts.multisig` feeds
// the deposit calculator. Everything api-heavy (wrapping, extrinsic creation,
// fee) is spied at the service seam instead.
const fakeCall = {
  section: 'balances',
  method: 'transferKeepAlive',
  argsEntries: [],
  toHex: () => CALL_DATA,
  hash: { toHex: () => CALL_HASH },
};
const fakeApi = {
  createType: () => fakeCall,
  registry: { createType: () => fakeCall },
  consts: { multisig: { depositBase: new BN(20), depositFactor: new BN(1) } },
} as unknown as ApiPromise;

const wrappedSentinel = {
  type: 'decoded',
  section: 'multisig',
  method: 'asMulti',
  args: {},
} as unknown as Parameters<typeof transactionService.createExtrinsic>[0];

const extrinsicSentinel = {} as unknown as Extrinsic;
const fakeSignedExtrinsic = {} as unknown as Extrinsic;

const seamSpies = () => ({
  wrap: vi.spyOn(transactionService, 'wrapTransaction').mockResolvedValue(wrappedSentinel),
  createExtrinsic: vi.spyOn(transactionService, 'createExtrinsic').mockReturnValue(extrinsicSentinel),
  fee: vi.spyOn(transactionService, 'getExtrinsicFee').mockResolvedValue(new BN(1_000_000)),
});

const successResults = [
  {
    id: 0,
    result: ExtrinsicResult.SUCCESS,
    params: {
      timepoint: { height: 100, index: 2 },
      signature: '0x00' as HexString,
      extrinsicHash: '0xfeed' as HexString,
      isFinalApprove: false,
      multisigError: '',
      proxyError: '',
    },
  } satisfies SuccessResult,
];

// `.watch` is blocked by `effector/no-watch`; collect payloads in a store instead.
const payloadsStore = <T>(event: Event<T>) => createStore<T[]>([]).on(event, (s, p) => [...s, p]);

const $draftFlowActivePayloads = payloadsStore(multisigOperationDescription.setDraftFlowActive);
const $draftUpdatedPayloads = payloadsStore(draftsResource.draftUpdated);

// Source stores must exist before any fork, so resolve them at module level
// (the graph model caches them per chainId+options anyway).
const $draftModeSources = graphModel.$sourcesFor(polkadotChainId);
const $ownRestrictedSources = graphModel.$sourcesFor(polkadotChainId, { restrictToOwn: true });

describe('Submit Draft — submit & edit flows', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (env) await env.cleanup();
  });

  const buildEnv = async (
    testAccounts: AnyAccount[],
    configure: (builder: FeatureTestBuilder) => FeatureTestBuilder = (b) => b,
  ): Promise<FeatureTestEnvironment> => {
    const builder = new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotChain)
      .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
      .withStoreValue(accounts.__test.$list, testAccounts);
    const built = await configure(builder).build();
    await seedAccountHandlers(built.scope);

    return built;
  };

  describe('wrapped tx derives from the saved path', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Wrapper input is the saved-path route',
      });
    });

    it('feeds the wrapper engine the resolved saved path and adopts its output as the submit extrinsic', async () => {
      const spies = seamSpies();
      // A stray signable account sits in the wallet next to the authored path —
      // the wrapper input must contain exactly the path nodes.
      env = await buildEnv([multisigTop, multisigMid, signerAccount, straySignerAccount], (b) =>
        b.withApi(polkadotChainId, fakeApi),
      );

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

      // The wrapper engine receives the draft's encoded call and the route
      // resolved strictly from the saved path — outermost multisig first, the
      // stray wallet account never leaks in.
      const lastWrapCall = spies.wrap.mock.calls.at(-1);
      expect(lastWrapCall).toBeDefined();
      expect(lastWrapCall![0]).toEqual({ type: 'encoded', callData: CALL_DATA });
      expect(lastWrapCall![1].map((a) => a.accountId)).toEqual([MULTISIG_TOP_ID, MULTISIG_MID_ID, SIGNER_ID]);
      expect(lastWrapCall![2]).toBe(fakeApi);

      // The wrapper's output — not the bare transaction — is what the flow
      // carries forward into extrinsic creation and exposes to the confirm UI.
      expect(env.getState(submitDraftModel.$wrappedTx)).toBe(wrappedSentinel);
      const lastExtrinsicCall = spies.createExtrinsic.mock.calls.at(-1);
      expect(lastExtrinsicCall![0]).toBe(wrappedSentinel);
      expect(env.getState(submitDraftModel.$wrappedExtrinsic)).toBe(extrinsicSentinel);
      expect(env.getState(submitDraftModel.$wrappedTxError)).toBe(false);
    });
  });

  describe('description handoff to the multisig-operation-description aggregate', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Draft description reaches the backend keyed by the route multisig',
      });
    });

    it('signals draft-flow-active to the aggregate for the whole flow duration', async () => {
      env = await buildEnv([multisigDirect, signerAccount]);

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_TOP_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigDirect, chain: polkadotChain },
      });
      expect(env.getState($draftFlowActivePayloads)).toEqual([true]);

      await allSettled(submitDraftModel.flowFinished, { scope: env.scope });
      expect(env.getState($draftFlowActivePayloads)).toEqual([true, false]);
    });

    it('posts the draft description once, keyed by the route multisig, ignoring the user-typed note', async () => {
      seamSpies();
      const createDescriptionSpy = vi.spyOn(operationsService, 'createDescription').mockResolvedValue(undefined);

      env = await buildEnv([multisigDirect, signerAccount], (b) =>
        b
          .withApi(polkadotChainId, fakeApi)
          .withStoreValue(backendConfigurationModel.$backendUrl, BASE_URL)
          .withStoreValue(authModel.$authState, authState)
          .withStoreValue(contactModel.$backendContacts, [makeBackendContact(MULTISIG_TOP_ID, 'multisig-top')])
          .withStoreValue(signModel.$signStore, [
            { api: fakeApi, chain: polkadotChain, signatory: signerAccount, extrinsic: fakeSignedExtrinsic },
          ]),
      );

      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_TOP_ID, initiatorAccountId: SIGNER_ID },
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigDirect, chain: polkadotChain },
      });

      // Confirm init published the resolved route; its multisig — the key the
      // aggregate would use — is exactly the draft's multisigAccountId.
      const activeRoute = env.getState(activeOperationRoute.$activeOperationRoute);
      expect(findRouteMultisigAccountId(activeRoute)).toBe(MULTISIG_TOP_ID);
      expect(findRouteMultisigAccountId(env.getState(submitDraftModel.$route))).toBe(draft.multisigAccountId);

      // A user-typed note exists and every other pending-context condition is
      // satisfied (auth, contact, signStore, route multisig) — only the active
      // draft flow suppresses the aggregate's own post.
      await allSettled(multisigOperationDescription.setDescription, { scope: env.scope, params: 'user note' });
      await allSettled(signModel.signed, {
        scope: env.scope,
        params: [
          {
            api: fakeApi,
            signatory: SIGNER_ID,
            extrinsic: fakeSignedExtrinsic,
            signature: '0x00' as HexString,
            payload: new Uint8Array(),
          },
        ],
      });
      await allSettled(submitModel.done, { scope: env.scope, params: successResults });

      expect(createDescriptionSpy).toHaveBeenCalledTimes(1);
      expect(createDescriptionSpy).toHaveBeenCalledWith(BASE_URL, {
        multisigAccountId: MULTISIG_TOP_ID,
        chainId: polkadotChainId,
        callHash: CALL_HASH,
        blockNumber: 100,
        extrinsicIndex: 2,
        description: 'draft note',
        draftId: draft.id,
      });
      expect(env.getState(submitDraftModel.$submittedDraftIds).has(draft.id)).toBe(true);
    });

    it('control: without a draft flow the aggregate posts the typed note itself, keyed the same way', async () => {
      const createDescriptionSpy = vi.spyOn(operationsService, 'createDescription').mockResolvedValue(undefined);

      env = await buildEnv([multisigDirect, signerAccount], (b) =>
        b
          .withStoreValue(backendConfigurationModel.$backendUrl, BASE_URL)
          .withStoreValue(authModel.$authState, authState)
          .withStoreValue(contactModel.$backendContacts, [makeBackendContact(MULTISIG_TOP_ID, 'multisig-top')])
          .withStoreValue(signModel.$signStore, [
            { api: fakeApi, chain: polkadotChain, signatory: signerAccount, extrinsic: fakeSignedExtrinsic },
          ]),
      );

      // Simulate a non-draft confirm publishing its route.
      await allSettled(activeOperationRoute.activeOperationChanged, {
        scope: env.scope,
        params: { route: [multisigDirect, signerAccount], chain: polkadotChain },
      });
      await allSettled(multisigOperationDescription.setDescription, { scope: env.scope, params: 'user note' });
      await allSettled(signModel.signed, {
        scope: env.scope,
        params: [
          {
            api: fakeApi,
            signatory: SIGNER_ID,
            extrinsic: fakeSignedExtrinsic,
            signature: '0x00' as HexString,
            payload: new Uint8Array(),
          },
        ],
      });
      await allSettled(submitModel.done, { scope: env.scope, params: successResults });

      expect(createDescriptionSpy).toHaveBeenCalledTimes(1);
      const [, body] = createDescriptionSpy.mock.calls[0]!;
      expect(body).toEqual({
        multisigAccountId: MULTISIG_TOP_ID,
        chainId: polkadotChainId,
        // No decodable inner call on the fake extrinsic — falls back to the
        // submit result's extrinsic hash.
        callHash: '0xfeed',
        blockNumber: 100,
        extrinsicIndex: 2,
        description: 'user note',
      });
      expect(body).not.toHaveProperty('draftId');
    });
  });

  describe('submit gate (dashboard queue preconditions)', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Each missing precondition gates the Submit action',
      });
    });

    // Mirrors DraftsSubsection: `useMultisigByAccountId` keyed lookup + Boolean(account).
    const hasLocalMultisig = (draft: Draft) =>
      env
        .getState(accounts.$list)
        .some((a) => accountUtils.isAnyMultisigAccount(a) && a.accountId === draft.multisigAccountId);

    it('gates with connect-to-submit when there is no active backend session', async () => {
      env = await buildEnv([multisigDirect, signerAccount], (b) => b.withStoreValue(authModel.$authState, null));

      const draft = makeDraft([], { multisigAccountId: MULTISIG_TOP_ID });
      const gate = getDraftSubmitGate(draft, env.getState(authModel.$isAuthenticated), hasLocalMultisig(draft));

      expect(gate).toEqual({ canSubmit: false, reasonKey: 'operations.drafts.connectToSubmit' });
    });

    it('gates with add-call-data when the draft has no call data', async () => {
      env = await buildEnv([multisigDirect, signerAccount], (b) => b.withStoreValue(authModel.$authState, authState));

      const draft = makeDraft([], { multisigAccountId: MULTISIG_TOP_ID, callData: null });
      const gate = getDraftSubmitGate(draft, env.getState(authModel.$isAuthenticated), hasLocalMultisig(draft));

      expect(gate).toEqual({ canSubmit: false, reasonKey: 'dashboard.operationsQueue.submitNeedsCallData' });
    });

    it('gates with submit-unavailable when no local account matches the draft source', async () => {
      // Only a plain signer locally — the draft's multisig lives elsewhere.
      env = await buildEnv([signerAccount], (b) => b.withStoreValue(authModel.$authState, authState));

      const draft = makeDraft([], { multisigAccountId: MULTISIG_TOP_ID });
      const gate = getDraftSubmitGate(draft, env.getState(authModel.$isAuthenticated), hasLocalMultisig(draft));

      expect(gate).toEqual({ canSubmit: false, reasonKey: 'dashboard.operationsQueue.submitUnavailable' });
    });

    it('opens the gate when session, call data and a matching local multisig are all present', async () => {
      env = await buildEnv([multisigDirect, signerAccount], (b) => b.withStoreValue(authModel.$authState, authState));

      const draft = makeDraft([], { multisigAccountId: MULTISIG_TOP_ID });
      const gate = getDraftSubmitGate(draft, env.getState(authModel.$isAuthenticated), hasLocalMultisig(draft));

      expect(gate).toEqual({ canSubmit: true, reasonKey: null });
    });
  });

  describe('drafts path sources (graph-model without restrictToOwn)', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Draft sources come from backend-contact multisigs without own-signer restriction',
      });
    });

    const multisigContact = makeBackendContact(CONTACT_MULTISIG_ID, 'external-multisig', {
      signatories: [EXTERNAL_SIGNER_ID],
      threshold: 1,
    });
    const proxyContact = makeBackendContact(CONTACT_PROXY_ID, 'pure-proxy');
    const plainContact = makeBackendContact(CONTACT_PLAIN_ID, 'plain');

    const proxies: Record<AccountId, ProxyAccount[]> = {
      // Pure-proxy contact delegates to the external multisig — a viable
      // proxied → multisig → signer path.
      [CONTACT_PROXY_ID]: [
        {
          id: 1,
          accountId: CONTACT_MULTISIG_ID,
          proxiedAccountId: CONTACT_PROXY_ID,
          chainId: polkadotChainId,
          proxyType: 'Any',
          delay: 0,
        },
      ],
      // Plain contact delegates to a non-multisig — dead end, must not surface.
      [CONTACT_PLAIN_ID]: [
        {
          id: 2,
          accountId: EXTERNAL_SIGNER_ID,
          proxiedAccountId: CONTACT_PLAIN_ID,
          chainId: polkadotChainId,
          proxyType: 'Any',
          delay: 0,
        },
      ],
    };

    const buildSourcesEnv = () =>
      buildEnv([multisigDirect, signerAccount], (b) =>
        b
          .withStoreValue(contactModel.$backendContacts, [multisigContact, proxyContact, plainContact])
          .withStoreValue(proxyModel.$proxies, proxies),
      );

    it('surfaces contact multisigs, own multisigs and proxied contacts with a reachable multisig delegate', async () => {
      env = await buildSourcesEnv();

      const sources = env.getState($draftModeSources);
      const byId = new Map(sources.map((s) => [s.accountId, s]));

      // Backend-contact multisig surfaces even though the user owns none of
      // its signatories — drafts are proposal flows, someone else may sign.
      expect(byId.get(CONTACT_MULTISIG_ID)).toMatchObject({ isProxy: false });
      // Own multisig account surfaces without a matching contact entry.
      expect(byId.get(MULTISIG_TOP_ID)).toMatchObject({ isProxy: false });
      // Non-multisig contact surfaces as a proxy source only because its
      // delegate is a multisig (hasReachableMultisigDelegate).
      expect(byId.get(CONTACT_PROXY_ID)).toMatchObject({ isProxy: true });
      // Non-multisig contact whose delegate is not a multisig stays out.
      expect(byId.has(CONTACT_PLAIN_ID)).toBe(false);
      expect(sources).toHaveLength(3);
    });

    it('restrictToOwn (non-draft mode) hides sources unreachable from own signers — drafts deliberately skip it', async () => {
      env = await buildSourcesEnv();

      const restricted = env.getState($ownRestrictedSources);
      const restrictedIds = restricted.map((s) => s.accountId);

      // Own multisig reaches the owned signer, the external contact multisig
      // (and the proxy routed through it) do not.
      expect(restrictedIds).toEqual([MULTISIG_TOP_ID]);
    });
  });

  describe('editing after create: late call-data fill', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Drafts',
        feature: 'Submit Draft',
        story: 'Late call-data fill patches only callData',
      });
    });

    // NOTE: the description-only edit is a React handler calling
    // `draftsService.updateDraft(url, id, { description })` directly
    // (features/drafts/components/DraftsSection.tsx:162-180) — UI-only, no
    // Effector model to drive, so it is out of scope here. The model-driven
    // update path is the late call-data fill below, which pins the
    // PATCH-minimality contract ({ callData } only).

    it('patches only callData, adopts the server draft and advances to confirm', async () => {
      seamSpies();
      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_TOP_ID, initiatorAccountId: SIGNER_ID, callData: null },
      );
      const serverDraft: Draft = { ...draft, callData: CALL_DATA, updatedAt: '2026-01-02T00:00:00Z' };
      const updateSpy = vi.spyOn(draftsService, 'updateDraft').mockResolvedValue(serverDraft);

      env = await buildEnv([multisigDirect, signerAccount], (b) =>
        b.withApi(polkadotChainId, fakeApi).withStoreValue(backendConfigurationModel.$backendUrl, BASE_URL),
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigDirect, chain: polkadotChain },
      });
      expect(env.getState(submitDraftModel.$step)).toBe(submitDraftModel.Step.CALL_DATA);

      await allSettled(submitDraftModel.callDataChanged, { scope: env.scope, params: CALL_DATA });
      expect(env.getState(submitDraftModel.$canConfirmCallData)).toBe(true);

      await allSettled(submitDraftModel.callDataConfirmRequested, { scope: env.scope });

      // Exactly `{ callData }` — description, signingPath and initiator are
      // absent from the PATCH body, so the backend keeps the originals.
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(BASE_URL, draft.id, { callData: CALL_DATA });

      // The flow adopts the server-confirmed draft (original description and
      // path intact) and moves on as if call data had never been missing.
      expect(env.getState(submitDraftModel.$draft)).toEqual(serverDraft);
      expect(env.getState(submitDraftModel.$draft)?.description).toBe('draft note');
      expect(env.getState(submitDraftModel.$draft)?.signingPath).toEqual(draft.signingPath);
      expect(env.getState(submitDraftModel.$step)).toBe(submitDraftModel.Step.CONFIRM);
      expect(env.getState($draftUpdatedPayloads)).toEqual([serverDraft]);
    });

    it('blocks confirmation of undecodable call data without touching the backend', async () => {
      const draft = makeDraft(
        [
          { kind: 'multisig', accountId: MULTISIG_TOP_ID },
          { kind: 'signer', accountId: SIGNER_ID },
        ],
        { multisigAccountId: MULTISIG_TOP_ID, initiatorAccountId: SIGNER_ID, callData: null },
      );
      const updateSpy = vi.spyOn(draftsService, 'updateDraft');

      env = await buildEnv([multisigDirect, signerAccount], (b) =>
        b.withApi(polkadotChainId, fakeApi).withStoreValue(backendConfigurationModel.$backendUrl, BASE_URL),
      );

      await allSettled(submitDraftModel.flowStarted, {
        scope: env.scope,
        params: { draft, initiator: multisigDirect, chain: polkadotChain },
      });

      await allSettled(submitDraftModel.callDataChanged, { scope: env.scope, params: 'not-hex' });
      expect(env.getState(submitDraftModel.$pendingCallDataError)).toBe(true);
      expect(env.getState(submitDraftModel.$canConfirmCallData)).toBe(false);

      await allSettled(submitDraftModel.callDataConfirmRequested, { scope: env.scope });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(env.getState(submitDraftModel.$step)).toBe(submitDraftModel.Step.CALL_DATA);
    });
  });
});
