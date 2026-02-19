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

const $filteredContacts = combine(
  {
    localContacts: contactModel.$localContacts,
    backendContacts: contactModel.$backendContacts,
    query: $query,
    sourceTab: contactSourceModel.$sourceTab,
    backendUrl: backendConfigurationModel.$backendUrl,
  },
  ({ localContacts, backendContacts, query, sourceTab, backendUrl }) => {
    const result: Contact[] = [];

    if (sourceTab === 'local') {
      for (const contact of localContacts) {
        if (query && !includes(contact.name, query) && !includes(contact.address, query)) continue;
        result.push(contact);
      }
    } else if (backendUrl) {
      for (const contact of backendContacts) {
        if (query && !includes(contact.name, query) && !includes(contact.address, query)) continue;
        result.push(contact);
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
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
