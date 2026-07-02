import { useUnit } from 'effector-react';

import { PERMISSIONS } from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

/**
 * Gates whether the current user may add/edit a description for the given
 * multisig operation. Descriptions are posted to the external address book,
 * which authorizes by `operation:write` permission and the multisig existing as
 * a reachable contact — see `resolveDescriptionAreaState`.
 */
export const useDescriptionEditing = (operation: MultisigOperation) => {
  const { authState, baseUrl, contacts, hasEverConnected, isHealthy } = useUnit({
    authState: authModel.$authState,
    baseUrl: backendConfigurationModel.$backendUrl,
    contacts: contactModel.$backendContacts,
    hasEverConnected: connectionHistoryModel.$hasEverConnected,
    isHealthy: backendContactsModel.$isHealthy,
  });

  const hasWritePermission = authState?.permissions.includes(PERMISSIONS.OPERATION_WRITE) ?? false;
  const isInAddressBook = contacts.some(contact => contact.accountId === operation.multisigAccountId);
  const canEdit = Boolean(baseUrl) && isHealthy && hasWritePermission && isInAddressBook;

  return { canEdit, hasWritePermission, isInAddressBook, isHealthy, hasEverConnected, baseUrl };
};
