import { allSettled, scopeBind } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type BackendContact, type LocalContact } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { HttpError, backendAuthService, backendContactsService } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
// Deep model imports (not the feature barrels) keep the eager module graph small
// while still registering the cross-model samples these tests pin down.
import { backendContactsModel } from '@/features/contacts/BackendContacts/model/backend-contacts-model';
import { contactSourceModel } from '@/features/contacts/ContactFilter/model/contact-source-model';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

function createBackendContact(overrides: Partial<BackendContact> = {}): BackendContact {
  return {
    id: 'backend-contact',
    source: 'backend',
    name: 'Backend Contact',
    address: toAddress(createAccountId('backend-contact')),
    accountId: createAccountId('backend-contact'),
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
    ...overrides,
  };
}

const backendContacts: BackendContact[] = [
  createBackendContact({ id: 'backend-1', accountId: createAccountId('backend-1') }),
  createBackendContact({ id: 'backend-2', accountId: createAccountId('backend-2') }),
];

const localContactAccountId = createAccountId('local-contact');
const localContact: LocalContact = {
  id: 'local-1',
  source: 'local',
  name: 'Local Contact',
  address: toAddress(localContactAccountId),
  accountId: localContactAccountId,
};

const authState = {
  accountId: createAccountId('authed-account'),
  accountName: 'Authed Account',
  permissions: [] as string[],
};

const baseUrl = 'https://address-book.test';

/**
 * Backend session lifecycle: every disconnect signal (session expiry, sign-out,
 * explicit URL clear, 401 termination, network issue) must wipe the
 * session-scoped backend contacts out of the contact entity, and recovery must
 * refetch them. These tests exercise the REAL cross-model wiring (auth-model →
 * backend-contacts-model → contact-model → contact-source-model) inside a
 * single fork scope — no re-mocked isolation.
 *
 * @group integration
 * @group backend-session
 */
