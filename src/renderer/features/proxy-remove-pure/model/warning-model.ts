import { createEvent, sample } from 'effector';

import { type Form, createForm } from '@/shared/forms';

const PASSPHRASE = 'I huy';

type FormParams = {
  passphrase: string;
  isCorrectProxy: boolean;
  isIrreversible: boolean;
  isInaccessible: boolean;
  lossOfFunds: boolean;
};

const formInitiated = createEvent();
const formSubmitted = createEvent();

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    passphrase: {
      defaultValue: '',
      validator: () => (value: string) => {
        if (value.toLowerCase().trim() !== PASSPHRASE.toLowerCase()) {
          return { message: 'pureProxyRemove.warning.invalidPassphrase' };
        }
      },
    },
    isCorrectProxy: {
      defaultValue: false,
      validator: () => (value: boolean) => {
        if (!value) {
          return { message: 'pureProxyRemove.warning.checkboxRequired' };
        }
      },
    },
    isIrreversible: {
      defaultValue: false,
      validator: () => (value: boolean) => {
        if (!value) {
          return { message: 'pureProxyRemove.warning.checkboxRequired' };
        }
      },
    },
    isInaccessible: {
      defaultValue: false,
      validator: () => (value: boolean) => {
        if (!value) {
          return { message: 'pureProxyRemove.warning.checkboxRequired' };
        }
      },
    },
    lossOfFunds: {
      defaultValue: false,
      validator: () => (value: boolean) => {
        if (!value) {
          return { message: 'pureProxyRemove.warning.checkboxRequired' };
        }
      },
    },
  },
  validateOn: ['submit'],
});

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: form.submit.doneData,
  target: formSubmitted,
});

export const warningModel = {
  form,
  $canSubmit: form.$isValid,

  formInitiated,
  formSubmitted,
};
