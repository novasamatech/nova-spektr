import { combine, createEvent, restore, sample } from 'effector';

import { type SourcedContact } from '@/shared/core';
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

const $contactsFiltered = combine(
  {
    contacts: contactModel.$localContacts,
    query: $query,
  },
  ({ contacts, query }) => {
    return contacts
      .filter((c) => {
        const hasName = includes(c.name, query);
        const hasAddress = includes(c.address, query);

        return hasName || hasAddress;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);

const $sourcedContactsFiltered = combine(
  {
    localContacts: contactModel.$localContacts,
    backendContacts: contactModel.$backendContacts,
    query: $query,
    sourceTab: contactSourceModel.$sourceTab,
    backendUrl: backendConfigurationModel.$backendUrl,
  },
  ({ localContacts, backendContacts, query, sourceTab, backendUrl }) => {
    const result: SourcedContact[] = [];

    if (sourceTab === 'local') {
      for (const contact of localContacts) {
        if (query && !includes(contact.name, query) && !includes(contact.address, query)) continue;
        result.push({ source: { type: 'local' }, contact });
      }
    } else if (backendUrl) {
      for (const contact of backendContacts) {
        if (query && !includes(contact.name, query) && !includes(contact.address, query)) continue;
        result.push({ source: { type: 'backend', backendUrl }, contact });
      }
    }

    return result.sort((a, b) => a.contact.name.localeCompare(b.contact.name));
  },
);

export const filterModel = {
  $query,
  $contactsFiltered,
  $sourcedContactsFiltered,

  events: {
    formInitiated,
    queryChanged,
  },
};
