import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Address, type Contact, type LocalContact } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { contactModel } from '../contact-model';

const existingContact: LocalContact = {
  id: 'test-uuid-1',
  name: 'Alice',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address,
  accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId,
  source: 'local',
};

const newContact: Omit<LocalContact, 'id'> = {
  name: 'Bob',
  address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address,
  accountId: '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48' as AccountId,
  source: 'local',
};

describe('entities/contact/model/contact-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should not restore deleted contact on undo if duplicate accountId exists', async () => {
    const spyPut = jest.spyOn(storageService.contacts, 'put');

    const scope = fork({
      values: new Map().set(contactModel.$localContacts, [existingContact]),
    });

    // Try to undo delete with a contact that has the same accountId as existing
    await allSettled(contactModel.effects.undoDeleteContactFx, {
      scope,
      params: {
        name: 'Alice Updated',
        address: existingContact.address,
        accountId: existingContact.accountId,
        source: 'local' as const,
      },
    });

    // Should not call put because duplicate exists
    expect(spyPut).not.toHaveBeenCalled();
    // Store should remain unchanged
    expect(scope.getState(contactModel.$contacts)).toEqual([existingContact]);
  });

  test('should restore deleted contact on undo if no duplicate accountId exists', async () => {
    const createdContact: Contact = { ...newContact, id: 'test-uuid-2' };
    const spyPut = jest.spyOn(storageService.contacts, 'put').mockResolvedValue(createdContact);

    const scope = fork({
      values: new Map().set(contactModel.$localContacts, [existingContact]),
    });

    // Try to undo delete with a contact that has different accountId
    await allSettled(contactModel.effects.undoDeleteContactFx, {
      scope,
      params: newContact,
    });

    // Should call put because no duplicate
    expect(spyPut).toHaveBeenCalled();
    // Store should have both contacts
    expect(scope.getState(contactModel.$contacts)).toEqual([existingContact, createdContact]);
  });
});
