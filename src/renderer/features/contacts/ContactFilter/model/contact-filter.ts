import { combine, createEvent, createStore } from 'effector';

import { includes } from '@renderer/shared/lib/utils';
import { contactModel } from '@renderer/entities/contact';

export const $filterQuery = createStore<string>('');
const setQuery = createEvent<string>();

$filterQuery.on(setQuery, (_, query) => query);

export const $contactsFiltered = combine(contactModel.$contacts, $filterQuery, (contacts, query) => {
  return contacts
    .filter((c) => {
      const hasName = includes(c.name, query);
      const hasAddress = includes(c.address, query);
      const hasMatrixId = includes(c.matrixId, query);

      return hasName || hasAddress || hasMatrixId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const events = {
  setQuery,
};
