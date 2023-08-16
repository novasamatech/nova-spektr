import { combine, createEvent, createStore } from 'effector';

import { includes } from '@renderer/shared/lib/utils';
import { contactModel } from '@renderer/entities/contact';

export const $filterQuery = createStore<string>('');
const queryChanged = createEvent<string>();
const filterInited = createEvent();

$filterQuery.on(queryChanged, (_, query) => query).reset(filterInited);

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
  filterInited,
  queryChanged,
};
