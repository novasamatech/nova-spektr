import { createForm } from 'effector-forms';
import { forward, createStore } from 'effector';

const $keys = createStore<any[]>([]);

const $constructorForm = createForm({
  fields: {
    network: {
      init: '',
      rules: [{ name: 'required', errorText: 'addressBook.createContact.nameRequiredError', validator: Boolean }],
    },
    keyType: {
      init: '',
      rules: [{ name: 'required', errorText: 'addressBook.createContact.accountIdRequiredError', validator: Boolean }],
    },
    isSharded: {
      init: false,
      rules: [{ name: 'invalid', errorText: 'error', validator: Boolean }],
    },
    shards: {
      init: '',
      rules: [{ name: 'required', errorText: 'error', validator: Boolean }],
    },
    keyName: {
      init: '',
      rules: [{ name: 'required', errorText: 'error', validator: Boolean }],
    },
    derivationPath: {
      init: '',
      rules: [{ name: 'required', errorText: 'error', validator: Boolean }],
    },
  },
  validateOn: ['submit'],
});

forward({ from: $constructorForm.submit, to: $constructorForm.reset });

export const constructorModel = {
  $keys,
  $constructorForm,
  events: {},
};
