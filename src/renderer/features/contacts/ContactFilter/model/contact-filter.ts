import { combine, createEvent, createStore, sample } from 'effector';

import { includes } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';

const formInitiated = createEvent();

const $filterQuery = createStore<string>('');
const queryChanged = createEvent<string>();

sample({
  clock: formInitiated,
  target: $filterQuery.reinit,
});

sample({
  clock: queryChanged,
  target: $filterQuery,
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

        return hasName || hasAddress;
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
