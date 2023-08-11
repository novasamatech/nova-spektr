import { attach, createApi, createStore, forward, sample } from 'effector';
import { createForm } from 'effector-forms';

import { Contact, contactModel } from '@renderer/entities/contact';
import { toAccountId, validateAddress } from '@renderer/shared/lib/utils';
import { validateFullUserName } from '@renderer/shared/api/matrix';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

export const contactForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'addressBook.createContact.nameRequiredError', validator: Boolean },
        {
          name: 'exist',
          errorText: 'addressBook.createContact.nameExistsError',
          source: contactModel.$contacts,
          validator: validateNameExist,
        },
      ],
    },
    address: {
      init: '',
      rules: [
        { name: 'required', errorText: 'addressBook.createContact.accountIdRequiredError', validator: Boolean },
        { name: 'invalid', errorText: 'addressBook.createContact.accountIdIncorrectError', validator: validateAddress },
        {
          name: 'exist',
          errorText: 'addressBook.createContact.accountIdExistsError',
          source: contactModel.$contacts,
          validator: validateAddressExist,
        },
      ],
    },
    matrixId: {
      init: '',
      rules: [{ name: 'invalid', errorText: 'addressBook.createContact.matrixIdError', validator: validateMatrixId }],
    },
  },
  validateOn: ['change', 'submit'],
});

function validateNameExist(value: string, _: unknown, contacts: Contact[]): boolean {
  if (!value) return true;

  return contacts.every((contact) => contact.name.toLowerCase() !== value.toLowerCase());
}

function validateAddressExist(value: string, _: unknown, contacts: Contact[]): boolean {
  if (!value) return true;

  const accountId = toAccountId(value);

  return contacts.every((contact) => contact.accountId !== accountId);
}

function validateMatrixId(value: string): boolean {
  if (!value) return true;

  return validateFullUserName(value);
}

const createContactFx = attach({
  effect: contactModel.effects.addContactFx,
  source: contactForm.$values,
  mapParams: (_, data) => {
    return { ...data, accountId: toAccountId(data.address) };
  },
});

forward({
  from: contactForm.formValidated,
  to: createContactFx,
});

sample({
  clock: createContactFx.doneData,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

export const $submitPending = createContactFx.pending;

export const events = {
  callbacksChanged: callbacksApi.callbacksChanged,
  formInitiated: contactForm.reset,
};
