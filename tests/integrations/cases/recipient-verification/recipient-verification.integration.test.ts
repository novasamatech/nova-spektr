import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type BackendContact, type LocalContact } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import { senderAccount } from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

function createBackendContact(overrides: Partial<BackendContact> = {}): BackendContact {
  return {
    id: 'backend-contact',
    source: 'backend',
    name: 'Known Contact',
    address: toAddress(createAccountId('known-contact')),
    accountId: createAccountId('known-contact'),
    chainId: null,
    chainName: null,
    derivationPath: null,
    ownerAccountId: null,
    signatories: null,
    threshold: null,
    fields: [],
    ...overrides,
  };
}

/**
 * Recipient-verification aggregate: derives a verification mode from backend
 * auth/connection health, and resolves per-recipient warnings against the
 * known-accounts set (address-book contacts + the user's own wallet accounts).
 *
 * @group integration
 * @group recipient-verification
 */
describe('Recipient Verification', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  beforeEach(async () => {
    await allureMetadata({
      epic: 'AddressBook',
      feature: 'Recipient Verification',
      story: 'mode + warning resolution',
    });
  });

  const strangerId = createAccountId('stranger');

  it('is off and never warns when the backend was never connected', async () => {
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, false)
      .withStoreValue(authModel.$authState, null)
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('off');

    const resolveWarning = env.getState(recipientVerificationModel.$resolveWarning);
    expect(resolveWarning(strangerId)).toBe('none');
  });

  it('is unverifiable and warns on every recipient (even known ones) when connected but unhealthy', async () => {
    const knownContact = createBackendContact({
      id: 'backend-contact-1',
      accountId: createAccountId('known-contact'),
    });

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, null)
      .withStoreValue(contactModel.$backendContacts, [knownContact])
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('unverifiable');

    const resolveWarning = env.getState(recipientVerificationModel.$resolveWarning);
    expect(resolveWarning(knownContact.accountId)).toBe('unverifiable');
    expect(resolveWarning(strangerId)).toBe('unverifiable');
  });

  it('is unverifiable when connected and authenticated but the session is expired', async () => {
    // Covers the second OR-branch of the healthy check (the other test covers
    // $authState === null); a valid auth state with an expired session must
    // still land on 'unverifiable'.
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, {
        accountId: createAccountId('authed-account'),
        accountName: 'Authed Account',
        permissions: [],
      })
      .withStoreValue(authModel.$isSessionExpired, true)
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('unverifiable');
  });

  it('is unverifiable when connected and authenticated but a network issue is detected', async () => {
    // Covers the third OR-branch of the healthy check ($hasNetworkIssue).
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, {
        accountId: createAccountId('authed-account'),
        accountName: 'Authed Account',
        permissions: [],
      })
      .withStoreValue(authModel.$hasNetworkIssue, true)
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('unverifiable');
  });

  it('turns off entirely after an explicit disconnect (urlCleared)', async () => {
    // urlCleared resets $hasEverConnected — the README claims the feature
    // becomes invisible after an explicit disconnect; pin that path.
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, {
        accountId: createAccountId('authed-account'),
        accountName: 'Authed Account',
        permissions: [],
      })
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('active');

    await env.executeEventVoid(backendConfigurationModel.events.urlCleared);

    expect(env.getState(connectionHistoryModel.$hasEverConnected)).toBe(false);
    expect(env.getState(recipientVerificationModel.$mode)).toBe('off');

    const resolveWarning = env.getState(recipientVerificationModel.$resolveWarning);
    expect(resolveWarning(strangerId)).toBe('none');
  });

  it('is active and warns only unknown recipients once connected and healthy', async () => {
    const knownContact = createBackendContact({
      id: 'backend-contact-2',
      accountId: createAccountId('known-contact-2'),
    });

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, {
        accountId: createAccountId('authed-account'),
        accountName: 'Authed Account',
        permissions: [],
      })
      .withStoreValue(contactModel.$backendContacts, [knownContact])
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('active');

    const resolveWarning = env.getState(recipientVerificationModel.$resolveWarning);
    expect(resolveWarning(knownContact.accountId)).toBe('none');
    expect(resolveWarning(strangerId)).toBe('unknown');
  });

  it('never warns on an own wallet account while active', async () => {
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, {
        accountId: createAccountId('authed-account'),
        accountName: 'Authed Account',
        permissions: [],
      })
      .withStoreValue(accounts.__test.$list, [senderAccount])
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('active');

    const resolveWarning = env.getState(recipientVerificationModel.$resolveWarning);
    expect(resolveWarning(senderAccount.accountId)).toBe('none');
    expect(resolveWarning(strangerId)).toBe('unknown');
  });

  it('never warns on a local address-book contact while active', async () => {
    const localContactAccountId = createAccountId('local-contact');
    const localContact: LocalContact = {
      id: 'local-contact-1',
      source: 'local',
      name: 'Local Contact',
      address: toAddress(localContactAccountId),
      accountId: localContactAccountId,
    };

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
      .withStoreValue(authModel.$authState, {
        accountId: createAccountId('authed-account'),
        accountName: 'Authed Account',
        permissions: [],
      })
      .withStoreValue(contactModel.$localContacts, [localContact])
      .build();

    expect(env.getState(recipientVerificationModel.$mode)).toBe('active');

    const resolveWarning = env.getState(recipientVerificationModel.$resolveWarning);
    expect(resolveWarning(localContact.accountId)).toBe('none');
    expect(resolveWarning(strangerId)).toBe('unknown');
  });
});
