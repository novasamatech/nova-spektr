import { attach, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { NavigateFunction } from 'react-router-dom';

import { Contact, contactModel } from '@renderer/entities/contact';
import { ContactDS } from '@renderer/shared/api/storage';

type NavigateApi = {
  redirectPath: string;
  navigate: NavigateFunction;
};
const $navigateApi = createStore<NavigateApi | null>(null);
const api = createApi($navigateApi, {
  useNavigateApi: (state, { navigate, redirectPath }) => ({ ...state, navigate, redirectPath }),
});

export const $contact = createStore<Contact | null>(null);

const validateUrlParams = createEvent<URLSearchParams>();

type ValidateParams = {
  contactId: string | null;
  contacts: ContactDS[];
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
    source: $navigateApi,
    effect: (state) => state?.navigate(state?.redirectPath, { replace: true }),
  }),
});

export const events = {
  useNavigateApi: api.useNavigateApi,
  validateUrlParams,
};
