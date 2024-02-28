import { combine, createEvent, createStore, sample } from 'effector';

import { includes } from '@shared/lib/utils';
import { contactModel } from '@entities/contact';

const formInitiated = createEvent();

const $filterQuery = createStore<string>('');
const queryChanged = createEvent<string>();
const queryReset = createEvent();

sample({
  clock: queryChanged,
  target: $filterQuery,
});
sample({
  clock: formInitiated,
  target: queryReset,
});

sample({
  clock: queryChanged,
  target: $filterQuery.reinit,
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
    formInitiated,
    queryChanged,
  },
};
