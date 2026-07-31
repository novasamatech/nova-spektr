import { allSettled, createWatch, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ChainId, type VaultBaseAccount, AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { backendAuthService } from '@/domains/backend';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { messageSignModel } from '@/features/operations/OperationMessageSign';
import { DEFAULT_AUTH_CHAIN_ID } from '../../lib/auth-chain';
import { authModel } from '../auth-model';
import { backendConfigurationModel } from '../backend-configuration-model';

const KUSAMA: ChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

const BACKEND_URL = 'https://backend.test';

const vaultWallet = { id: 1, type: WalletType.SINGLE_PARITY_SIGNER, name: 'Vault' };

const createVaultAccount = (id: string, accountId: AccountId): VaultBaseAccount => ({
  id,
  type: 'universal',
  accountType: AccountType.BASE,
  name: `Account ${id}`,
  walletId: 1,
  accountId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
});

describe('authModel — chain selector', () => {
  it('defaults $selectedChainId to Polkadot relay chain', () => {
    const scope = fork();
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('chainSelected updates $selectedChainId', async () => {
    const scope = fork();
    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('resets $selectedChainId to default on modalClosed', async () => {
    const scope = fork({ values: [[authModel.$selectedChainId, KUSAMA]] });
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);

    await allSettled(authModel.events.modalClosed, { scope });
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('resets $selectedChainId to default on urlCleared', async () => {
    const scope = fork({ values: [[authModel.$selectedChainId, KUSAMA]] });
    await allSettled(backendConfigurationModel.events.urlCleared, { scope });
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('forwards chain changes to messageSignModel.chainIdChanged while in signing step', async () => {
    const scope = fork({ values: [[authModel.$authStep, 'signing']] });

    const spy = vi.fn();
    createWatch({ unit: messageSignModel.chainIdChanged, fn: spy, scope });

    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(KUSAMA);
  });

  it('does not forward chain changes when not in signing step', async () => {
    const scope = fork({ values: [[authModel.$authStep, 'selectAccount']] });

    const spy = vi.fn();
    createWatch({ unit: messageSignModel.chainIdChanged, fn: spy, scope });

    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('authModel — persisted default chain', () => {
  it('resets $selectedChainId to the persisted default instead of Polkadot relay', async () => {
    const scope = fork({ values: [[authModel.__test.$defaultAuthChainId, KUSAMA]] });

    await allSettled(authModel.events.modalClosed, { scope });

    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('saves the chain used for a successful sign-in as the new default', async () => {
    const scope = fork({
      values: [[authModel.$selectedChainId, KUSAMA]],
      handlers: [[authModel.__test.verifySignatureFx, () => ({ permissions: [] })]],
    });

    // sessionHealthCheck (5 min interval) starts on verifySignatureFx.done and keeps the
    // scope busy, so allSettled never resolves — poll the store instead of awaiting it.
    void allSettled(authModel.__test.verifySignatureFx, {
      scope,
      params: { baseUrl: BACKEND_URL, accountId: '0x00', challengeId: 'challenge', signature: '0x01' },
    });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.__test.$defaultAuthChainId)).toBe(KUSAMA);
    });
    // The post-connect reset preselects the freshly saved default for the next session.
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('falls back to Polkadot relay when the saved chain is missing from the chains config', async () => {
    const scope = fork({
      values: [
        [authModel.__test.$defaultAuthChainId, KUSAMA],
        [networkModel.$chains, { [polkadotChain.chainId]: polkadotChain }],
      ],
    });

    await allSettled(authModel.events.modalClosed, { scope });

    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('keeps the default chain after sign-out', async () => {
    const scope = fork({
      values: [[authModel.__test.$defaultAuthChainId, KUSAMA]],
      handlers: [[authModel.__test.logoutFx, () => undefined]],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(authModel.__test.$defaultAuthChainId)).toBe(KUSAMA);
  });
});

describe('authModel — persisted default account', () => {
  const createScopeWithAccounts = (defaultAccountId: AccountId) => {
    return fork({
      values: [
        [walletModel.__test.$rawWallets, [vaultWallet]],
        [accounts.__test.$list, [createVaultAccount('1', TEST_ACCOUNTS[0]), createVaultAccount('2', TEST_ACCOUNTS[1])]],
        [authModel.__test.$defaultAuthAccountId, defaultAccountId],
      ],
    });
  };

  it('preselects the persisted default account on modal open', async () => {
    const scope = createScopeWithAccounts(TEST_ACCOUNTS[1]);

    await allSettled(backendConfigurationModel.events.modalOpened, { scope });

    expect(scope.getState(authModel.$selectedAccountId)).toBe(TEST_ACCOUNTS[1]);
  });

  it('falls back to the first account when the saved account is gone', async () => {
    const scope = createScopeWithAccounts(TEST_ACCOUNTS[2]);

    await allSettled(backendConfigurationModel.events.modalOpened, { scope });

    expect(scope.getState(authModel.$selectedAccountId)).toBe(TEST_ACCOUNTS[0]);
  });

  it('saves the account used for a successful sign-in as the new default', async () => {
    const scope = fork({
      values: [[authModel.$selectedAccountId, TEST_ACCOUNTS[1]]],
      handlers: [[authModel.__test.verifySignatureFx, () => ({ permissions: [] })]],
    });

    // sessionHealthCheck (5 min interval) starts on verifySignatureFx.done and keeps the
    // scope busy, so allSettled never resolves — poll the store instead of awaiting it.
    void allSettled(authModel.__test.verifySignatureFx, {
      scope,
      params: { baseUrl: BACKEND_URL, accountId: '0x00', challengeId: 'challenge', signature: '0x01' },
    });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.__test.$defaultAuthAccountId)).toBe(TEST_ACCOUNTS[1]);
    });
  });

  it('keeps the default account after sign-out', async () => {
    const scope = fork({
      values: [
        [authModel.__test.$defaultAuthAccountId, TEST_ACCOUNTS[0]],
        [backendConfigurationModel.$backendUrl, BACKEND_URL],
      ],
      handlers: [[authModel.__test.logoutFx, () => undefined]],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(authModel.__test.$defaultAuthAccountId)).toBe(TEST_ACCOUNTS[0]);
  });
});

describe('authModel — login flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const CHALLENGE = { challengeId: 'challenge-1', nonce: 'nonce-1', expiresAt: 1_000_000 };

  it('completes the happy path: connect → challenge → sign → verified session', async () => {
    const challengeSpy = vi.spyOn(backendAuthService, 'requestChallenge').mockResolvedValue(CHALLENGE);
    const verifyHandler = vi.fn().mockResolvedValue({ permissions: ['contacts:read'] });

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [vaultWallet]],
        [accounts.__test.$list, [createVaultAccount('1', TEST_ACCOUNTS[0])]],
        [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
        [backendConfigurationModel.$draftUrl, 'https://backend.test/'],
      ],
      handlers: [
        [authModel.__test.verifySignatureFx, verifyHandler],
        // Saving $backendUrl fires a one-time session recovery check — keep it off the network.
        [authModel.__test.checkSessionFx, () => null],
      ],
    });

    const signInSucceededSpy = vi.fn();
    createWatch({ unit: authModel.events.signInSucceeded, fn: signInSucceededSpy, scope });

    // checkSessionFx.done starts the 5-minute health-check interval and keeps the scope busy,
    // so allSettled never resolves — poll the stores instead of awaiting it.
    void allSettled(authModel.events.connectTriggered, { scope });

    await vi.waitFor(() => {
      expect(challengeSpy).toHaveBeenCalledWith(BACKEND_URL, TEST_ACCOUNTS[0]);
    });
    // The draft URL is normalized (trailing slash trimmed) and saved as the backend URL.
    expect(scope.getState(backendConfigurationModel.$backendUrl)).toBe(BACKEND_URL);
    expect(scope.getState(authModel.$authStep)).toBe('signing');

    // Challenge response reached the signing flow.
    await vi.waitFor(() => {
      expect(scope.getState(messageSignModel.$signStore)).not.toBeNull();
    });

    void allSettled(messageSignModel.signed, {
      scope,
      params: { signature: '0x01', accountId: TEST_ACCOUNTS[0] },
    });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.$isAuthenticated)).toBe(true);
    });
    expect(verifyHandler).toHaveBeenCalledWith({
      baseUrl: BACKEND_URL,
      accountId: TEST_ACCOUNTS[0],
      challengeId: 'challenge-1',
      signature: '0x01',
    });
    expect(scope.getState(authModel.$authState)).toEqual({
      accountId: TEST_ACCOUNTS[0],
      accountName: 'Account 1',
      permissions: ['contacts:read'],
    });
    expect(scope.getState(authModel.$isSessionExpired)).toBe(false);
    expect(signInSucceededSpy).toHaveBeenCalledTimes(1);
  });

  it('moves to the error step when the challenge request fails', async () => {
    vi.spyOn(backendAuthService, 'requestChallenge').mockRejectedValue(new Error('Challenge request failed'));

    const scope = fork({
      values: [
        [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
        [backendConfigurationModel.$draftUrl, BACKEND_URL],
      ],
      handlers: [[authModel.__test.checkSessionFx, () => null]],
    });

    void allSettled(authModel.events.connectTriggered, { scope });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.$authStep)).toBe('error');
    });
    expect(scope.getState(authModel.$error)).toBe('Challenge request failed');
    expect(scope.getState(authModel.$connectionResult)).toEqual({
      status: 'error',
      message: 'Challenge request failed',
    });
    expect(scope.getState(authModel.$isAuthenticated)).toBe(false);
  });

  it('moves to the error step with the backend message when verification is denied', async () => {
    vi.spyOn(backendAuthService, 'requestChallenge').mockResolvedValue(CHALLENGE);

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [vaultWallet]],
        [accounts.__test.$list, [createVaultAccount('1', TEST_ACCOUNTS[0])]],
        [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
        [backendConfigurationModel.$draftUrl, BACKEND_URL],
      ],
      handlers: [
        [authModel.__test.verifySignatureFx, vi.fn().mockRejectedValue(new Error('User is blocked'))],
        [authModel.__test.checkSessionFx, () => null],
      ],
    });

    void allSettled(authModel.events.connectTriggered, { scope });

    // Wait for the challenge response to settle ($challengeId is set in the same tick).
    await vi.waitFor(() => {
      expect(scope.getState(messageSignModel.$signStore)).not.toBeNull();
    });

    void allSettled(messageSignModel.signed, {
      scope,
      params: { signature: '0x01', accountId: TEST_ACCOUNTS[0] },
    });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.$authStep)).toBe('error');
    });
    expect(scope.getState(authModel.$error)).toBe('User is blocked');
    expect(scope.getState(authModel.$isAuthenticated)).toBe(false);
  });
});

