import { type BackendContact, type LocalContact } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { getSignatoryContactChanges } from '../signatory-contacts';

const signer = { name: 'Me', address: toAddress(createAccountId('signer')), walletId: '1' };
const externalId = createAccountId('external');
const external = { name: 'Alice', address: toAddress(externalId) };

const ownId = createAccountId('own');
const ownAccount = { id: 'own-account', accountId: ownId, walletId: 7, name: 'x' } as unknown as AnyAccount;

const localContact = (overrides: Partial<LocalContact> = {}): LocalContact => ({
  id: 'local-1',
  accountId: externalId,
  address: toAddress(externalId),
  name: 'Old Alice',
  source: 'local',
  ...overrides,
});

const backendContact = { ...localContact(), id: 'backend-1', source: 'backend' } as unknown as BackendContact;

describe('getSignatoryContactChanges', () => {
  it('should create a local contact for a new external signatory', () => {
    const { created, updated } = getSignatoryContactChanges({
      signatories: [signer, external],
      contacts: [],
      accounts: [],
    });

    expect(created).toEqual([
      { accountId: externalId, address: toAddress(externalId), name: 'Alice', source: 'local' },
    ]);
    expect(updated).toEqual([]);
  });

  it('should rename an existing local contact', () => {
    const { created, updated } = getSignatoryContactChanges({
      signatories: [signer, external],
      contacts: [localContact()],
      accounts: [],
    });

    expect(created).toEqual([]);
    expect(updated).toEqual([localContact({ name: 'Alice' })]);
  });

  it('should leave an address book contact untouched', () => {
    const { created, updated } = getSignatoryContactChanges({
      signatories: [signer, external],
      contacts: [backendContact],
      accounts: [],
    });

    expect(created).toEqual([]);
    expect(updated).toEqual([]);
  });

  // An own account pasted as an address (or picked from Contacts) has no
  // walletId; its name field auto-fills with the stored account name, which
  // for a synced account is its short address. Saving that as a local contact
  // hid the address book name of the account everywhere.
  it('should not save a contact for an address of an own account', () => {
    const { created, updated } = getSignatoryContactChanges({
      signatories: [signer, { name: 'Own', address: toAddress(ownId) }],
      contacts: [],
      accounts: [ownAccount],
    });

    expect(created).toEqual([]);
    expect(updated).toEqual([]);
  });

  it('should not save a name that is the signatory own short address', () => {
    const { created, updated } = getSignatoryContactChanges({
      signatories: [signer, { name: toShortAddress(toAddress(externalId), 5), address: toAddress(externalId) }],
      contacts: [localContact()],
      accounts: [],
    });

    expect(created).toEqual([]);
    expect(updated).toEqual([]);
  });
});
