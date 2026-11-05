import { hexToU8a, u8aConcat, u8aToString } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearCsrfToken } from '@/shared/api/backend-fetch';
import { type HexString, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, createVaultBaseAccount } from '@/shared/mocks';
import { draftsService } from '@/domains/backend';
import { type UniversalAccount, accounts } from '@/domains/network';
import { SUBSTRATE_ID, createMessageSignPayload } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { messageSignModel } from '@/features/operations/OperationMessageSign';
// The extension gate is opened by the ExtensionMessageSign component; the test opens it the
// same way so the real signRaw effect (talisman connect wrapper → injected extension) runs.
import { extensionMessageSign } from '@/features/operations/OperationMessageSign/model/extension-message-sign';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

const BACKEND_URL = 'https://ab.example.com';
const NONCE = `0x${'ab'.repeat(32)}`;
const SIGNATURE: HexString = `0x${'cd'.repeat(64)}`;
const CHALLENGE_ID = 'challenge-1';
const CSRF_TOKEN = 'csrf-after-verify';

const V2_MESSAGE = `<Bytes>ADDRESS_BOOK_AUTH v2\norigin: ${BACKEND_URL}\nnonce: ${NONCE}</Bytes>`;
const V1_MESSAGE = `<Bytes>ADDRESS_BOOK_AUTH:${NONCE}</Bytes>`;

// --- Signers -----------------------------------------------------------------

type ExtensionSignerAccount = UniversalAccount & { accountType: 'extension'; extension: 'polkadot-js' };

const extensionWallet = { id: 7, name: 'Polkadot.js', type: WalletType.POLKADOT_EXTENSION };
const extensionAccountId = createAccountId('extension-signer');
const extensionAccount: ExtensionSignerAccount = {
  id: 'extension-account',
  type: 'universal',
  accountType: 'extension',
  extension: 'polkadot-js',
  name: 'Extension Account',
  walletId: extensionWallet.id,
  accountId: extensionAccountId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.EXTENSION,
  createdAt: 0,
};

const vaultWallet = { id: 1, name: 'Vault', type: WalletType.SINGLE_PARITY_SIGNER };
const vaultAccountId = createAccountId('vault-signer');
const vaultAccount = createVaultBaseAccount('vault', {
  walletId: vaultWallet.id,
  accountId: vaultAccountId,
  name: 'Vault Account',
});

type SignRawRequest = { address: string; data: HexString; type: 'bytes' };

/**
 * Fake injected extension at the boundary the talisman connect wrapper reads
 * (`window.injectedWeb3`). Records every signRaw request it receives.
 */
function installFakeExtension() {
  const signRaw = vi.fn(async (_request: SignRawRequest) => ({ id: 1, signature: SIGNATURE }));

  Object.assign(window, {
    injectedWeb3: {
      'polkadot-js': {
        version: '0.47.0',
        enable: async () => ({
          signer: { signRaw },
          accounts: { get: async () => [], subscribe: () => () => undefined },
        }),
      },
    },
  });

  return signRaw;
}

function removeFakeExtension() {
  Reflect.deleteProperty(window, 'injectedWeb3');
}

// --- Backend -----------------------------------------------------------------

type BackendRequest = { method: string; headers: Record<string, string>; body: unknown };
type RouteReply = { status: number; body: unknown; headers?: Record<string, string> };
type Routes = Record<string, (request: BackendRequest) => RouteReply>;

function readHeaders(init: RequestInit | undefined): Record<string, string> {
  const headers = init?.headers;

  return headers && typeof headers === 'object' && !Array.isArray(headers) && !(headers instanceof Headers)
    ? { ...headers }
    : {};
}

/**
 * Stubs `globalThis.fetch` (the web build's HTTP seam) with a tiny router keyed
 * by pathname and records every request so the test can assert what the real
 * auth service put on the wire.
 */
function stubBackend(routes: Routes) {
  const requests: Record<string, BackendRequest[]> = {};

  const fetchMock = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    const path = new URL(url).pathname;
    const route = routes[path];
    if (!route) {
      throw new Error(`Unexpected backend request: ${init?.method ?? 'GET'} ${url}`);
    }

    const request: BackendRequest = {
      method: init?.method ?? 'GET',
      headers: readHeaders(init),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    };
    (requests[path] ??= []).push(request);

    const reply = route(request);

    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: reply.headers ?? {} });
  });

  vi.stubGlobal('fetch', fetchMock);

  return { fetchMock, requests };
}

