import { attach, combine, createApi, createStore, forward, sample } from 'effector';
import { createForm } from 'effector-forms';
import { not } from 'patronum';

import { Contact, contactModel } from '@renderer/entities/contact';
import { toAccountId, validateAddress } from '@renderer/shared/lib/utils';
import { validateFullUserName } from '@renderer/shared/api/matrix';
import { ContactDS } from '@renderer/shared/api/storage';

export type FormApi = {
  onSubmit: () => void;
};
const $formApi = createStore<FormApi | null>(null);
const formApi = createApi($formApi, {
  apiChanged: (state, props: FormApi) => ({ ...state, ...props }),
});

export const $contactToEdit = createStore<ContactDS | null>(null);
const contactApi = createApi($contactToEdit, {
  formInitiated: (state, props: ContactDS) => ({ ...state, ...props }),
});

export const contactForm = createForm({
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
    matrixId: {
      init: '',
      rules: [{ name: 'invalid', errorText: 'addressBook.editContact.matrixIdError', validator: validateMatrixId }],
    },
  },
  validateOn: ['change', 'submit'],
});

sample({
  clock: contactApi.formInitiated,
  filter: contactForm.$isDirty,
  target: contactForm.reset,
});

sample({
  clock: contactApi.formInitiated,
  filter: not(contactForm.$isDirty),
  fn: ({ name, address, matrixId }) => ({ name, address, matrixId }),
  target: contactForm.setForm,
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

function validateMatrixId(value: string): boolean {
  if (!value) return true;

  return validateFullUserName(value);
}

const editContactFx = attach({
  effect: contactModel.effects.updateContactFx,
  source: {
    contactToEdit: $contactToEdit,
    form: contactForm.$values,
  },
  mapParams: (_, { contactToEdit, form }) => {
    return { ...form, id: contactToEdit?.id, accountId: toAccountId(form.address) };
  },
});

forward({
  from: contactForm.formValidated,
  to: editContactFx,
});

sample({
  clock: editContactFx.doneData,
  target: attach({
    source: $formApi,
    effect: (state) => state?.onSubmit(),
  }),
});

export const $submitPending = editContactFx.pending;

export const events = {
  apiChanged: formApi.apiChanged,
  formInitiated: contactApi.formInitiated,
};
