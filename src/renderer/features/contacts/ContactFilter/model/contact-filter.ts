import { combine, createEvent, createStore, forward } from 'effector';

import { includes } from '@shared/lib/utils';
import { contactModel } from '@entities/contact';

const componentMounted = createEvent();

const $filterQuery = createStore<string>('');
const queryChanged = createEvent<string>();
const queryReset = createEvent();

$filterQuery.on(queryChanged, (_, query) => query).reset(queryReset);

forward({
  from: componentMounted,
  to: queryReset,
});

const $contactsFiltered = combine(
  {
    contacts: contactModel.$contacts,
    query: $filterQuery,
  },
  ({ contacts, query }) => {
    return contacts
      .filter((c) => {
        const hasName = includes(c.name, query);
        const hasAddress = includes(c.address, query);
        const hasMatrixId = includes(c.matrixId, query);

        return hasName || hasAddress || hasMatrixId;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);

export const filterModel = {
  $contactsFiltered,
  events: {
    componentMounted,
    queryChanged,
  },
};