function challengeRoutes(challenge: Record<string, unknown>, verify?: Routes[string]): Routes {
  return {
    // Saving the backend URL fires the one-time session recovery check — no session yet.
    '/auth/me': () => ({ status: 401, body: { message: 'Unauthorized' } }),
    '/auth/challenge': () => ({ status: 200, body: { challengeId: CHALLENGE_ID, expiresAt: 1, ...challenge } }),
    '/auth/verify':
      verify ??
      (() => ({ status: 200, body: { permissions: ['contacts:read'] }, headers: { 'x-csrf-token': CSRF_TOKEN } })),
  };
}

// --- Flow helpers ------------------------------------------------------------

type Signer = { wallet: { id: number; name: string; type: WalletType }; account: UniversalAccount };

async function buildEnvironment(signer: Signer) {
  return new FeatureTestBuilder({ autoPopulate: false })
    .withStoreValue(walletModel.__test.$rawWallets, [signer.wallet])
    .withStoreValue(accounts.__test.$list, [signer.account])
    .withStoreValue(authModel.$selectedAccountId, signer.account.accountId)
    .withStoreValue(backendConfigurationModel.$draftUrl, `${BACKEND_URL}/`)
    .build();
}

/**
 * Connect → challenge → message handed to the signing flow. No `await
 * allSettled`: the session check that follows the URL save starts the patronum
 * health-check interval, whose pending timer never lets the scope settle.
 */
async function connectAndWaitForMessage(env: FeatureTestEnvironment) {
  void allSettled(authModel.events.connectTriggered, { scope: env.scope });

  const signStore = await env.waitForState(messageSignModel.$signStore, (store) => store !== null);

  return signStore!;
}

/** What ExtensionMessageSign does on mount: opens the gate with the payload. */
async function signWithExtension(
  env: FeatureTestEnvironment,
  payload: NonNullable<typeof messageSignModel.$signStore.defaultState>,
) {
  void allSettled(extensionMessageSign.flow.open, { scope: env.scope, params: { payload } });

  return env.waitForState(extensionMessageSign.$signature, (signature) => signature !== null);
}

/** What OperationMessageSign does with a signature from either signer. */
function submitSignature(env: FeatureTestEnvironment, signature: HexString, accountId: Signer['account']['accountId']) {
  void allSettled(messageSignModel.signed, { scope: env.scope, params: { signature, accountId } });
}

function decodeSignRawData(request: SignRawRequest): string {
  return u8aToString(hexToU8a(request.data));
}

/**
 * Sign-in message handed to the signer and verified against the backend. The
 * whole chain is real — auth-model → auth service → authFetch → `fetch`, and
 * messageSignModel → extension signRaw effect → injected extension; only the
 * HTTP seam and the injected extension are faked.
 *
 * @group integration
 * @group backend-session
 */
