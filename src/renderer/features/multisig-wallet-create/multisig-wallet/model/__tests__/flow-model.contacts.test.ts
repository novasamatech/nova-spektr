import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
// Loads the flow wiring under test.
import '../flow-model';
import { signatoryModel } from '../signatory-model';

const signerId = createAccountId('signer');
const ownId = createAccountId('own-synced');
const externalId = createAccountId('external');
const ownAccount = { id: 'own', accountId: ownId, walletId: 2, name: 'x' } as unknown as AnyAccount;

// Wiring only: which signatories reach the contact effects is decided by
// getSignatoryContactChanges (covered in common/__tests__).
describe('classic multisig flow signatory contacts', () => {
  it('should save only external signatories as local contacts', async () => {
    const createContacts = vi.fn().mockResolvedValue([]);
    const updateContacts = vi.fn().mockResolvedValue([]);
    const scope = fork({
      values: [[accounts.__test.$list, [ownAccount]]],
      handlers: [
        [contactModel.effects.createContactsFx, createContacts],
        [contactModel.effects.updateContactsFx, updateContacts],
      ],
    });

    const rows = [
      { index: 0, name: 'Me', address: toAddress(signerId), walletId: '1' },
      // An own account pasted as an address: no walletId, auto-filled short address.
      { index: 1, name: toShortAddress(toAddress(ownId), 5), address: toAddress(ownId) },
      { index: 2, name: 'Alice', address: toAddress(externalId) },
    ];
    for (const row of rows) {
      await allSettled(signatoryModel.events.changeSignatory, { scope, params: row });
    }

    // The payload is not read by the contacts wiring.
    await allSettled(signModel.output.formSubmitted, { scope, params: [] as never });

    expect(createContacts).toHaveBeenCalledTimes(1);
    expect(createContacts.mock.calls[0]?.[0]).toEqual([
      { accountId: externalId, address: toAddress(externalId), name: 'Alice', source: 'local' },
    ]);
    expect(updateContacts).not.toHaveBeenCalled();
  });
});
