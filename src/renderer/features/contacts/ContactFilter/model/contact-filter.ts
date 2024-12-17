import { combine, createEvent, restore, sample } from 'effector';

import { includes } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';

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
    contacts: contactModel.$contacts,
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

export const filterModel = {
  $query,
  $contactsFiltered,

  events: {
    formInitiated,
    queryChanged,
  },
};
