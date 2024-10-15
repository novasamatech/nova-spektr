import { attach, combine, createApi, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { not } from 'patronum';

import { type Contact } from '@/shared/core';
import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $contactToEdit = createStore<Contact | null>(null);
const contactApi = createApi($contactToEdit, {
  formInitiated: (state, props: Contact) => ({ ...state, ...props }),
});

const $contactForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'addressBook.editContact.nameRequiredError', validator: Boolean },
        {
          name: 'exist',
          errorText: 'addressBook.editContact.nameExistsError',
          source: combine({
            contactToEdit: $contactToEdit,
            contacts: contactModel.$contacts,
          }),
          validator: validateNameExist,
        },
      ],
    },
    address: {
      init: '',
      rules: [
        { name: 'required', errorText: 'addressBook.editContact.accountIdRequiredError', validator: Boolean },
        { name: 'invalid', errorText: 'addressBook.editContact.accountIdIncorrectError', validator: validateAddress },
        {
          name: 'exist',
          errorText: 'addressBook.editContact.accountIdExistsError',
          source: combine({
            contactToEdit: $contactToEdit,
            contacts: contactModel.$contacts,
          }),
          validator: validateAddressExist,
        },
      ],
    },
  },
  validateOn: ['change', 'submit'],
});

sample({
  clock: contactApi.formInitiated,
  filter: $contactForm.$isDirty,
  target: $contactForm.reset,
});

sample({
  clock: contactApi.formInitiated,
  filter: not($contactForm.$isDirty),
  fn: ({ name, address }) => ({ name, address }),
  target: $contactForm.setForm,
});

type SourceParams = {
  contactToEdit: Contact;
  contacts: Contact[];
};
function validateNameExist(value: string, _: unknown, params: SourceParams): boolean {
  if (!value) return true;

  const isSameName = value.toLowerCase() === params.contactToEdit.name.toLowerCase();
  const isUnique = params.contacts.every((contact) => contact.name.toLowerCase() !== value.toLowerCase());

  return isSameName || isUnique;
}

function validateAddressExist(value: string, _: unknown, params: SourceParams): boolean {
  if (!value) return true;

  const accountId = toAccountId(value);
  const isSameAddress = value.toLowerCase() === params.contactToEdit.address.toLowerCase();
  const isUnique = params.contacts.every((contact) => contact.accountId !== accountId);

  return isSameAddress || isUnique;
}

sample({
  clock: $contactForm.formValidated,
  source: $contactToEdit,
  filter: (contactToEdit) => contactToEdit !== null,
  fn: (contactToEdit, form) => {
    return { ...form, id: contactToEdit!.id, accountId: toAccountId(form.address) };
  },
  target: contactModel.effects.updateContactFx,
});

sample({
  clock: contactModel.effects.updateContactFx,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

export const editFormModel = {
  $contactForm,
  $contactToEdit,
  $submitPending: contactModel.effects.updateContactFx.pending,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated: contactApi.formInitiated,
  },
};