describe('Backend session lifecycle', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (env) {
      await env.cleanup();
    }
  });

  beforeEach(async () => {
    await allureMetadata({
      epic: 'AddressBook',
      feature: 'Backend Session',
      story: 'session lifecycle wipes external contacts',
    });
  });

  it('wipes backend contacts when the session check discovers an expired session', async () => {
    const fetchAllContacts = vi.spyOn(backendContactsService, 'fetchAllContacts').mockResolvedValue(backendContacts);
    vi.spyOn(backendAuthService, 'checkSession').mockResolvedValue(null);

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(contactModel.$localContacts, [localContact])
      .withStoreValue(contactSourceModel.$sourceTab, 'backend')
      .build();

    // Real sign-in propagation: an $authState update captures $lastAuthedAccountId
    // (the expiry heuristic depends on it) and auto-fetches backend contacts.
    await allSettled(authModel.$authState, { scope: env.scope, params: authState });

    expect(fetchAllContacts).toHaveBeenCalledWith(baseUrl);
    expect(env.getState(contactModel.$backendContacts)).toEqual(backendContacts);
    expect(env.getState(contactModel.$contacts)).toEqual([localContact, ...backendContacts]);
    expect(env.getState(connectionHistoryModel.$hasEverConnected)).toBe(true);

    // Expiry heuristic: checkSession returns null while an account was previously
    // authed. scopeBind instead of allSettled — checkSessionFx.done starts the
    // patronum session-health interval whose pending timer never lets allSettled
    // resolve; the wipe chain is pure, so it has settled once the effect resolves.
    await scopeBind(authModel.__test.checkSessionFx, { scope: env.scope })(baseUrl);

    expect(env.getState(authModel.$isSessionExpired)).toBe(true);
    expect(env.getState(contactModel.$backendContacts)).toEqual([]);
    expect(env.getState(contactModel.$contacts)).toEqual([localContact]);
    // The expired-but-connected backend keeps its tab: the user should see the
    // session-expired state there, not silently land on local contacts.
    expect(env.getState(contactSourceModel.$sourceTab)).toBe('backend');
  });

  it('wipes backend contacts and resets the source tab on sign-out', async () => {
    vi.spyOn(backendAuthService, 'logout').mockResolvedValue(undefined);

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(authModel.$authState, authState)
      .withStoreValue(contactModel.$backendContacts, backendContacts)
      .withStoreValue(contactModel.$localContacts, [localContact])
      .withStoreValue(contactSourceModel.$sourceTab, 'backend')
      .build();

    await env.executeEventVoid(authModel.events.signOutClicked);

    expect(env.getState(authModel.$authState)).toBeNull();
    expect(env.getState(contactModel.$backendContacts)).toEqual([]);
    expect(env.getState(contactModel.$contacts)).toEqual([localContact]);
    expect(env.getState(contactSourceModel.$sourceTab)).toBe('local');
    // Sign-out keeps the configured URL — only the session is gone.
    expect(env.getState(backendConfigurationModel.$backendUrl)).toBe(baseUrl);
  });

  it('wipes contacts and forgets connection history on explicit disconnect (urlCleared)', async () => {
    vi.spyOn(backendAuthService, 'logout').mockResolvedValue(undefined);

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(authModel.$authState, authState)
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(contactModel.$backendContacts, backendContacts)
      .withStoreValue(contactSourceModel.$sourceTab, 'backend')
      .withStoreValue(backendContactsModel.$lastSyncTime, 1_700_000_000_000)
      .build();

    await env.executeEventVoid(backendConfigurationModel.events.urlCleared);

    expect(env.getState(backendConfigurationModel.$backendUrl)).toBeNull();
    expect(env.getState(authModel.$authState)).toBeNull();
    expect(env.getState(connectionHistoryModel.$hasEverConnected)).toBe(false);
    expect(env.getState(contactModel.$backendContacts)).toEqual([]);
    expect(env.getState(contactSourceModel.$sourceTab)).toBe('local');
    expect(env.getState(backendContactsModel.$lastSyncTime)).toBeNull();
    expect(env.getState(backendContactsModel.$syncStatus)).toBe('idle');
  });

  it('terminates the session and wipes contacts when the backend answers 401', async () => {
    const fetchAllContacts = vi
      .spyOn(backendContactsService, 'fetchAllContacts')
      .mockRejectedValue(new HttpError(401, 'Unauthorized'));

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(authModel.$authState, authState)
      .withStoreValue(contactModel.$backendContacts, backendContacts)
      .build();

    await env.executeEventVoid(backendContactsModel.events.syncTriggered);

    expect(fetchAllContacts).toHaveBeenCalledWith(baseUrl);
    expect(env.getState(authModel.$isSessionExpired)).toBe(true);
    expect(env.getState(authModel.$isConnectionAlive)).toBe(false);
    expect(env.getState(contactModel.$backendContacts)).toEqual([]);
    expect(env.getState(backendContactsModel.$isHealthy)).toBe(false);
    // The 401 is categorized as 'auth', but the session-expired reaction fires in
    // the same propagation and clears $error — the session-expired UI takes over
    // from the generic error banner.
    expect(env.getState(backendContactsModel.$error)).toBeNull();
    expect(env.getState(backendContactsModel.$syncStatus)).toBe('idle');
  });

  it('reports forbidden and wipes cached contacts when the backend answers 403', async () => {
    const fetchAllContacts = vi
      .spyOn(backendContactsService, 'fetchAllContacts')
      .mockRejectedValue(new HttpError(403, 'Forbidden'));

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(authModel.$authState, authState)
      .withStoreValue(contactModel.$backendContacts, backendContacts)
      .build();

    await env.executeEventVoid(backendContactsModel.events.syncTriggered);

    expect(fetchAllContacts).toHaveBeenCalledWith(baseUrl);
    expect(env.getState(backendContactsModel.$error)?.category).toBe('forbidden');
    // Forbidden title is self-contained — raw HTTP body must not leak into UI.
    expect(env.getState(backendContactsModel.$error)?.message).toBeUndefined();
    // 403 does NOT terminate the session…
    expect(env.getState(authModel.$isSessionExpired)).toBe(false);
    // …but every fetch failure wipes the cached backend contacts (failData is in
    // the disconnect clock list), so stale data is never shown next to an error.
    expect(env.getState(contactModel.$backendContacts)).toEqual([]);
    expect(env.getState(backendContactsModel.$syncStatus)).toBe('error');
    expect(env.getState(backendContactsModel.$isHealthy)).toBe(false);
  });

  it('refetches contacts when a network issue clears while still authenticated', async () => {
    const fetchAllContacts = vi.spyOn(backendContactsService, 'fetchAllContacts').mockResolvedValue(backendContacts);
    const checkSession = vi.spyOn(backendAuthService, 'checkSession').mockRejectedValue(new Error('offline'));

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(authModel.$authState, authState)
      .withStoreValue(contactModel.$backendContacts, backendContacts)
      .build();

    // No allSettled from here on: both checkSessionFx.done and .fail start the
    // patronum session-health interval, which keeps a timer effect pending.
    const runSessionCheck = scopeBind(authModel.__test.checkSessionFx, { scope: env.scope });

    await expect(runSessionCheck(baseUrl)).rejects.toThrow('offline');

    expect(env.getState(authModel.$hasNetworkIssue)).toBe(true);
    expect(env.getState(contactModel.$backendContacts)).toEqual([]);
    expect(fetchAllContacts).not.toHaveBeenCalled();

    // Recovery: a session check that succeeds clears the issue and refetches.
    checkSession.mockResolvedValue({ accountId: authState.accountId, permissions: [] });
    await runSessionCheck(baseUrl);

    expect(env.getState(authModel.$hasNetworkIssue)).toBe(false);
    expect(fetchAllContacts).toHaveBeenCalledWith(baseUrl);
    await env.waitForState(contactModel.$backendContacts, (contacts) => contacts.length === backendContacts.length);
    expect(env.getState(contactModel.$backendContacts)).toEqual(backendContacts);
  });
});
