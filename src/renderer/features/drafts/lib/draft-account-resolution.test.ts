import { describe, expect, it } from 'vitest';

import { type BackendContact, AccountType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft, type PathNode } from '@/domains/backend';
import { type AnyAccount, isContactMultisigAccount } from '@/domains/network';

import { resolveDraftProxyAccount } from './draft-account-resolution';

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;

const proxied = (accountId: AccountId, proxyType?: string): PathNode =>
  proxyType ? { kind: 'proxied', accountId, proxyType } : { kind: 'proxied', accountId };

const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });

const makeDraft = (overrides: Partial<Draft> = {}): Draft =>
  ({
    id: 'draft-1',
    multisigAccountId: null,
    proxyAccountId: acc(1),
    chainId: '0xaaaa',
    callData: null,
    description: null,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    signingPath: [proxied(acc(1), 'Governance'), signer(acc(2))],
    initiatorAccountId: null,
    ...overrides,
  }) as Draft;

const makeBackendContact = (accountId: AccountId, name: string): BackendContact =>
  ({
    id: `contact-${accountId}`,
    source: 'backend',
    name,
    address: accountId,
    accountId,
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
  }) as unknown as BackendContact;

const makeProxiedAccount = (accountId: AccountId): AnyAccount =>
  ({
    id: `acct-${accountId}`,
    type: 'chain',
    walletId: 1,
    name: `proxied-${accountId}`,
    accountId,
    accountType: AccountType.PROXIED,
    chainId: '0xaaaa',
    connections: [
      { proxyAccountId: acc(2), proxyType: 'Any', delay: 0 },
      { proxyAccountId: acc(2), proxyType: 'Governance', delay: 0 },
    ],
    createdAt: 0,
  }) as unknown as AnyAccount;

describe('resolveDraftProxyAccount', () => {
  it('uses the draft proxy contact name when synthesizing a proxied account', () => {
    const account = resolveDraftProxyAccount(
      makeDraft({ proxyContact: { accountId: acc(1), name: 'Draft Contact' } }),
      [],
      [makeBackendContact(acc(1), 'Backend Contact')],
    );

    expect(account).toMatchObject({
      id: `draft:draft-1:proxy:${acc(1)}`,
      name: 'Draft Contact',
      accountId: acc(1),
      accountType: AccountType.PROXIED,
      connections: [{ proxyAccountId: acc(2), proxyType: 'Governance', delay: 0 }],
    });
    expect(account && isContactMultisigAccount(account)).toBe(false);
  });

  it('falls back to the backend contact name when draft proxy contact is missing', () => {
    const account = resolveDraftProxyAccount(makeDraft(), [], [makeBackendContact(acc(1), 'Backend Contact')]);

    expect(account).toMatchObject({
      name: 'Backend Contact',
      accountType: AccountType.PROXIED,
    });
  });

  it('scopes an existing proxied account to the draft signing path connection', () => {
    const account = resolveDraftProxyAccount(makeDraft(), [makeProxiedAccount(acc(1))], []);

    expect(account).toMatchObject({
      accountId: acc(1),
      connections: [{ proxyAccountId: acc(2), proxyType: 'Governance', delay: 0 }],
    });
  });
});
