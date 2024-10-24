import { attach, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { type NavigateFunction } from 'react-router-dom';

import { type Contact } from '@/shared/core';
import { contactModel } from '@/entities/contact';

const validateUrlParams = createEvent<URLSearchParams>();
const storeCleared = createEvent();

export const $contact = createStore<Contact | null>(null).reset(storeCleared);

type Navigation = {
  redirectPath: string;
  navigate: NavigateFunction;
};
const $navigation = createStore<Navigation | null>(null).reset(storeCleared);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate, redirectPath }) => ({ ...state, navigate, redirectPath }),
});

type ValidateParams = {
  contactId: string | null;
  contacts: Contact[];
};
const getContactFx = createEffect(({ contactId, contacts }: ValidateParams) => {
  if (!contactId) return undefined;

  return contacts.find((contact) => contact.id?.toString() === contactId);
});

sample({
  clock: validateUrlParams,
  source: contactModel.$contacts,
  fn: (contacts, urlParams) => ({ contactId: urlParams.get('id'), contacts }),
  target: getContactFx,
});

sample({
  clock: getContactFx.doneData,
  fn: (contact) => contact || null,
  target: $contact,
});

sample({
  clock: getContactFx.doneData,
  filter: (contact) => !contact,
  target: attach({
    source: $navigation,
    effect: (state) => state?.navigate(state?.redirectPath, { replace: true }),
  }),
});

export const events = {
  navigateApiChanged: navigationApi.navigateApiChanged,
  validateUrlParams,
  storeCleared,
};
