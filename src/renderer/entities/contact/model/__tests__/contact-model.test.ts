import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Address, type Contact } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { contactModel } from '../contact-model';

const existingContact: Contact = {
  id: 1,
  name: 'Alice',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address,
  accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId,
};

const newContact: Omit<Contact, 'id'> = {
  name: 'Bob',
  address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address,
  accountId: '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48' as AccountId,
};

describe('entities/contact/model/contact-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should not restore deleted contact on undo if duplicate accountId exists', async () => {
    const spyCreate = jest.spyOn(storageService.contacts, 'create');

    const scope = fork({
      values: new Map().set(contactModel.$contacts, [existingContact]),
    });

    // Try to undo delete with a contact that has the same accountId as existing
    await allSettled(contactModel.effects.undoDeleteContactFx, {
      scope,
      params: {
        name: 'Alice Updated',
        address: existingContact.address,
        accountId: existingContact.accountId,
      },
    });

    // Should not call create because duplicate exists
    expect(spyCreate).not.toHaveBeenCalled();
    // Store should remain unchanged
    expect(scope.getState(contactModel.$contacts)).toEqual([existingContact]);
  });

  test('should restore deleted contact on undo if no duplicate accountId exists', async () => {
    const createdContact: Contact = { ...newContact, id: 2 };
    const spyCreate = jest.spyOn(storageService.contacts, 'create').mockResolvedValue(createdContact);

    const scope = fork({
      values: new Map().set(contactModel.$contacts, [existingContact]),
    });

    // Try to undo delete with a contact that has different accountId
    await allSettled(contactModel.effects.undoDeleteContactFx, {
      scope,
      params: newContact,
    });

    // Should call create because no duplicate
    expect(spyCreate).toHaveBeenCalledWith(newContact);
    // Store should have both contacts
    expect(scope.getState(contactModel.$contacts)).toEqual([existingContact, createdContact]);
  });
});
