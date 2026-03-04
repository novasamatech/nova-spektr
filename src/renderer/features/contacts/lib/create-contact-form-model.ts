import { attach, combine, createApi, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { not } from 'patronum';

import { type Contact } from '@/shared/core';
import { toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';

type ContactFormFields = {
  name: string;
  address: string;
};

function validateNameUnique(value: string, _: unknown, contacts: Contact[]): boolean {
  if (!value) return true;

  return contacts.every((contact) => contact.name.toLowerCase() !== value.toLowerCase());
}

function validateAddressUnique(value: string, _: unknown, contacts: Contact[]): boolean {
  if (!value) return true;

  const accountId = toAccountId(value);

  return contacts.every((contact) => contact.accountId !== accountId);
}

function validateNameUniqueEdit(
  value: string,
  _: unknown,
  params: { contactToEdit: Contact; contacts: Contact[] },
): boolean {
  if (!value) return true;

  const isSameName = value.toLowerCase() === params.contactToEdit.name.toLowerCase();
  const isUnique = params.contacts.every((contact) => contact.name.toLowerCase() !== value.toLowerCase());

  return isSameName || isUnique;
}

function validateAddressUniqueEdit(
  value: string,
  _: unknown,
  params: { contactToEdit: Contact; contacts: Contact[] },
): boolean {
  if (!value) return true;

  const address = toAddress(value);
  const accountId = toAccountId(address);
  const isSameAddress = value.toLowerCase() === params.contactToEdit.address.toLowerCase();
  const isUnique = params.contacts.every((contact) => contact.accountId !== accountId);

  return isSameAddress || isUnique;
}

export function createCreateFormModel() {
  const formSubmitted = createEvent<void>();

  const $contactForm = createForm({
    fields: {
      name: {
        init: '',
        rules: [
          { name: 'required', errorText: t('addressBook.createContact.nameRequiredError'), validator: Boolean },
          {
            name: 'exist',
            errorText: t('addressBook.createContact.nameExistsError'),
            source: contactModel.$localContacts,
            validator: validateNameUnique,
          },
        ],
      },
      address: {
        init: '',
        rules: [
          {
            name: 'required',
            errorText: t('addressBook.createContact.accountIdRequiredError'),
            validator: Boolean,
          },
          {
            name: 'invalid',
            errorText: t('addressBook.createContact.accountIdIncorrectError'),
            validator: (address: string) => validateAddress(address),
          },
          {
            name: 'exist',
            errorText: t('addressBook.createContact.accountIdExistsError'),
            source: contactModel.$localContacts,
            validator: validateAddressUnique,
          },
        ],
      },
    },
    validateOn: ['change', 'submit'],
  });

  const createContactFx = attach({
    effect: contactModel.effects.createContactFx,
    source: $contactForm.$values,
    mapParams: (_: void, data: ContactFormFields) => {
      const address = toAddress(data.address);

      return {
        name: data.name,
        address,
        accountId: toAccountId(address),
        source: 'local' as const,
      };
    },
  });

  sample({
    clock: $contactForm.formValidated,
    target: createContactFx,
  });

  sample({
    clock: createContactFx.doneData,
    target: formSubmitted,
  });

  return {
    $contactForm,
    $submitPending: createContactFx.pending,
    formSubmitted,
    events: {
      formInitiated: $contactForm.reset,
    },
  };
}

export function createEditFormModel() {
  const formSubmitted = createEvent<void>();
  const $contactToEdit = createStore<Contact | null>(null);
  const contactApi = createApi($contactToEdit, {
    formInitiated: (_state: Contact | null, props: Contact) => props,
  });

  const $contactForm = createForm({
    fields: {
      name: {
        init: '',
        rules: [
          { name: 'required', errorText: t('addressBook.editContact.nameRequiredError'), validator: Boolean },
          {
            name: 'exist',
            errorText: t('addressBook.editContact.nameExistsError'),
            source: combine({
              contactToEdit: $contactToEdit,
              contacts: contactModel.$localContacts,
            }),
            validator: validateNameUniqueEdit,
          },
        ],
      },
      address: {
        init: '',
        rules: [
          { name: 'required', errorText: t('addressBook.editContact.accountIdRequiredError'), validator: Boolean },
          {
            name: 'invalid',
            errorText: t('addressBook.editContact.accountIdIncorrectError'),
            validator: (address: string) => validateAddress(address),
          },
          {
            name: 'exist',
            errorText: t('addressBook.editContact.accountIdExistsError'),
            source: combine({
              contactToEdit: $contactToEdit,
              contacts: contactModel.$localContacts,
            }),
            validator: validateAddressUniqueEdit,
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
    fn: ({ name, address }: Contact) => ({ name, address }),
    target: $contactForm.setForm,
  });

  sample({
    clock: $contactForm.formValidated,
    source: $contactToEdit,
    filter: (contactToEdit): contactToEdit is Contact => contactToEdit !== null,
    fn: (contactToEdit, form) => {
      const address = toAddress(form.address);
      const base = { ...contactToEdit, name: form.name, address, accountId: toAccountId(address) };

      return base as Contact;
    },
    target: contactModel.effects.updateContactFx,
  });

  sample({
    clock: contactModel.effects.updateContactFx.done,
    target: formSubmitted,
  });

  return {
    $contactForm,
    $contactToEdit,
    $submitPending: contactModel.effects.updateContactFx.pending,
    formSubmitted,
    events: {
      formInitiated: contactApi.formInitiated,
    },
  };
}
