import { createEvent, sample } from 'effector';
import { createForm } from 'effector-forms';

const PASSPHRASE = 'I understand that I will not be able to manage this wallet';

type FormParams = {
  passphrase: string;
  isCorrectProxy: boolean;
  isIrreversible: boolean;
  isInaccessible: boolean;
  lossOfFunds: boolean;
};

type Input = {
  isLastProxy: boolean;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const $warningForm = createForm<FormParams>({
  fields: {
    passphrase: {
      init: '',
      rules: [
        {
          name: 'invalid',
          validator: (value) => value === PASSPHRASE,
        },
      ],
    },
    isCorrectProxy: {
      init: false,
      rules: [
        {
          name: 'invalid',
          validator: Boolean,
        },
      ],
    },
    isIrreversible: {
      init: false,
      rules: [
        {
          name: 'invalid',
          validator: Boolean,
        },
      ],
    },
    isInaccessible: {
      init: false,
      rules: [
        {
          name: 'invalid',
          validator: Boolean,
        },
      ],
    },
    lossOfFunds: {
      init: false,
      rules: [
        {
          name: 'invalid',
          validator: Boolean,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

sample({
  clock: formInitiated,
  target: $warningForm.reset,
});

sample({
  clock: formInitiated,
  filter: ({ isLastProxy }) => !isLastProxy,
  target: formSubmitted,
});

sample({
  clock: $warningForm.formValidated,
  target: formSubmitted,
});

export const warningModel = {
  $warningForm,
  $canSubmit: $warningForm.$isValid,

  events: {
    formInitiated,
  },

  output: {
    formSubmitted,
  },
};