describe('Backend sign-in message', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'AddressBook',
      feature: 'Backend Session',
      story: 'sign-in message versions',
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    removeFakeExtension();
    clearCsrfToken();
    if (env) {
      await env.cleanup();
    }
  });

  describe('extension signer', () => {
    it('SP-69: signs the origin-bound v2 message with the extension and verifies the session', async () => {
      const signRaw = installFakeExtension();
      const { requests } = stubBackend(challengeRoutes({ nonce: NONCE, messageVersion: 2 }));
      env = await buildEnvironment({ wallet: extensionWallet, account: extensionAccount });

      const payload = await connectAndWaitForMessage(env);

      expect(requests['/auth/challenge']).toEqual([
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { accountId: extensionAccountId } },
      ]);
      expect(env.getState(backendConfigurationModel.$backendUrl)).toBe(BACKEND_URL);
      expect(env.getState(authModel.$authStep)).toBe('signing');

      const signature = await signWithExtension(env, payload);

      expect(signRaw).toHaveBeenCalledTimes(1);
      const signRequest = signRaw.mock.calls[0]![0];
      expect(signRequest.type).toBe('bytes');
      expect(signRequest.address).toBe(toAddress(extensionAccountId));
      expect(decodeSignRawData(signRequest)).toBe(V2_MESSAGE);
      expect(signature).toBe(SIGNATURE);

      submitSignature(env, signature!, extensionAccountId);
      await env.waitForState(authModel.$isAuthenticated, (authenticated) => authenticated);

      // The verify body carries the signature over the challenge the backend issued; the
      // message version is never sent back — the backend already knows what it advertised.
      expect(requests['/auth/verify']).toEqual([
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { accountId: extensionAccountId, challengeId: CHALLENGE_ID, signature: SIGNATURE },
        },
      ]);
      expect(env.getState(authModel.$authState)).toEqual({
        accountId: extensionAccountId,
        accountName: 'Extension Account',
        permissions: ['contacts:read'],
      });
      expect(env.getState(authModel.$connectionResult)).toEqual({ status: 'success' });
      expect(env.getState(authModel.$isSessionExpired)).toBe(false);
      expect(env.getState(authModel.$error)).toBeNull();
    });

    it.each([
      ['uppercase hex', `0x${'AB'.repeat(32)}`],
      ['63 hex chars', `0x${'ab'.repeat(31)}a`],
      ['missing 0x prefix', 'ab'.repeat(32)],
    ])('SP-69: refuses a malformed nonce before signing (%s)', async (_label, nonce) => {
      const signRaw = installFakeExtension();
      const { requests } = stubBackend(challengeRoutes({ nonce, messageVersion: 2 }));
      env = await buildEnvironment({ wallet: extensionWallet, account: extensionAccount });

      void allSettled(authModel.events.connectTriggered, { scope: env.scope });
      await env.waitForState(authModel.$authStep, (step) => step === 'error');

      expect(requests['/auth/challenge']).toHaveLength(1);
      expect(requests['/auth/verify']).toBeUndefined();
      // Nothing reached the signing flow, so no signer was ever asked to sign.
      expect(env.getState(messageSignModel.$signStore)).toBeNull();
      expect(signRaw).not.toHaveBeenCalled();
      expect(env.getState(authModel.$error)).toEqual(expect.any(String));
      expect(env.getState(authModel.$connectionResult)).toMatchObject({ status: 'error' });
      expect(env.getState(authModel.$isAuthenticated)).toBe(false);
    });

    it.each([
      ['absent', {}],
      ['1', { messageVersion: 1 }],
      ['3 (unknown to this client)', { messageVersion: 3 }],
    ])('SP-71: signs the v1 message when the challenge messageVersion is %s', async (_label, version) => {
      const signRaw = installFakeExtension();
      const { requests } = stubBackend(challengeRoutes({ nonce: NONCE, ...version }));
      env = await buildEnvironment({ wallet: extensionWallet, account: extensionAccount });

      const payload = await connectAndWaitForMessage(env);
      expect(new TextDecoder().decode(payload.message)).toBe(V1_MESSAGE);

      const signature = await signWithExtension(env, payload);

      expect(signRaw).toHaveBeenCalledTimes(1);
      expect(decodeSignRawData(signRaw.mock.calls[0]![0])).toBe(V1_MESSAGE);

      submitSignature(env, signature!, extensionAccountId);
      await env.waitForState(authModel.$isAuthenticated, (authenticated) => authenticated);

      expect(requests['/auth/verify']![0]!.body).toEqual({
        accountId: extensionAccountId,
        challengeId: CHALLENGE_ID,
        signature: SIGNATURE,
      });
    });

    it('SP-72: moves to the error step with the backend message when verify answers 401', async () => {
      installFakeExtension();
      const { requests } = stubBackend(
        challengeRoutes({ nonce: NONCE, messageVersion: 2 }, () => ({
          status: 401,
          body: { message: 'Signature origin is not allowed' },
        })),
      );
      env = await buildEnvironment({ wallet: extensionWallet, account: extensionAccount });

      const payload = await connectAndWaitForMessage(env);
      const signature = await signWithExtension(env, payload);
      submitSignature(env, signature!, extensionAccountId);

      await env.waitForState(authModel.$authStep, (step) => step === 'error');

      expect(requests['/auth/verify']).toHaveLength(1);
      expect(env.getState(authModel.$error)).toBe('Signature origin is not allowed');
      expect(env.getState(authModel.$connectionResult)).toEqual({
        status: 'error',
        message: 'Signature origin is not allowed',
      });
      expect(env.getState(authModel.$authState)).toBeNull();
      expect(env.getState(authModel.$isAuthenticated)).toBe(false);
      expect(env.getState(authModel.$isConnectionAlive)).toBe(false);
    });

    it('SP-68: a mutation sent after sign-in carries the CSRF token issued at verify', async () => {
      installFakeExtension();
      const draft = {
        id: 'draft-1',
        operation: null,
        multisigAccountId: null,
        chainId: '0x01',
        callData: null,
        description: 'test',
        createdBy: extensionAccountId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const { requests } = stubBackend({
        ...challengeRoutes({ nonce: NONCE, messageVersion: 2 }),
        '/draft-operations': () => ({ status: 201, body: draft }),
      });
      env = await buildEnvironment({ wallet: extensionWallet, account: extensionAccount });

      const payload = await connectAndWaitForMessage(env);
      const signature = await signWithExtension(env, payload);
      submitSignature(env, signature!, extensionAccountId);
      await env.waitForState(authModel.$isAuthenticated, (authenticated) => authenticated);

      // Pre-session requests had no token to send.
      expect(requests['/auth/challenge']![0]!.headers['X-CSRF-Token']).toBeUndefined();
      expect(requests['/auth/verify']![0]!.headers['X-CSRF-Token']).toBeUndefined();

      await draftsService.createDraft(BACKEND_URL, { chainId: '0x01', description: 'test' });

      expect(requests['/draft-operations']).toEqual([
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF_TOKEN },
          body: { chainId: '0x01', description: 'test' },
        },
      ]);
    });
  });

  describe('Polkadot Vault signer', () => {
    it('SP-70: puts the v2 message text into the QR payload and verifies the scanned signature', async () => {
      const { requests } = stubBackend(challengeRoutes({ nonce: NONCE, messageVersion: 2 }));
      env = await buildEnvironment({ wallet: vaultWallet, account: vaultAccount });

      const payload = await connectAndWaitForMessage(env);

      expect(payload.signatory).toEqual(vaultAccount);
      expect(payload.chainId).toBe(env.getState(authModel.$selectedChainId));
      expect(new TextDecoder().decode(payload.message)).toBe(V2_MESSAGE);

      // QR payload exactly as VaultMessageSign builds it for the QrTxGenerator.
      const address = toAddress(payload.signatory.accountId);
      const qrPayload = u8aConcat(
        SUBSTRATE_ID,
        createMessageSignPayload(address, payload.message, payload.chainId!, payload.signatory.cryptoType),
      );

      const publicKey = decodeAddress(address);
      const genesisHash = hexToU8a(payload.chainId!);
      // [substrate id][multisigner][command: message][public key][message][genesis hash]
      const messageStart = SUBSTRATE_ID.length + 2 + publicKey.length;
      const messageEnd = qrPayload.length - genesisHash.length;

      expect(qrPayload.subarray(0, SUBSTRATE_ID.length)).toEqual(SUBSTRATE_ID);
      expect(qrPayload[SUBSTRATE_ID.length + 1]).toBe(0x03);
      expect(qrPayload.subarray(SUBSTRATE_ID.length + 2, messageStart)).toEqual(publicKey);
      expect(u8aToString(qrPayload.subarray(messageStart, messageEnd))).toBe(V2_MESSAGE);
      expect(qrPayload.subarray(messageEnd)).toEqual(genesisHash);

      // The Vault returns a signature over those bytes through the QR reader.
      submitSignature(env, SIGNATURE, vaultAccountId);
      await env.waitForState(authModel.$isAuthenticated, (authenticated) => authenticated);

      expect(requests['/auth/verify']![0]!.body).toEqual({
        accountId: vaultAccountId,
        challengeId: CHALLENGE_ID,
        signature: SIGNATURE,
      });
      expect(env.getState(authModel.$authState)).toMatchObject({
        accountId: vaultAccountId,
        accountName: 'Vault Account',
      });
    });
  });
});