describe('authModel — session lifecycle', () => {
  it('signOutClicked calls logout and clears the auth state', async () => {
    const logoutHandler = vi.fn();
    const scope = fork({
      values: [
        [backendConfigurationModel.$backendUrl, BACKEND_URL],
        [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Account 1', permissions: [] }],
      ],
      handlers: [[authModel.__test.logoutFx, logoutHandler]],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(logoutHandler).toHaveBeenCalledWith(BACKEND_URL);
    expect(scope.getState(authModel.$authState)).toBeNull();
    expect(scope.getState(authModel.$isAuthenticated)).toBe(false);
  });

  it('flags an expired session when the check returns null after a successful sign-in', async () => {
    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [vaultWallet]],
        [accounts.__test.$list, [createVaultAccount('1', TEST_ACCOUNTS[0])]],
        [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      ],
      handlers: [
        [authModel.__test.verifySignatureFx, () => ({ permissions: [] })],
        [authModel.__test.checkSessionFx, () => null],
      ],
    });

    // Sign in first so $lastAuthedAccountId is populated — the expiry heuristic reads it.
    void allSettled(authModel.__test.verifySignatureFx, {
      scope,
      params: { baseUrl: BACKEND_URL, accountId: TEST_ACCOUNTS[0], challengeId: 'challenge', signature: '0x01' },
    });
    await vi.waitFor(() => {
      expect(scope.getState(authModel.$isAuthenticated)).toBe(true);
    });
    expect(scope.getState(authModel.$isSessionExpired)).toBe(false);

    void allSettled(authModel.__test.checkSessionFx, { scope, params: BACKEND_URL });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.$isSessionExpired)).toBe(true);
    });
  });

  it('does not flag expiry when no account was signed in before', async () => {
    const doneSpy = vi.fn();
    const scope = fork({ handlers: [[authModel.__test.checkSessionFx, () => null]] });
    createWatch({ unit: authModel.__test.checkSessionFx.done, fn: doneSpy, scope });

    void allSettled(authModel.__test.checkSessionFx, { scope, params: BACKEND_URL });

    await vi.waitFor(() => {
      expect(doneSpy).toHaveBeenCalledTimes(1);
    });
    expect(scope.getState(authModel.$isSessionExpired)).toBe(false);
  });

  it('unauthorizedResponseReceived flags expiry; a later verify success resets it', async () => {
    const scope = fork({ handlers: [[authModel.__test.verifySignatureFx, () => ({ permissions: [] })]] });

    await allSettled(authModel.events.unauthorizedResponseReceived, { scope });
    expect(scope.getState(authModel.$isSessionExpired)).toBe(true);

    void allSettled(authModel.__test.verifySignatureFx, {
      scope,
      params: { baseUrl: BACKEND_URL, accountId: TEST_ACCOUNTS[0], challengeId: 'challenge', signature: '0x01' },
    });
    await vi.waitFor(() => {
      expect(scope.getState(authModel.$isSessionExpired)).toBe(false);
    });
  });

  it('session check failure raises the network issue flag; the next success clears it', async () => {
    const checkHandler = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null);
    const scope = fork({ handlers: [[authModel.__test.checkSessionFx, checkHandler]] });

    void allSettled(authModel.__test.checkSessionFx, { scope, params: BACKEND_URL });
    await vi.waitFor(() => {
      expect(scope.getState(authModel.$hasNetworkIssue)).toBe(true);
    });
    // A failed check is a connectivity problem, not session expiry.
    expect(scope.getState(authModel.$isSessionExpired)).toBe(false);

    void allSettled(authModel.__test.checkSessionFx, { scope, params: BACKEND_URL });
    await vi.waitFor(() => {
      expect(scope.getState(authModel.$hasNetworkIssue)).toBe(false);
    });
  });
});

