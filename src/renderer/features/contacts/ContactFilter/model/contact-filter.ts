import { combine, createEvent, restore, sample } from 'effector';

import { type Contact } from '@/shared/core';
import { includes } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { backendConfigurationModel } from '../../BackendConfiguration';

import { contactSourceModel } from './contact-source-model';

const formInitiated = createEvent();
const queryChanged = createEvent<string>();

const $query = restore(queryChanged, '');

sample({
  clock: formInitiated,
  target: $query.reinit,
});

sample({
  clock: queryChanged,
  target: $query,
});

function performSearch(contacts: Contact[], query: string): Contact[] {
  if (!query) return contacts;

  return contacts.filter((contact) => includes(contact.name, query) || includes(contact.address, query));
}

const $filteredContacts = combine(
  {
    localContacts: contactModel.$localContacts,
    backendContacts: contactModel.$backendContacts,
    query: $query,
    sourceTab: contactSourceModel.$sourceTab,
    backendUrl: backendConfigurationModel.$backendUrl,
  },
  ({ localContacts, backendContacts, query, sourceTab, backendUrl }) => {
    const contacts = sourceTab === 'local' ? localContacts : backendUrl ? backendContacts : [];

    return performSearch(contacts, query).sort((a, b) => a.name.localeCompare(b.name));
  },
);

export const filterModel = {
  $query,
  $filteredContacts,

  events: {
    formInitiated,
    queryChanged,
  },
};
