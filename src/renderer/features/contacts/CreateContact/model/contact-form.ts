import { attach, createApi, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { not, or } from 'patronum';

import { Contact, contactModel } from '@renderer/entities/contact';
import { toAccountId, validateAddress } from '@renderer/shared/lib/utils';
import { validateFullUserName } from '@renderer/shared/api/matrix';

export type FormApi = {
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
      rules: [
        { name: 'invalid', errorText: 'addressBook.createContact.matrixIdError', validator: validateFullUserName },
      ],
    },
  },
  validateOn: ['change'],
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

const createContactFx = attach({
  effect: contactModel.effects.addContactFx,
  source: contactForm.$values,
  mapParams: (_, data) => {
    return { ...data, accountId: toAccountId(data.address) };
  },
});

export const $submitPending = createContactFx.pending;

sample({
  clock: contactForm.submit,
  source: contactForm.$values,
  filter: or(not($submitPending), contactForm.$eachValid),
  target: createContactFx,
});

sample({
  clock: createContactFx.doneData,
  target: attach({
    source: $formApi,
    effect: (state) => state?.onSubmit(),
  }),
});

export const events = {
  formPropsChanged: api.formPropsChanged,
  formInitiated: contactForm.reset,
};