describe('authModel — connection liveness', () => {
  const AUTH_STATE = { accountId: TEST_ACCOUNTS[0], accountName: 'Account 1', permissions: [] };

  it('is alive when url and auth are present without expiry or network issues', () => {
    const scope = fork({
      values: [
        [backendConfigurationModel.$backendUrl, BACKEND_URL],
        [authModel.$authState, AUTH_STATE],
      ],
    });

    expect(scope.getState(authModel.$isConnectionAlive)).toBe(true);
  });

  it('is dead when the session expired', () => {
    const scope = fork({
      values: [
        [backendConfigurationModel.$backendUrl, BACKEND_URL],
        [authModel.$authState, AUTH_STATE],
        [authModel.$isSessionExpired, true],
      ],
    });

    expect(scope.getState(authModel.$isConnectionAlive)).toBe(false);
  });

  it('is dead when a network issue is flagged', () => {
    const scope = fork({
      values: [
        [backendConfigurationModel.$backendUrl, BACKEND_URL],
        [authModel.$authState, AUTH_STATE],
        [authModel.$hasNetworkIssue, true],
      ],
    });

    expect(scope.getState(authModel.$isConnectionAlive)).toBe(false);
  });

  it('is dead when not authenticated', () => {
    const scope = fork({ values: [[backendConfigurationModel.$backendUrl, BACKEND_URL]] });

    expect(scope.getState(authModel.$isConnectionAlive)).toBe(false);
  });

  it('is dead without a backend url', () => {
    const scope = fork({ values: [[authModel.$authState, AUTH_STATE]] });

    expect(scope.getState(authModel.$isConnectionAlive)).toBe(false);
  });
});
