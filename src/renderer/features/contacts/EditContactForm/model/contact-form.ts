import { attach, combine, createApi, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { not, or } from 'patronum';

import { Contact, contactModel } from '@renderer/entities/contact';
import { toAccountId, validateAddress } from '@renderer/shared/lib/utils';
import { validateFullUserName } from '@renderer/shared/api/matrix';
import { ContactDS } from '@renderer/shared/api/storage';

export type FormApi = {
  contactToEdit: ContactDS;
  onSubmit: () => void;
};
const $formApi = createStore<FormApi | null>(null);

const api = createApi($formApi, {
  formPropsChanged: (state, props: FormApi) => ({ ...state, ...props }),
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
            contactToEdit: $formApi.map((f) => f?.contactToEdit),
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
            contactToEdit: $formApi.map((f) => f?.contactToEdit),
            contacts: contactModel.$contacts,
          }),
          validator: validateAddressExist,
        },
      ],
    },
    matrixId: {
      init: '',
      rules: [{ name: 'invalid', errorText: 'addressBook.editContact.matrixIdError', validator: validateFullUserName }],
    },
  },
  validateOn: ['change'],
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
  clock: api.formPropsChanged,
  // filter: not(contactForm.$isDirty),
  fn: ({ contactToEdit }: FormApi) => ({
    name: contactToEdit.name,
    address: contactToEdit.address,
    matrixId: contactToEdit.matrixId,
  }),
  target: contactForm.setForm,
});

const editContactFx = attach({
  effect: contactModel.effects.updateContactFx,
  source: { id: $formApi.map((f) => f?.contactToEdit.id), values: contactForm.$values },
  mapParams: (_, { id, values }) => {
    return { ...values, id, accountId: toAccountId(values.address) };
  },
});

export const $submitPending = editContactFx.pending;

sample({
  clock: contactForm.submit,
  source: contactForm.$values,
  filter: or(not($submitPending), contactForm.$eachValid),
  target: editContactFx,
});

sample({
  clock: editContactFx.doneData,
  target: attach({
    source: $formApi,
    effect: (state) => state?.onSubmit(),
  }),
});

export const events = {
  formPropsChanged: api.formPropsChanged,
};
